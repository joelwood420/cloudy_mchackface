import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models import User, UserSession

SESSION_COOKIE = "session"
SESSION_LIFETIME = timedelta(days=30)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def start_session(db: Session, user: User, now: datetime | None = None) -> str:
    """Create a session for `user` and return the raw token for the cookie. The caller commits."""
    now = now or datetime.now(UTC)
    db.execute(delete(UserSession).where(UserSession.user_id == user.id, UserSession.expires_at <= now))
    token = secrets.token_urlsafe(32)
    db.add(UserSession(token_hash=hash_token(token), user_id=user.id, expires_at=now + SESSION_LIFETIME))
    return token


def user_for_token(db: Session, token: str | None, now: datetime | None = None) -> User | None:
    if not token:
        return None
    session = db.get(UserSession, hash_token(token))
    if session is None or session.expires_at <= (now or datetime.now(UTC)):
        return None
    return session.user


def end_session(db: Session, token: str | None) -> None:
    """Delete the session for `token`, if any. The caller commits."""
    if token:
        db.execute(delete(UserSession).where(UserSession.token_hash == hash_token(token)))
