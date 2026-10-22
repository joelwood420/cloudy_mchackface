from sqlalchemy import select

from app.auth.ratelimit import email_limiter, ip_limiter
from app.config import get_settings
from app.disclaimer import DISCLAIMER_VERSION
from app.models import Intake, User
from tests.conftest import PASSWORD, signup_body


def signup(client, email="joel@example.com", password=PASSWORD):
    return client.post("/api/auth/signup", json=signup_body(email, password))


def login(client, email="joel@example.com", password=PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def test_signup_starts_a_session_with_a_safe_cookie(client):
    response = signup(client)
    assert response.status_code == 201
    assert response.json() == {"email": "joel@example.com", "study_mode": "FT", "intake": {"key": "2607-online-ccc-ft", "title": "Test intake", "study_mode": "FT"}, "intake_confirmed": True, "prefilled_through_week": None}
    cookie = response.headers["set-cookie"].lower()
    assert "session=" in cookie and "httponly" in cookie and "samesite=lax" in cookie
    assert "max-age=2592000" in cookie
    assert client.get("/api/me").json()["email"] == "joel@example.com"


def test_email_is_trimmed_and_lowercased(client):
    assert signup(client, email="  Joel@Example.COM ").json()["email"] == "joel@example.com"
    client.post("/api/auth/logout")
    assert login(client, email="JOEL@example.com").status_code == 200
    assert signup(client, email="joel@EXAMPLE.com").status_code == 409


def test_taken_email_gives_a_generic_409(client):
    signup(client)
    response = signup(client)
    assert response.status_code == 409
    assert "joel@example.com" not in response.json()["detail"]


def test_signup_rejects_bad_input(client):
    assert signup(client, password="7 chars").status_code == 422
    assert signup(client, password="8 chars!").status_code == 201
    client.post("/api/auth/logout")
    assert signup(client, email="new@example.com", password="x" * 257).status_code == 422
    assert signup(client, email="not-an-email").status_code == 422
    assert client.post("/api/auth/signup", json={"email": "a@b.co"}).status_code == 422
    assert client.post("/api/auth/signup", json={"email": "a@b.co", "password": PASSWORD}).status_code == 422


def test_signup_records_disclaimer_acceptance(client, db):
    signup(client)
    user = db.scalars(select(User).where(User.email == "joel@example.com")).one()
    assert user.disclaimer_version == DISCLAIMER_VERSION
    assert user.disclaimer_accepted_at is not None


def test_signup_refuses_a_stale_disclaimer_version(client):
    response = client.post("/api/auth/signup", json=signup_body("joel@example.com", accepted_disclaimer_version=DISCLAIMER_VERSION - 1))
    assert response.status_code == 422
    assert "disclaimer" in response.json()["detail"]


def test_wrong_password_and_unknown_email_look_the_same(client):
    signup(client)
    client.post("/api/auth/logout")
    wrong = login(client, password="wrong password")
    unknown = login(client, email="nobody@example.com")
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json() == {"detail": "Email or password is incorrect."}


def test_logout_ends_the_session(client):
    signup(client)
    old_cookie = client.cookies.get("session")
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/me").status_code == 401
    client.cookies.set("session", old_cookie)
    assert client.get("/api/me").status_code == 401


def test_logout_without_a_session_is_fine(client):
    assert client.post("/api/auth/logout").status_code == 204


def test_me_needs_a_session_and_ignores_garbage_cookies(client):
    assert client.get("/api/me").status_code == 401
    client.cookies.set("session", "garbage")
    response = client.get("/api/me")
    assert response.status_code == 401
    assert response.json() == {"detail": "Not logged in"}


def test_login_is_rate_limited_per_email(client):
    signup(client)
    client.post("/api/auth/logout")
    for _ in range(email_limiter.limit - 1):
        assert login(client, password="wrong password").status_code == 401
    response = login(client)
    assert response.status_code == 429
    assert response.json() == {"detail": "Too many attempts. Wait a few minutes and try again."}


def _fill_ip_limit(client, headers):
    for i in range(ip_limiter.limit):
        client.post("/api/auth/login", json={"email": f"x{i}@example.com", "password": "nope"}, headers=headers)


def test_ip_limit_uses_fly_client_ip_when_trusted(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "trust_fly_client_ip", True)
    _fill_ip_limit(client, {"Fly-Client-IP": "203.0.113.1"})
    blocked = client.post("/api/auth/login", json={"email": "a@example.com", "password": "nope"}, headers={"Fly-Client-IP": "203.0.113.1"})
    other = client.post("/api/auth/login", json={"email": "b@example.com", "password": "nope"}, headers={"Fly-Client-IP": "203.0.113.2"})
    assert blocked.status_code == 429
    assert other.status_code == 401


def test_fly_client_ip_is_ignored_unless_trusted(client):
    _fill_ip_limit(client, {"Fly-Client-IP": "203.0.113.1"})
    response = client.post("/api/auth/login", json={"email": "b@example.com", "password": "nope"}, headers={"Fly-Client-IP": "203.0.113.2"})
    assert response.status_code == 429


def test_signup_needs_an_intake(client, db):
    response = client.post("/api/auth/signup", json={k: v for k, v in signup_body("joel@example.com").items() if k != "intake_key"})
    assert response.status_code == 422
    assert db.scalars(select(User)).all() == []


def test_signup_refuses_an_unknown_intake(client, db):
    response = client.post("/api/auth/signup", json=signup_body("joel@example.com", intake_key="nope"))
    assert response.status_code == 422
    assert response.json() == {"detail": "Pick your intake from the list."}
    assert db.scalars(select(User)).all() == []


def test_signup_puts_the_student_on_the_chosen_intake(client, db):
    db.add(Intake(key="2607-online-ccc-pt", title="July PT", study_mode="PT"))
    db.flush()
    response = client.post("/api/auth/signup", json=signup_body("joel@example.com", intake_key="2607-online-ccc-pt"))
    assert response.status_code == 201
    assert (response.json()["study_mode"], response.json()["intake"]["key"]) == ("PT", "2607-online-ccc-pt")


def test_week_setting_is_gone(user_client):
    assert user_client.patch("/api/me/settings", json={"current_week": 9}).status_code == 405
