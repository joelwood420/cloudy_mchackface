from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url

BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    database_url: str
    test_database_url: str | None = None
    # Send the session cookie over HTTPS only. Off for local http://localhost; turn on when deployed.
    cookie_secure: bool = False
    # Behind Fly's proxy every request comes from the proxy's IP; the real one is in Fly-Client-IP.
    # Only turn on when deployed on Fly, since anyone can send that header straight to the app.
    trust_fly_client_ip: bool = False
    # Built frontend (frontend/dist) to serve alongside the API. Unset in dev, where Vite serves it.
    frontend_dist: Path | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()


def sqlalchemy_url(url: str) -> str:
    """Neon gives postgres:// or postgresql:// URLs; SQLAlchemy needs the psycopg 3 driver name."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


def same_database(a: str, b: str) -> bool:
    """True if two URLs point at the same host, port and database (ignores scheme, credentials, query)."""
    ua, ub = make_url(sqlalchemy_url(a)), make_url(sqlalchemy_url(b))
    return (ua.host, ua.port, ua.database) == (ub.host, ub.port, ub.database)
