from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import text

from app.config import BACKEND_DIR
from app.db import Base

SCHEMA = "migration_check"


def alembic_config(connection) -> Config:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    cfg.attributes["connection"] = connection
    return cfg


def test_migrations_build_the_model_schema_and_downgrade_cleanly(engine):
    """Run every migration in a throwaway schema inside one transaction, then roll it all back."""
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            conn.execute(text(f"CREATE SCHEMA {SCHEMA}"))
            conn.execute(text(f"SET LOCAL search_path TO {SCHEMA}"))

            command.upgrade(alembic_config(conn), "head")
            diff = compare_metadata(MigrationContext.configure(conn), Base.metadata)
            assert diff == [], f"models and migrations differ: {diff}"

            checks = conn.execute(
                text(
                    "select c.conname from pg_constraint c join pg_namespace n on n.oid = c.connamespace "
                    "where c.contype = 'c' and n.nspname = :s"
                ),
                {"s": SCHEMA},
            ).scalars().all()
            assert "intakes_study_mode_check" in checks, checks

            command.downgrade(alembic_config(conn), "base")
            tables = conn.execute(
                text("select table_name from information_schema.tables where table_schema = :s"), {"s": SCHEMA}
            ).scalars().all()
            assert tables == ["alembic_version"]
        finally:
            trans.rollback()


def test_0008_moves_existing_users_onto_the_default_intake(engine):
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            conn.execute(text(f"CREATE SCHEMA {SCHEMA}"))
            conn.execute(text(f"SET LOCAL search_path TO {SCHEMA}"))
            command.upgrade(alembic_config(conn), "0007")
            conn.execute(text("INSERT INTO users (id, email, password_hash) VALUES (1, 'old@example.com', 'x')"))
            conn.execute(text("INSERT INTO user_settings (user_id, current_week, study_mode) VALUES (1, 9, 'FT')"))
            command.upgrade(alembic_config(conn), "head")
            key = conn.execute(
                text("SELECT i.key FROM user_settings s JOIN intakes i ON i.id = s.intake_id WHERE s.user_id = 1")
            ).scalar_one()
            assert key == "2607-online-ccc-ft"
        finally:
            trans.rollback()


def test_foreign_keys_are_indexed():
    for table in Base.metadata.tables.values():
        indexed = {tuple(c.name for c in ix.columns) for ix in table.indexes}
        indexed.add(tuple(c.name for c in table.primary_key.columns))
        for fk in table.foreign_keys:
            col = fk.parent.name
            assert any(cols and cols[0] == col for cols in indexed), f"{table.name}.{col} has no index"


def test_constraint_names_match_postgres_defaults():
    names = {c.name for c in Base.metadata.tables["weeks"].constraints}
    assert {"weeks_pkey", "weeks_key_key", "weeks_module_id_fkey"} <= names
