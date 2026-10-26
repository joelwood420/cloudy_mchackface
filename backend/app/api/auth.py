from datetime import date, datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.schemas import ForgotPasswordIn, LoginIn, MeOut, ResetPasswordIn, SignupIn, SignupOut
from app.api.settings import find_intake, me_out
from app.auth.deps import current_user
from app.auth.password_reset import create_reset_token, redeem_reset_token
from app.auth.passwords import hash_password, verify_password
from app.auth.ratelimit import email_limiter, ip_limiter, reset_send_limiter
from app.auth.sessions import SESSION_COOKIE, SESSION_LIFETIME, end_session, start_session
from app.catchup import prefill_past_work
from app.clock import today
from app.config import get_settings
from app.db import get_db
from app.disclaimer import DISCLAIMER_VERSION
from app.mail import send_password_reset
from app.models import User, UserSettings

router = APIRouter(tags=["auth"])

EMAIL_TAKEN = "Couldn't create an account with that email. Try logging in instead."
BAD_LOGIN = "Email or password is incorrect."
STALE_DISCLAIMER = "The disclaimer has changed. Reload the page and accept it to continue."
RESET_SENT = "If there's an account for that email, we've sent a reset link."
RESET_EXPIRED = "This reset link has expired or has already been used. Ask for a new one."
TOO_MANY = "Too many attempts. Wait a few minutes and try again."


def _client_ip(request: Request) -> str:
    if get_settings().trust_fly_client_ip and (fly_ip := request.headers.get("fly-client-ip")):
        return fly_ip
    return request.client.host if request.client else "unknown"


def _limit(request: Request, email: str) -> None:
    ip = _client_ip(request)
    if not ip_limiter.hit(f"ip:{ip}") or not email_limiter.hit(f"email:{email}"):
        raise HTTPException(status_code=429, detail=TOO_MANY)


def _cookie_args() -> dict:
    return {"path": "/", "httponly": True, "samesite": "lax", "secure": get_settings().cookie_secure}


def _set_cookie(response: Response, token: str) -> None:
    response.set_cookie(SESSION_COOKIE, token, max_age=int(SESSION_LIFETIME.total_seconds()), **_cookie_args())


@router.post("/auth/signup", response_model=SignupOut, status_code=201)
def signup(
    body: SignupIn, request: Request, response: Response, db: Session = Depends(get_db), today_: date = Depends(today)
) -> SignupOut:
    _limit(request, body.email)
    if body.accepted_disclaimer_version != DISCLAIMER_VERSION:
        raise HTTPException(status_code=422, detail=STALE_DISCLAIMER)
    if db.scalar(select(User.id).where(User.email == body.email)) is not None:
        raise HTTPException(status_code=409, detail=EMAIL_TAKEN)
    intake = find_intake(db, body.intake_key)
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        disclaimer_version=DISCLAIMER_VERSION,
        disclaimer_accepted_at=datetime.now(timezone.utc),
        intake_confirmed_at=datetime.now(timezone.utc),
        settings=UserSettings(intake=intake),
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError:  # someone signed up with the same email a moment ago
        db.rollback()
        raise HTTPException(status_code=409, detail=EMAIL_TAKEN)
    prefilled = prefill_past_work(db, user, intake, today_)
    token = start_session(db, user)
    db.commit()
    _set_cookie(response, token)
    return SignupOut(**me_out(user).model_dump(), prefilled_through_week=prefilled)


@router.post("/auth/login", response_model=MeOut)
def login(body: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)) -> MeOut:
    _limit(request, body.email)
    user = db.scalars(select(User).where(User.email == body.email)).one_or_none()
    if not verify_password(user.password_hash if user else None, body.password):
        raise HTTPException(status_code=401, detail=BAD_LOGIN)
    token = start_session(db, user)
    db.commit()
    _set_cookie(response, token)
    return me_out(user)


@router.post("/auth/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> None:
    end_session(db, request.cookies.get(SESSION_COOKIE))
    db.commit()
    response.delete_cookie(SESSION_COOKIE, **_cookie_args())


@router.post("/auth/forgot-password", status_code=202)
def forgot_password(
    body: ForgotPasswordIn, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
) -> dict:
    # Same answer whether or not the account exists, and the email goes out after the response, so neither the
    # reply nor its timing says which emails have accounts. Over the send limit, quietly send nothing.
    _limit(request, body.email)
    user = db.scalars(select(User).where(User.email == body.email)).one_or_none()
    if user is not None and reset_send_limiter.hit(f"reset:{body.email}"):
        token = create_reset_token(db, user)
        db.commit()
        link = f"{get_settings().app_url.rstrip('/')}/reset-password#token={token}"
        background_tasks.add_task(send_password_reset, user.email, link)
    return {"detail": RESET_SENT}


@router.post("/auth/reset-password", status_code=204)
def reset_password(body: ResetPasswordIn, request: Request, db: Session = Depends(get_db)) -> None:
    if not ip_limiter.hit(f"ip:{_client_ip(request)}"):
        raise HTTPException(status_code=429, detail=TOO_MANY)
    if not redeem_reset_token(db, body.token, body.password):
        raise HTTPException(status_code=400, detail=RESET_EXPIRED)
    db.commit()


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(current_user)) -> MeOut:
    return me_out(user)
