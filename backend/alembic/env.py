from alembic import context
from sqlalchemy import create_engine, pool

import app.models  # noqa: F401
from app.config import get_settings, sqlalchemy_url
from app.db import Base

config = context.config
target_metadata = Base.metadata


def run(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


# Tests pass their own connection (on the test branch); the CLI uses DATABASE_URL.
connection = config.attributes.get("connection")
if connection is not None:
    run(connection)
else:
    engine = create_engine(sqlalchemy_url(get_settings().database_url), poolclass=pool.NullPool)
    with engine.connect() as conn:
        run(conn)
