"""Set a new password for an account, for when someone has forgotten theirs. There's no email reset yet.

On Fly:  fly ssh console --pty -C "sh -c 'cd /app/backend && /opt/venv/bin/python -m app.reset_password you@example.com'"
Locally: uv run python -m app.reset_password you@example.com

The new password is typed at a prompt (twice), never passed as an argument, so it stays out of shell history and
the process list. Every session for the account is ended, so anyone still logged in has to log in again.
"""

import argparse
import getpass
import sys
from collections.abc import Callable

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth.passwords import MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, hash_password
from app.models import User, UserSession


class ResetError(Exception):
    pass


def check_password(password: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ResetError(f"Use a password of at least {MIN_PASSWORD_LENGTH} characters.")
    if len(password) > MAX_PASSWORD_LENGTH:
        raise ResetError(f"Use a password of at most {MAX_PASSWORD_LENGTH} characters.")


def set_password(db: Session, email: str, password: str) -> None:
    """Replace the account's password and end its sessions. The caller commits."""
    check_password(password)
    # Sign-up stores emails trimmed and lower-cased, so match the same way.
    user = db.scalars(select(User).where(User.email == email.strip().lower())).one_or_none()
    if user is None:
        raise ResetError(f"No account with the email {email.strip()}.")
    user.password_hash = hash_password(password)
    db.execute(delete(UserSession).where(UserSession.user_id == user.id))


def ask_hidden(prompt: str) -> str:
    """Read a password without echoing it. Without a terminal (input piped in), read a line from stdin instead."""
    if sys.stdin.isatty():
        return getpass.getpass(prompt)
    return sys.stdin.readline().rstrip("\r\n")


def prompt_password(ask: Callable[[str], str] = ask_hidden) -> str:
    first = ask("New password: ")
    check_password(first)
    if ask("Same again: ") != first:
        raise ResetError("The passwords didn't match. Nothing was changed.")
    return first


def main(argv: list[str] | None = None, ask: Callable[[str], str] = ask_hidden) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.reset_password", description="Set a new password for an account.")
    parser.add_argument("email")
    args = parser.parse_args(argv)

    from app.db import SessionLocal

    try:
        password = prompt_password(ask)
        with SessionLocal.begin() as session:
            set_password(session, args.email, password)
    except ResetError as e:
        print(e, file=sys.stderr)
        return 1
    print(f"Password changed for {args.email.strip().lower()}. Any open sessions were logged out.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
