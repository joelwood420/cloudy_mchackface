import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.auth.passwords import hash_password
from app.auth.sessions import hash_token
from app.models import PasswordResetToken, User, UserSession

RESET_LIFETIME = timedelta(hours=1)


def create_reset_token(db: Session, user: User, now: datetime | None = None) -> str:
    """Make a reset token for `user` and return the raw value for the link. The caller commits.

    Only the newest link works: the user's older tokens go, and so do everyone's expired ones.
    """
    now = now or datetime.now(UTC)
    db.execute(
        delete(PasswordResetToken).where(
            (PasswordResetToken.user_id == user.id) | (PasswordResetToken.expires_at <= now)
        )
    )
    token = secrets.token_urlsafe(32)
    db.add(PasswordResetToken(token_hash=hash_token(token), user_id=user.id, expires_at=now + RESET_LIFETIME))
    return token


def redeem_reset_token(db: Session, token: str, password: str, now: datetime | None = None) -> bool:
    """Set a new password if `token` is live. Ends every session and reset token for the account. The caller commits."""
    row = db.get(PasswordResetToken, hash_token(token))
    if row is None or row.expires_at <= (now or datetime.now(UTC)):
        return False
    user_id = row.user_id
    row.user.password_hash = hash_password(password)
    db.execute(delete(UserSession).where(UserSession.user_id == user_id))
    db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user_id))
    return True
