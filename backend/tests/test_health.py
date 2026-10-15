from sqlalchemy import text


def test_health_returns_ok(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_test_database_is_reachable(db):
    assert db.execute(text("select 1")).scalar() == 1


def test_sqlalchemy_url_adds_psycopg_driver():
    from app.config import sqlalchemy_url

    assert sqlalchemy_url("postgresql://u:p@h/d?sslmode=require") == "postgresql+psycopg://u:p@h/d?sslmode=require"
    assert sqlalchemy_url("postgres://u:p@h/d") == "postgresql+psycopg://u:p@h/d"
