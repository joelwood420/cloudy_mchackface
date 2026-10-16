from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.auth.sessions import SESSION_COOKIE, user_for_token
from app.db import get_db
from app.models import User


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    user = user_for_token(db, request.cookies.get(SESSION_COOKIE))
    if user is None:
        raise HTTPException(status_code=401, detail="Not logged in")
    return user
