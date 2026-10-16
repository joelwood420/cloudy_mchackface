from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

import app.models  # noqa: F401  (registers tables on Base.metadata)
from app.clock import today
from app.auth.ratelimit import email_limiter, ip_limiter
from app.config import get_settings, same_database, sqlalchemy_url
from app.db import Base, get_db
from app.disclaimer import DISCLAIMER_VERSION
from app.main import app
from app.models import Intake, IntakeHoliday, IntakeWeek


def _run(first: int, start: date, count: int) -> list[tuple[int, date]]:
    return [(first + i, start + timedelta(weeks=i)) for i in range(count)]


# The 2607 FT intake's week start dates (docs/portal-extras.md). Breaks: 14–27 Sep 2026, 21 Dec–10 Jan, 8–28 Feb 2027.
FT_WEEKS = (
    _run(1, date(2026, 7, 20), 8)
    + _run(9, date(2026, 9, 28), 12)
    + _run(21, date(2027, 1, 11), 4)
    + _run(25, date(2027, 3, 1), 8)
)


@pytest.fixture(scope="session")
def engine():
    settings = get_settings()
    url = settings.test_database_url
    if not url:
        pytest.exit("TEST_DATABASE_URL is not set in backend/.env", returncode=1)
    if same_database(url, settings.database_url):
        pytest.exit("TEST_DATABASE_URL must differ from DATABASE_URL (tests wipe it)", returncode=1)
    eng = create_engine(sqlalchemy_url(url))
    Base.metadata.drop_all(eng)
    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture
def db(engine):
    connection = engine.connect()
    outer = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint", expire_on_commit=False)
    yield session
    session.close()
    outer.rollback()
    connection.close()


@pytest.fixture
def intake(db):
    """The intake sign-up puts new users on. No weeks unless a test adds them with add_schedule."""
    row = Intake(key=get_settings().default_intake_key, title="Test intake", study_mode="FT")
    db.add(row)
    db.flush()
    return row


def add_schedule(db, intake, weeks=FT_WEEKS, holidays=()):
    intake.weeks = [IntakeWeek(week_number=n, starts_on=d) for n, d in weeks]
    intake.holidays = [IntakeHoliday(day=d, name=name) for d, name in holidays]
    db.flush()


@pytest.fixture
def client(db, intake):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def today_is(client):
    """Pin "today" for every request: today_is(date(2026, 10, 14))."""

    def set_today(d):
        app.dependency_overrides[today] = lambda: d

    return set_today


PASSWORD = "correct horse"


def signup_body(email: str, password: str = PASSWORD, **extra) -> dict:
    return {"email": email, "password": password, "accepted_disclaimer_version": DISCLAIMER_VERSION, **extra}


@pytest.fixture(autouse=True)
def reset_rate_limits():
    ip_limiter.reset()
    email_limiter.reset()


@pytest.fixture
def user_client(client):
    response = client.post("/api/auth/signup", json=signup_body("joel@example.com"))
    assert response.status_code == 201
    return client
