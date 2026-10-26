from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update

from app.config import get_settings
from app.models import PasswordResetToken
from tests.conftest import PASSWORD

EXPIRED = "This reset link has expired or has already been used. Ask for a new one."
NEW_PASSWORD = "brand new pw"


def forgot(client, email="joel@example.com"):
    return client.post("/api/auth/forgot-password", json={"email": email})


def reset(client, token, password=NEW_PASSWORD):
    return client.post("/api/auth/reset-password", json={"token": token, "password": password})


def login(client, password):
    return client.post("/api/auth/login", json={"email": "joel@example.com", "password": password})


def token_from(link: str) -> str:
    return link.split("#token=", 1)[1]


def test_forgot_sends_a_link_built_from_app_url(user_client, sent_emails):
    response = forgot(user_client, "  JOEL@example.com ")
    assert response.status_code == 202
    [(to, link)] = sent_emails
    assert to == "joel@example.com"
    assert link.startswith(get_settings().app_url + "/reset-password#token=")
    assert len(token_from(link)) >= 40


def test_forgot_ignores_the_host_header(user_client, sent_emails):
    user_client.post("/api/auth/forgot-password", json={"email": "joel@example.com"}, headers={"host": "evil.example"})
    [(_, link)] = sent_emails
    assert "evil.example" not in link


def test_unknown_email_gets_the_same_answer_and_no_email(user_client, sent_emails):
    known, unknown = forgot(user_client), forgot(user_client, "nobody@example.com")
    assert unknown.status_code == known.status_code == 202
    assert unknown.json() == known.json()
    assert len(sent_emails) == 1


def test_reset_changes_password_and_ends_every_session(user_client, sent_emails):
    forgot(user_client)
    response = reset(user_client, token_from(sent_emails[0][1]))
    assert response.status_code == 204
    assert user_client.get("/api/me").status_code == 401
    assert login(user_client, PASSWORD).status_code == 401
    assert login(user_client, NEW_PASSWORD).status_code == 200


def test_link_works_once(user_client, sent_emails, db):
    forgot(user_client)
    token = token_from(sent_emails[0][1])
    assert reset(user_client, token).status_code == 204
    second = reset(user_client, token, "another pw 1")
    assert second.status_code == 400 and second.json()["detail"] == EXPIRED
    assert db.scalars(select(PasswordResetToken)).all() == []


def test_newer_link_replaces_older(user_client, sent_emails):
    forgot(user_client)
    forgot(user_client)
    older, newer = (token_from(link) for _, link in sent_emails)
    assert reset(user_client, older).json()["detail"] == EXPIRED
    assert reset(user_client, newer).status_code == 204


def test_expired_link_is_refused(user_client, sent_emails, db):
    forgot(user_client)
    db.execute(update(PasswordResetToken).values(expires_at=datetime.now(UTC) - timedelta(seconds=1)))
    response = reset(user_client, token_from(sent_emails[0][1]))
    assert response.status_code == 400 and response.json()["detail"] == EXPIRED
    assert login(user_client, PASSWORD).status_code == 200


def test_link_lasts_an_hour(user_client, db):
    forgot(user_client)
    row = db.scalars(select(PasswordResetToken)).one()
    assert timedelta(minutes=59) < row.expires_at - datetime.now(UTC) <= timedelta(hours=1)


def test_bad_token_is_refused(client):
    response = reset(client, "not-a-real-token")
    assert response.status_code == 400 and response.json()["detail"] == EXPIRED
    assert reset(client, "").status_code == 422


def test_reset_enforces_password_length(user_client, sent_emails):
    forgot(user_client)
    token = token_from(sent_emails[0][1])
    assert reset(user_client, token, "7 chars").status_code == 422
    assert reset(user_client, token, "x" * 257).status_code == 422
    assert reset(user_client, token, "8 chars!").status_code == 204


def test_fourth_request_in_an_hour_sends_nothing(user_client, sent_emails):
    responses = [forgot(user_client) for _ in range(4)]
    assert [r.status_code for r in responses] == [202] * 4
    assert len(sent_emails) == 3
