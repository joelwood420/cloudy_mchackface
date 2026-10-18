import pytest
from sqlalchemy import select

from app.models import User, UserSession
from app.reset_password import ResetError, prompt_password, set_password
from tests.conftest import PASSWORD, signup_body


def answers(*replies):
    it = iter(replies)
    return lambda _prompt: next(it)


def login(client, password):
    return client.post("/api/auth/login", json={"email": "joel@example.com", "password": password})


def test_new_password_works_and_old_one_and_sessions_stop(user_client, db):
    assert user_client.get("/api/me").status_code == 200
    set_password(db, "  Joel@Example.com ", "new pass 8")
    db.flush()

    user = db.scalars(select(User).where(User.email == "joel@example.com")).one()
    assert db.scalars(select(UserSession).where(UserSession.user_id == user.id)).all() == []
    assert user_client.get("/api/me").status_code == 401
    assert login(user_client, PASSWORD).status_code == 401
    assert login(user_client, "new pass 8").status_code == 200


def test_unknown_email_is_refused(client, db):
    client.post("/api/auth/signup", json=signup_body("joel@example.com"))
    with pytest.raises(ResetError, match="No account"):
        set_password(db, "nobody@example.com", "new pass 8")


@pytest.mark.parametrize("password", ["7 chars", "x" * 257])
def test_password_length_is_checked(client, db, password):
    client.post("/api/auth/signup", json=signup_body("joel@example.com"))
    with pytest.raises(ResetError, match="Use a password"):
        set_password(db, "joel@example.com", password)


def test_prompt_asks_twice_and_needs_a_match():
    assert prompt_password(answers("new pass 8", "new pass 8")) == "new pass 8"
    with pytest.raises(ResetError, match="didn't match"):
        prompt_password(answers("new pass 8", "new pass 9"))
    with pytest.raises(ResetError, match="at least 8"):
        prompt_password(answers("short"))
