from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 256

_hasher = PasswordHasher()
# Verified against when the email is unknown, so a miss takes as long as a wrong password.
_DUMMY_HASH = _hasher.hash("dummy password for timing")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str | None, password: str) -> bool:
    try:
        ok = _hasher.verify(password_hash or _DUMMY_HASH, password)
    except (VerificationError, InvalidHashError):
        return False
    return ok and password_hash is not None
