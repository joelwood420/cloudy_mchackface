from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app.auth.passwords import hash_password, verify_password
from app.auth.ratelimit import RateLimiter
from app.auth.sessions import SESSION_LIFETIME, end_session, hash_token, start_session, user_for_token
from app.models import User, UserSession, UserSettings


def make_user(db):
    user = User(email="joel@example.com", password_hash=hash_password("correct horse"), settings=UserSettings())
    db.add(user)
    db.flush()
    return user


def test_password_round_trip():
    stored = hash_password("correct horse")
    assert stored.startswith("$argon2")
    assert verify_password(stored, "correct horse")
    assert not verify_password(stored, "wrong horse!")


def test_verify_without_a_hash_is_false():
    assert verify_password(None, "anything at all") is False


def test_verify_with_a_corrupt_hash_is_false():
    assert verify_password("not-a-hash", "anything at all") is False


def test_session_token_is_stored_only_as_a_hash(db):
    user = make_user(db)
    token = start_session(db, user)
    db.flush()
    stored = db.scalars(select(UserSession.token_hash)).one()
    assert stored == hash_token(token)
    assert token not in stored
    assert len(token) >= 40


def test_user_for_token_finds_the_user(db):
    user = make_user(db)
    token = start_session(db, user)
    db.flush()
    assert user_for_token(db, token).id == user.id


def test_garbage_missing_and_expired_tokens_find_nobody(db):
    user = make_user(db)
    now = datetime.now(UTC)
    token = start_session(db, user, now=now - SESSION_LIFETIME - timedelta(seconds=1))
    db.flush()
    assert user_for_token(db, token) is None
    assert user_for_token(db, "garbage") is None
    assert user_for_token(db, "") is None
    assert user_for_token(db, None) is None


def test_starting_a_session_prunes_that_users_expired_sessions(db):
    user = make_user(db)
    now = datetime.now(UTC)
    start_session(db, user, now=now - SESSION_LIFETIME - timedelta(days=1))
    db.flush()
    start_session(db, user, now=now)
    db.flush()
    assert db.scalar(select(func.count()).select_from(UserSession)) == 1


def test_end_session_removes_it(db):
    user = make_user(db)
    token = start_session(db, user)
    db.flush()
    end_session(db, token)
    db.flush()
    assert user_for_token(db, token) is None
    end_session(db, None)  # no cookie: nothing to do, no error


def test_rate_limiter_allows_up_to_the_limit_then_blocks():
    now = [0.0]
    limiter = RateLimiter(limit=3, window=60, clock=lambda: now[0])
    assert [limiter.hit("k") for _ in range(4)] == [True, True, True, False]
    assert limiter.hit("other") is True


def test_rate_limiter_forgets_old_hits():
    now = [0.0]
    limiter = RateLimiter(limit=2, window=60, clock=lambda: now[0])
    limiter.hit("k")
    limiter.hit("k")
    assert limiter.hit("k") is False
    now[0] = 60.0
    assert limiter.hit("k") is True


def test_rate_limiter_reset_clears_everything():
    limiter = RateLimiter(limit=1, window=60)
    limiter.hit("k")
    limiter.reset()
    assert limiter.hit("k") is True
