import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

import app.models  # noqa: F401  (registers tables on Base.metadata)
from app.auth.ratelimit import email_limiter, ip_limiter
from app.config import get_settings, same_database, sqlalchemy_url
from app.db import Base, get_db
from app.disclaimer import DISCLAIMER_VERSION
from app.main import app


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
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


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
