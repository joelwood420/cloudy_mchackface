# Phase 1: Skeleton + CCC602 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A locally running app where anyone can browse the CCC602 module's weeks, tasks and assessments, loaded from a YAML seed file into Neon.

**Architecture:** FastAPI backend (`backend/`) with SQLAlchemy models, Alembic migrations and a seed loader CLI that validates `seed/*.yaml` then upserts by stable key. React + Vite frontend (`frontend/`) reads `/api/modules` and `/api/modules/{key}` through the Vite dev proxy. No accounts in this phase.

**Tech Stack:** Python 3.12, uv, FastAPI, SQLAlchemy 2, psycopg 3, Alembic, Pydantic 2, PyYAML, pytest; Node 24, React, Vite, TypeScript, TanStack Query, React Router, Vitest, React Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-15-yoobee-study-guide-design.md`

## Global Constraints

- Local only. No Fly.io config in this phase.
- Secrets live only in `backend/.env` (git-ignored). The owner writes this file; never print or commit connection strings.
- Tests run against `TEST_DATABASE_URL` (separate Neon branch). Test setup must refuse to run if it equals `DATABASE_URL`.
- Seed content: titles, week numbers, due dates and links only. No Yoobee-owned text or files, no lab training keys (see CLAUDE.md "Portal data rules").
- Task `type` is one of `learning_path`, `lab`, `assessment_step`.
- Seed keys match `^[a-z0-9]+(-[a-z0-9]+)*$` and are unique across all seed files.
- Every seed task has at least one of `external_url` or `uplearn_url`.
- Read all files as UTF-8 explicitly (Windows defaults to cp1252).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Commands below assume Git Bash. Backend commands run from `backend/`, frontend commands from `frontend/`.

## Review Focus

1. Seed YAML containing non-ASCII text (en dash, macrons) on Windows must load correctly, not crash or garble. Pinned in Task 3.
2. Re-seeding after a task moves to a different week (same key) must update the existing row (same id), not create a duplicate. Pinned in Task 4.
3. The same key in two seed files must fail validation naming both files, and write nothing. Pinned in Tasks 3 and 4.
4. An unknown module key must return a 404 from the API and show "Module not found" in the UI, not a blank page. Pinned in Tasks 6 and 8.
5. An API failure (backend down, 500) must show an error with a working "Try again" button. Pinned in Task 7.

## File Structure

```
backend/
  pyproject.toml            deps, pytest config
  .env.example              placeholder env vars
  alembic.ini
  alembic/env.py            wires Alembic to app settings + metadata
  alembic/script.py.mako
  alembic/versions/0001_content_tables.py
  app/__init__.py
  app/config.py             Settings, sqlalchemy_url()
  app/db.py                 engine, SessionLocal, Base, get_db
  app/models.py             Module, Week, Task, Assessment
  app/main.py               FastAPI app, /api/health, router wiring
  app/api/__init__.py
  app/api/schemas.py        response models
  app/api/modules.py        /api/modules routes
  app/seed/__init__.py
  app/seed/schema.py        Pydantic seed file models
  app/seed/loader.py        load_seed_dir(), apply_seed(), SeedError
  app/seed/__main__.py      CLI: run(), main()
  tests/conftest.py         test engine, db session, client fixtures
  tests/test_health.py
  tests/test_models.py
  tests/test_seed_validation.py
  tests/test_seed_apply.py
  tests/test_seed_files.py
  tests/test_modules_api.py
seed/
  ccc602.yaml
frontend/                   Vite react-ts template, plus:
  vite.config.ts            /api proxy, vitest config
  src/api.ts                types + fetch helpers
  src/App.tsx               providers + routes
  src/components/ErrorMessage.tsx
  src/pages/ModulesPage.tsx
  src/pages/ModulePage.tsx
  src/test/setup.ts
  src/test/utils.tsx        renderAt(), jsonResponse()
  src/pages/ModulesPage.test.tsx
  src/pages/ModulePage.test.tsx
```

---

### Task 1: Backend skeleton, config and test database

**Files:**
- Create: `backend/pyproject.toml`, `backend/.env.example`, `backend/app/__init__.py`, `backend/app/config.py`, `backend/app/db.py`, `backend/app/main.py`, `backend/tests/conftest.py`, `backend/tests/test_health.py`

**Interfaces:**
- Produces: `app.config.get_settings() -> Settings` (fields `database_url: str`, `test_database_url: str | None`); `app.config.sqlalchemy_url(url: str) -> str`; `app.db.Base`, `app.db.engine`, `app.db.SessionLocal`, `app.db.get_db()`; `app.main.app`; pytest fixtures `engine`, `db` (a `Session` rolled back after each test), `client` (`TestClient` using `db`).

- [ ] **Step 1: Owner creates the Neon test branch and `.env`**

Ask the owner to: (1) in the Neon console, create a branch named `test` from their project; (2) create `backend/.env` from the template below with their real dev and test connection strings. Do not ask them to paste the strings into chat.

`backend/.env.example`:

```
# Neon dev branch connection string
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
# Neon test branch connection string (must differ from DATABASE_URL; tests wipe it)
TEST_DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
```

- [ ] **Step 2: Create `backend/pyproject.toml` and install**

```toml
[project]
name = "studyguide-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.30",
    "sqlalchemy>=2.0.30",
    "psycopg[binary]>=3.2",
    "alembic>=1.13",
    "pydantic>=2.7",
    "pydantic-settings>=2.3",
    "pyyaml>=6.0",
]

[dependency-groups]
dev = ["pytest>=8", "httpx>=0.27"]

[tool.uv]
package = false

[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]
```

Run: `cd backend && uv sync`
Expected: creates `.venv` and `uv.lock` with no errors.

- [ ] **Step 3: Write `app/config.py` and `app/db.py`**

`backend/app/__init__.py`: empty file.

`backend/app/config.py`:

```python
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    database_url: str
    test_database_url: str | None = None


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
```

`backend/app/db.py`:

```python
from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings, sqlalchemy_url

engine = create_engine(sqlalchemy_url(get_settings().database_url), pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session
```

- [ ] **Step 4: Write the failing tests**

`backend/tests/conftest.py`:

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

import app.models  # noqa: F401  (registers tables on Base.metadata)
from app.config import get_settings, sqlalchemy_url
from app.db import Base, get_db
from app.main import app


@pytest.fixture(scope="session")
def engine():
    settings = get_settings()
    url = settings.test_database_url
    if not url:
        pytest.exit("TEST_DATABASE_URL is not set in backend/.env", returncode=1)
    if url == settings.database_url:
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
```

`backend/app/models.py` (placeholder so the import works; filled in Task 2):

```python
from app.db import Base  # noqa: F401
```

`backend/tests/test_health.py`:

```python
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
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `uv run pytest -v`
Expected: collection error, `ModuleNotFoundError: No module named 'app.main'`.

- [ ] **Step 6: Write `app/main.py`**

```python
from fastapi import APIRouter, FastAPI

app = FastAPI(title="Yoobee Study Guide")

api = APIRouter(prefix="/api")


@api.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api)
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `uv run pytest -v`
Expected: 3 passed.

- [ ] **Step 8: Commit**

```bash
git add backend/pyproject.toml backend/uv.lock backend/.env.example backend/app backend/tests
git commit -m "feat(backend): FastAPI skeleton with Neon config and test DB fixtures"
```

---

### Task 2: Content models and first migration

**Files:**
- Modify: `backend/app/models.py`
- Create: `backend/alembic.ini`, `backend/alembic/env.py`, `backend/alembic/script.py.mako`, `backend/alembic/versions/0001_content_tables.py`, `backend/tests/test_models.py`

**Interfaces:**
- Consumes: `app.db.Base`.
- Produces: models `Module(id, key, code, title, position, weeks, assessments)`, `Week(id, key, module_id, week_number, title, position, module, tasks)`, `Task(id, key, week_id, title, type, external_url, uplearn_url, position, week)`, `Assessment(id, key, module_id, title, due_date, uplearn_url, module)`. `Module.weeks` ordered by `Week.position`; `Week.tasks` ordered by `Task.position`. Deleting a module deletes its weeks, tasks and assessments.

- [ ] **Step 1: Write the failing test**

`backend/tests/test_models.py`:

```python
from datetime import date

from sqlalchemy import func, select

from app.models import Assessment, Module, Task, Week


def make_module(db):
    module = Module(key="ccc602", code="CCC602", title="Data Engineering", position=2)
    week = Week(key="ccc602-w09", week_number=9, title="DP-900", position=0)
    week.tasks = [
        Task(key="t2", title="Second", type="lab", external_url="https://x.test/2", position=1),
        Task(key="t1", title="First", type="learning_path", external_url="https://x.test/1", position=0),
    ]
    module.weeks = [week]
    module.assessments = [Assessment(key="a3", title="Assessment 3", due_date=date(2026, 10, 25))]
    db.add(module)
    db.flush()
    db.expire_all()
    return db.scalars(select(Module).where(Module.key == "ccc602")).one()


def test_tasks_load_in_position_order(db):
    module = make_module(db)
    assert [t.key for t in module.weeks[0].tasks] == ["t1", "t2"]


def test_deleting_module_cascades(db):
    module = make_module(db)
    db.delete(module)
    db.flush()
    assert db.scalar(select(func.count()).select_from(Week)) == 0
    assert db.scalar(select(func.count()).select_from(Task)) == 0
    assert db.scalar(select(func.count()).select_from(Assessment)) == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_models.py -v`
Expected: FAIL, `ImportError: cannot import name 'Assessment' from 'app.models'`.

- [ ] **Step 3: Write the models**

`backend/app/models.py`:

```python
from datetime import date

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Module(Base):
    __tablename__ = "modules"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(100), unique=True)
    code: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(200))
    position: Mapped[int]

    weeks: Mapped[list["Week"]] = relationship(
        back_populates="module", cascade="all, delete-orphan", order_by="Week.position"
    )
    assessments: Mapped[list["Assessment"]] = relationship(
        back_populates="module", cascade="all, delete-orphan"
    )


class Week(Base):
    __tablename__ = "weeks"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(100), unique=True)
    module_id: Mapped[int] = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"))
    week_number: Mapped[int]
    title: Mapped[str] = mapped_column(String(200))
    position: Mapped[int]

    module: Mapped[Module] = relationship(back_populates="weeks")
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="week", cascade="all, delete-orphan", order_by="Task.position"
    )


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(100), unique=True)
    week_id: Mapped[int] = mapped_column(ForeignKey("weeks.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(300))
    type: Mapped[str] = mapped_column(String(20))
    external_url: Mapped[str | None] = mapped_column(String(1000))
    uplearn_url: Mapped[str | None] = mapped_column(String(1000))
    position: Mapped[int]

    week: Mapped[Week] = relationship(back_populates="tasks")


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(100), unique=True)
    module_id: Mapped[int] = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(300))
    due_date: Mapped[date | None] = mapped_column(Date)
    uplearn_url: Mapped[str | None] = mapped_column(String(1000))

    module: Mapped[Module] = relationship(back_populates="assessments")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest -v`
Expected: all pass (test DB tables are recreated from metadata each session).

- [ ] **Step 5: Add Alembic**

`backend/alembic.ini`:

```ini
[alembic]
script_location = alembic
```

`backend/alembic/env.py`:

```python
from alembic import context
from sqlalchemy import engine_from_config, pool

import app.models  # noqa: F401
from app.config import get_settings, sqlalchemy_url
from app.db import Base

config = context.config
config.set_main_option("sqlalchemy.url", sqlalchemy_url(get_settings().database_url).replace("%", "%%"))
target_metadata = Base.metadata

connectable = engine_from_config(
    config.get_section(config.config_ini_section, {}), prefix="sqlalchemy.", poolclass=pool.NullPool
)
with connectable.connect() as connection:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()
```

`backend/alembic/script.py.mako`:

```mako
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
"""
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

`backend/alembic/versions/0001_content_tables.py`:

```python
"""content tables

Revision ID: 0001
Revises:
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "modules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(100), nullable=False, unique=True),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
    )
    op.create_table(
        "weeks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(100), nullable=False, unique=True),
        sa.Column("module_id", sa.Integer(), sa.ForeignKey("modules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("week_number", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
    )
    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(100), nullable=False, unique=True),
        sa.Column("week_id", sa.Integer(), sa.ForeignKey("weeks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("external_url", sa.String(1000), nullable=True),
        sa.Column("uplearn_url", sa.String(1000), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
    )
    op.create_table(
        "assessments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(100), nullable=False, unique=True),
        sa.Column("module_id", sa.Integer(), sa.ForeignKey("modules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("uplearn_url", sa.String(1000), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("assessments")
    op.drop_table("tasks")
    op.drop_table("weeks")
    op.drop_table("modules")
```

- [ ] **Step 6: Apply to the dev branch and check it matches the models**

Run: `uv run alembic upgrade head`
Expected: `Running upgrade  -> 0001, content tables`

Run: `uv run alembic check`
Expected: `No new upgrade operations detected.` If it reports differences, fix the migration to match the models, `uv run alembic downgrade base`, and repeat.

- [ ] **Step 7: Commit**

```bash
git add backend/app/models.py backend/alembic.ini backend/alembic backend/tests/test_models.py
git commit -m "feat(backend): content models and initial migration"
```

---

### Task 3: Seed file schema and validation

**Files:**
- Create: `backend/app/seed/__init__.py`, `backend/app/seed/schema.py`, `backend/app/seed/loader.py`, `backend/tests/test_seed_validation.py`

**Interfaces:**
- Produces: `app.seed.schema.SeedFile` (fields `module: SeedModule`, `weeks: list[SeedWeek]`, `assessments: list[SeedAssessment]`); `SeedModule(key, code, title, order)`; `SeedWeek(key, week_number, title, tasks: list[SeedTask])`; `SeedTask(key, title, type, external_url: HttpUrl | None, uplearn_url: HttpUrl | None)`; `SeedAssessment(key, title, due_date: date | None, uplearn_url: HttpUrl | None)`. `app.seed.loader.SeedError(problems: list[str])` with `.problems`; `app.seed.loader.load_seed_dir(path: Path) -> list[SeedFile]` (raises `SeedError`).

- [ ] **Step 1: Write the failing tests**

`backend/tests/test_seed_validation.py`:

```python
from pathlib import Path

import pytest

from app.seed.loader import SeedError, load_seed_dir

VALID = """\
module:
  key: ccc602
  code: CCC602
  title: Data Engineering in the Public Cloud
  order: 2
weeks:
  - key: ccc602-w09
    week_number: 9
    title: "DP-900 Learning Paths 1–4 · Ngā pūkenga"
    tasks:
      - key: ccc602-w09-lp1
        title: Explore core data concepts
        type: learning_path
        external_url: https://learn.microsoft.com/en-us/training/paths/azure-data-fundamentals-explore-core-data-concepts/
  - key: ccc602-w10
    week_number: 10
    title: Empty week
assessments:
  - key: ccc602-a3
    title: "Assessment 3: Azure Practical Scenario Evaluation"
    due_date: 2026-10-25
    uplearn_url: https://yoobee.uplearn.education/course/section.php?id=9649
"""


def write(dir: Path, name: str, text: str) -> None:
    (dir / name).write_bytes(text.encode("utf-8"))


def test_valid_file_loads_with_utf8_text(tmp_path):
    write(tmp_path, "ccc602.yaml", VALID)
    [seed] = load_seed_dir(tmp_path)
    assert seed.module.key == "ccc602"
    assert seed.weeks[0].title == "DP-900 Learning Paths 1–4 · Ngā pūkenga"
    assert seed.weeks[1].tasks == []
    assert str(seed.assessments[0].due_date) == "2026-10-25"


def test_empty_directory_is_an_error(tmp_path):
    with pytest.raises(SeedError) as exc:
        load_seed_dir(tmp_path)
    assert "no .yaml files" in exc.value.problems[0]


def test_duplicate_key_across_files_names_both_files(tmp_path):
    write(tmp_path, "a.yaml", VALID)
    write(tmp_path, "b.yaml", VALID.replace("key: ccc602\n", "key: other\n"))
    with pytest.raises(SeedError) as exc:
        load_seed_dir(tmp_path)
    joined = "\n".join(exc.value.problems)
    assert "duplicate key 'ccc602-w09'" in joined
    assert "a.yaml" in joined and "b.yaml" in joined


def test_bad_task_type_is_reported_with_file_and_location(tmp_path):
    write(tmp_path, "ccc602.yaml", VALID.replace("type: learning_path", "type: video"))
    with pytest.raises(SeedError) as exc:
        load_seed_dir(tmp_path)
    assert any(p.startswith("ccc602.yaml: weeks.0.tasks.0.type") for p in exc.value.problems)


def test_task_without_any_url_is_rejected(tmp_path):
    text = VALID.replace(
        "        external_url: https://learn.microsoft.com/en-us/training/paths/azure-data-fundamentals-explore-core-data-concepts/\n",
        "",
    )
    write(tmp_path, "ccc602.yaml", text)
    with pytest.raises(SeedError) as exc:
        load_seed_dir(tmp_path)
    assert any("external_url or uplearn_url" in p for p in exc.value.problems)


def test_bad_url_and_bad_key_are_rejected(tmp_path):
    text = VALID.replace("https://learn.microsoft.com", "not-a-url").replace("key: ccc602-w10", "key: CCC602 W10")
    write(tmp_path, "ccc602.yaml", text)
    with pytest.raises(SeedError) as exc:
        load_seed_dir(tmp_path)
    joined = "\n".join(exc.value.problems)
    assert "external_url" in joined
    assert "weeks.1.key" in joined


def test_invalid_yaml_is_reported(tmp_path):
    write(tmp_path, "broken.yaml", "module: [unclosed")
    with pytest.raises(SeedError) as exc:
        load_seed_dir(tmp_path)
    assert exc.value.problems[0].startswith("broken.yaml: invalid YAML")


def test_unknown_field_is_rejected(tmp_path):
    write(tmp_path, "ccc602.yaml", VALID.replace("  order: 2\n", "  order: 2\n  colour: red\n"))
    with pytest.raises(SeedError) as exc:
        load_seed_dir(tmp_path)
    assert any("module.colour" in p for p in exc.value.problems)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_seed_validation.py -v`
Expected: FAIL, `ModuleNotFoundError: No module named 'app.seed'`.

- [ ] **Step 3: Write the schema and loader**

`backend/app/seed/__init__.py`: empty file.

`backend/app/seed/schema.py`:

```python
from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, StringConstraints, model_validator

Key = Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=100)]
Title = Annotated[str, StringConstraints(min_length=1, max_length=300, strip_whitespace=True)]
TaskType = Literal["learning_path", "lab", "assessment_step"]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SeedTask(_Strict):
    key: Key
    title: Title
    type: TaskType
    external_url: HttpUrl | None = None
    uplearn_url: HttpUrl | None = None

    @model_validator(mode="after")
    def needs_a_link(self) -> "SeedTask":
        if self.external_url is None and self.uplearn_url is None:
            raise ValueError("task needs external_url or uplearn_url")
        return self


class SeedWeek(_Strict):
    key: Key
    week_number: int = Field(ge=1)
    title: Title
    tasks: list[SeedTask] = []


class SeedModule(_Strict):
    key: Key
    code: Annotated[str, StringConstraints(min_length=1, max_length=20)]
    title: Title
    order: int


class SeedAssessment(_Strict):
    key: Key
    title: Title
    due_date: date | None = None
    uplearn_url: HttpUrl | None = None


class SeedFile(_Strict):
    module: SeedModule
    weeks: list[SeedWeek] = []
    assessments: list[SeedAssessment] = []

    def keys(self) -> list[str]:
        out = [self.module.key]
        for week in self.weeks:
            out.append(week.key)
            out.extend(task.key for task in week.tasks)
        out.extend(a.key for a in self.assessments)
        return out
```

`backend/app/seed/loader.py`:

```python
from pathlib import Path

import yaml
from pydantic import ValidationError

from app.seed.schema import SeedFile


class SeedError(Exception):
    def __init__(self, problems: list[str]):
        self.problems = problems
        super().__init__("\n".join(problems))


def load_seed_dir(path: Path) -> list[SeedFile]:
    """Parse and validate every *.yaml file in `path`. Raises SeedError listing every problem."""
    files = sorted(path.glob("*.yaml"))
    if not files:
        raise SeedError([f"no .yaml files in {path}"])

    problems: list[str] = []
    parsed: list[tuple[str, SeedFile]] = []
    for file in files:
        try:
            data = yaml.safe_load(file.read_text(encoding="utf-8"))
            parsed.append((file.name, SeedFile.model_validate(data)))
        except yaml.YAMLError as e:
            problems.append(f"{file.name}: invalid YAML: {e}")
        except ValidationError as e:
            for err in e.errors():
                loc = ".".join(str(part) for part in err["loc"])
                problems.append(f"{file.name}: {loc}: {err['msg']}")

    seen: dict[str, str] = {}
    for name, seed in parsed:
        for key in seed.keys():
            if key in seen:
                problems.append(f"{name}: duplicate key '{key}' (also in {seen[key]})")
            else:
                seen[key] = name

    if problems:
        raise SeedError(problems)
    return [seed for _, seed in parsed]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_seed_validation.py -v`
Expected: 8 passed. If `test_duplicate_key_across_files_names_both_files` fails because `a.yaml`'s own name isn't in the message, check the message format: the problem is reported against `b.yaml` and mentions `a.yaml` via "also in".

- [ ] **Step 5: Commit**

```bash
git add backend/app/seed backend/tests/test_seed_validation.py
git commit -m "feat(seed): validate seed YAML files"
```

---

### Task 4: Seed upsert and CLI

**Files:**
- Modify: `backend/app/seed/loader.py`
- Create: `backend/app/seed/__main__.py`, `backend/tests/test_seed_apply.py`

**Interfaces:**
- Consumes: `SeedFile` and friends (Task 3), models (Task 2).
- Produces: `app.seed.loader.apply_seed(session: Session, seeds: list[SeedFile]) -> None` (upserts by key, sets positions from list order, deletes rows whose keys are no longer in any seed file; flushes, does not commit); `app.seed.__main__.run(seed_dir: Path, session: Session) -> int` (0 on success, 1 on validation failure, writes nothing on failure); `main(argv: list[str] | None = None) -> int`. CLI: `uv run python -m app.seed [SEED_DIR]`, default `<repo>/seed`.

- [ ] **Step 1: Write the failing tests**

`backend/tests/test_seed_apply.py`:

```python
from datetime import date

from sqlalchemy import func, select

from app.models import Assessment, Module, Task, Week
from app.seed.__main__ import run
from app.seed.loader import apply_seed
from app.seed.schema import SeedFile


def seed(weeks, assessments=None, module_key="ccc602"):
    return SeedFile.model_validate(
        {
            "module": {"key": module_key, "code": "CCC602", "title": "Data Engineering", "order": 2},
            "weeks": weeks,
            "assessments": assessments or [],
        }
    )


def task(key, title="T"):
    return {"key": key, "title": title, "type": "learning_path", "external_url": "https://x.test/" + key}


def count(db, model):
    return db.scalar(select(func.count()).select_from(model))


def test_inserts_everything_with_positions(db):
    apply_seed(
        db,
        [seed(
            [{"key": "w9", "week_number": 9, "title": "W9", "tasks": [task("t1"), task("t2")]}],
            [{"key": "a3", "title": "A3", "due_date": "2026-10-25"}],
        )],
    )
    module = db.scalars(select(Module)).one()
    assert module.position == 2
    assert [(t.key, t.position) for t in module.weeks[0].tasks] == [("t1", 0), ("t2", 1)]
    assert module.assessments[0].due_date == date(2026, 10, 25)
    assert module.weeks[0].tasks[0].external_url == "https://x.test/t1"


def test_rerun_is_idempotent(db):
    data = [seed([{"key": "w9", "week_number": 9, "title": "W9", "tasks": [task("t1")]}])]
    apply_seed(db, data)
    apply_seed(db, data)
    assert (count(db, Module), count(db, Week), count(db, Task)) == (1, 1, 1)


def test_task_moved_to_other_week_keeps_its_row(db):
    apply_seed(db, [seed([
        {"key": "w9", "week_number": 9, "title": "W9", "tasks": [task("t1")]},
        {"key": "w10", "week_number": 10, "title": "W10", "tasks": []},
    ])])
    original_id = db.scalars(select(Task.id).where(Task.key == "t1")).one()

    apply_seed(db, [seed([
        {"key": "w9", "week_number": 9, "title": "W9", "tasks": []},
        {"key": "w10", "week_number": 10, "title": "W10", "tasks": [task("t1", title="Moved")]},
    ])])

    moved = db.scalars(select(Task).where(Task.key == "t1")).one()
    assert moved.id == original_id
    assert moved.week.key == "w10"
    assert moved.title == "Moved"
    assert count(db, Task) == 1


def test_removed_items_are_deleted(db):
    apply_seed(db, [
        seed([{"key": "w9", "week_number": 9, "title": "W9", "tasks": [task("t1"), task("t2")]}],
             [{"key": "a3", "title": "A3"}]),
        seed([{"key": "x-w1", "week_number": 1, "title": "X", "tasks": [task("x1")]}], module_key="other"),
    ])
    apply_seed(db, [seed([{"key": "w9", "week_number": 9, "title": "W9", "tasks": [task("t1")]}])])

    assert db.scalars(select(Task.key)).all() == ["t1"]
    assert count(db, Assessment) == 0
    assert db.scalars(select(Module.key)).all() == ["ccc602"]


def test_run_with_invalid_files_writes_nothing(db, tmp_path, capsys):
    good = (
        "module: {key: ccc602, code: CCC602, title: DE, order: 2}\n"
        "weeks: [{key: w9, week_number: 9, title: W9}]\n"
    )
    (tmp_path / "a.yaml").write_text(good, encoding="utf-8")
    (tmp_path / "b.yaml").write_text(good.replace("key: ccc602", "key: other"), encoding="utf-8")

    assert run(tmp_path, db) == 1
    assert count(db, Module) == 0
    assert "duplicate key 'w9'" in capsys.readouterr().err


def test_run_with_valid_files_succeeds(db, tmp_path):
    (tmp_path / "a.yaml").write_text(
        "module: {key: ccc602, code: CCC602, title: DE, order: 2}\n", encoding="utf-8"
    )
    assert run(tmp_path, db) == 0
    assert count(db, Module) == 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_seed_apply.py -v`
Expected: FAIL, `ImportError: cannot import name 'apply_seed'`.

- [ ] **Step 3: Implement `apply_seed`**

Append to `backend/app/seed/loader.py` (and add the imports at the top):

```python
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Assessment, Module, Task, Week
```

```python
def apply_seed(session: Session, seeds: list[SeedFile]) -> None:
    """Upsert all seed content by key and delete anything no longer in the seed files."""
    modules = {m.key: m for m in session.scalars(select(Module))}
    weeks = {w.key: w for w in session.scalars(select(Week))}
    tasks = {t.key: t for t in session.scalars(select(Task))}
    assessments = {a.key: a for a in session.scalars(select(Assessment))}
    kept: set[str] = set()

    for seed in seeds:
        sm = seed.module
        module = modules.get(sm.key) or Module(key=sm.key)
        module.code, module.title, module.position = sm.code, sm.title, sm.order
        session.add(module)
        kept.add(sm.key)

        for w_pos, sw in enumerate(seed.weeks):
            week = weeks.get(sw.key) or Week(key=sw.key)
            week.module = module
            week.week_number, week.title, week.position = sw.week_number, sw.title, w_pos
            kept.add(sw.key)

            for t_pos, st in enumerate(sw.tasks):
                task = tasks.get(st.key) or Task(key=st.key)
                task.week = week
                task.title, task.type, task.position = st.title, st.type, t_pos
                task.external_url = str(st.external_url) if st.external_url else None
                task.uplearn_url = str(st.uplearn_url) if st.uplearn_url else None
                kept.add(st.key)

        for sa in seed.assessments:
            assessment = assessments.get(sa.key) or Assessment(key=sa.key)
            assessment.module = module
            assessment.title, assessment.due_date = sa.title, sa.due_date
            assessment.uplearn_url = str(sa.uplearn_url) if sa.uplearn_url else None
            kept.add(sa.key)

    session.flush()
    for existing in (tasks, assessments, weeks, modules):
        for key, obj in existing.items():
            if key not in kept:
                session.delete(obj)
    session.flush()
```

- [ ] **Step 4: Write the CLI**

`backend/app/seed/__main__.py`:

```python
import argparse
import sys
from pathlib import Path

from sqlalchemy.orm import Session

from app.seed.loader import SeedError, apply_seed, load_seed_dir

DEFAULT_SEED_DIR = Path(__file__).resolve().parents[3] / "seed"


def run(seed_dir: Path, session: Session) -> int:
    try:
        seeds = load_seed_dir(seed_dir)
    except SeedError as e:
        print("Seed validation failed; nothing was written:", file=sys.stderr)
        for problem in e.problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1
    apply_seed(session, seeds)
    print(f"Seeded {len(seeds)} module(s) from {seed_dir}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.seed", description="Load seed YAML into the database.")
    parser.add_argument("seed_dir", nargs="?", default=str(DEFAULT_SEED_DIR))
    args = parser.parse_args(argv)

    from app.db import SessionLocal

    with SessionLocal.begin() as session:
        return run(Path(args.seed_dir), session)


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `uv run pytest -v`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/seed backend/tests/test_seed_apply.py
git commit -m "feat(seed): upsert seed content by key with CLI"
```

---

### Task 5: CCC602 seed content

**Files:**
- Create: `seed/ccc602.yaml`, `backend/tests/test_seed_files.py`

**Interfaces:**
- Consumes: `load_seed_dir`, `DEFAULT_SEED_DIR` (Tasks 3–4).
- Produces: the real seed directory, validated by tests.

- [ ] **Step 1: Write the failing test**

`backend/tests/test_seed_files.py`:

```python
from app.seed.__main__ import DEFAULT_SEED_DIR
from app.seed.loader import load_seed_dir


def test_repo_seed_files_are_valid():
    seeds = load_seed_dir(DEFAULT_SEED_DIR)
    assert seeds, "expected at least one seed file"


def test_ccc602_covers_full_time_weeks_9_to_16():
    seeds = {s.module.key: s for s in load_seed_dir(DEFAULT_SEED_DIR)}
    ccc602 = seeds["ccc602"]
    assert [w.week_number for w in ccc602.weeks] == list(range(9, 17))
    assert all(w.tasks for w in ccc602.weeks), "every week should list at least one task"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_seed_files.py -v`
Expected: FAIL with `SeedError: no .yaml files in ...seed`.

- [ ] **Step 3: Write week 9 and the assessments**

`seed/ccc602.yaml`:

```yaml
module:
  key: ccc602
  code: CCC602
  title: Data Engineering in the Public Cloud
  order: 2

weeks:
  - key: ccc602-w09
    week_number: 9
    title: "DP-900 Learning Paths 1–4"
    tasks:
      - key: ccc602-w09-dp900-lp1
        title: "DP-900 LP1: Explore core data concepts"
        type: learning_path
        external_url: https://learn.microsoft.com/en-us/training/paths/azure-data-fundamentals-explore-core-data-concepts/
      - key: ccc602-w09-dp900-lp2
        title: "DP-900 LP2: Explore relational data in Azure"
        type: learning_path
        external_url: https://learn.microsoft.com/en-us/training/paths/azure-data-fundamentals-explore-relational-data/
      - key: ccc602-w09-dp900-lp3
        title: "DP-900 LP3: Explore non-relational data in Azure"
        type: learning_path
        external_url: https://learn.microsoft.com/en-us/training/paths/azure-data-fundamentals-explore-non-relational-data
      - key: ccc602-w09-dp900-lp4
        title: "DP-900 LP4: Explore data analytics in Azure"
        type: learning_path
        external_url: https://learn.microsoft.com/en-us/training/paths/azure-data-fundamentals-explore-data-warehouse-analytics/
      - key: ccc602-w09-dp900-labs
        title: "DP-900 hands-on labs (Skillable; training key from your tutor)"
        type: lab
        external_url: https://msle.learnondemand.net/User/Login?returnUrl=%2FClass%2F692793
        uplearn_url: https://yoobee.uplearn.education/mod/forum/discuss.php?d=48958
      - key: ccc602-w09-a3-brief
        title: "Read the Assessment 3 brief and plan your Azure practical tasks"
        type: assessment_step
        uplearn_url: https://yoobee.uplearn.education/course/section.php?id=9649

assessments:
  - key: ccc602-a3
    title: "Assessment 3: Azure Practical Scenario Evaluation"
    due_date: 2026-10-25
    uplearn_url: https://yoobee.uplearn.education/course/section.php?id=9649
  - key: ccc602-a4
    title: "Assessment 4: Scenario-Based Activity Design and Implementation (AWS)"
    uplearn_url: https://yoobee.uplearn.education/course/section.php?id=9649
```

- [ ] **Step 4: Collect weeks 10–16 from the portal**

With the owner logged in to UPLearn in Chrome, open the full-time schedule forum https://yoobee.uplearn.education/mod/forum/view.php?id=74592 and read posts `02_FT_Week_10` through `08_FT_Week_16`. For each post, add a week entry following the week 9 pattern:

- `key: ccc602-wNN`, `week_number: NN`, a short `title` naming the week's focus.
- One `learning_path` task per learning path or module the post lists, with the Microsoft Learn or AWS link from the matching certification tile in course 02 (tiles: DP-900, Azure Data Engineer Associates, DEA-C01 AWS). Keys follow `ccc602-wNN-<cert>-<lpN>`.
- One `lab` task if the post mentions labs.
- One `assessment_step` task per assessment action in the post, linking to the Assessments section.
- `uplearn_url` on a task may point to that week's schedule post.
- Write titles in your own words; don't paste the post text. Never include training keys.
- If a post gives an Assessment 4 due date, add it to `ccc602-a4`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `uv run pytest tests/test_seed_files.py -v`
Expected: 2 passed.

- [ ] **Step 6: Load into the dev branch**

Run: `uv run python -m app.seed`
Expected: `Seeded 1 module(s) from ...seed`. Running it a second time prints the same and changes nothing.

- [ ] **Step 7: Commit**

```bash
git add seed/ccc602.yaml backend/tests/test_seed_files.py
git commit -m "feat(seed): CCC602 full-time weeks 9-16"
```

---

### Task 6: Modules API

**Files:**
- Create: `backend/app/api/__init__.py`, `backend/app/api/schemas.py`, `backend/app/api/modules.py`, `backend/tests/test_modules_api.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Consumes: models (Task 2), `get_db` (Task 1).
- Produces:
  - `GET /api/modules` → `[{key, code, title, week_count, task_count}]` ordered by module position.
  - `GET /api/modules/{key}` → `{key, code, title, weeks: [{key, week_number, title, tasks: [{key, title, type, external_url, uplearn_url}]}], assessments: [{key, title, due_date, uplearn_url}]}`. Weeks and tasks in position order; assessments by due date (no date last), then title. Unknown key → 404 `{"detail": "Module not found"}`.

- [ ] **Step 1: Write the failing tests**

`backend/tests/test_modules_api.py`:

```python
from datetime import date

from app.models import Assessment, Module, Task, Week


def add_content(db):
    de = Module(key="ccc602", code="CCC602", title="Data Engineering", position=2)
    de.weeks = [
        Week(key="w10", week_number=10, title="Empty", position=1),
        Week(key="w9", week_number=9, title="DP-900", position=0, tasks=[
            Task(key="t2", title="Labs", type="lab", external_url="https://lab.test", position=1),
            Task(key="t1", title="LP1", type="learning_path", external_url="https://learn.test", position=0),
        ]),
    ]
    de.assessments = [
        Assessment(key="a4", title="Assessment 4", due_date=None),
        Assessment(key="a3", title="Assessment 3", due_date=date(2026, 10, 25), uplearn_url="https://up.test"),
    ]
    admin = Module(key="ccc601", code="CCC601", title="Public Cloud Administration", position=1)
    db.add_all([de, admin])
    db.flush()


def test_list_modules_in_order_with_counts(client, db):
    add_content(db)
    response = client.get("/api/modules")
    assert response.status_code == 200
    assert response.json() == [
        {"key": "ccc601", "code": "CCC601", "title": "Public Cloud Administration", "week_count": 0, "task_count": 0},
        {"key": "ccc602", "code": "CCC602", "title": "Data Engineering", "week_count": 2, "task_count": 2},
    ]


def test_list_modules_when_empty(client):
    assert client.get("/api/modules").json() == []


def test_module_detail(client, db):
    add_content(db)
    body = client.get("/api/modules/ccc602").json()
    assert [w["key"] for w in body["weeks"]] == ["w9", "w10"]
    assert body["weeks"][0]["tasks"][0] == {
        "key": "t1", "title": "LP1", "type": "learning_path",
        "external_url": "https://learn.test", "uplearn_url": None,
    }
    assert body["weeks"][1]["tasks"] == []
    assert body["assessments"] == [
        {"key": "a3", "title": "Assessment 3", "due_date": "2026-10-25", "uplearn_url": "https://up.test"},
        {"key": "a4", "title": "Assessment 4", "due_date": None, "uplearn_url": None},
    ]


def test_unknown_module_is_404(client):
    response = client.get("/api/modules/nope")
    assert response.status_code == 404
    assert response.json() == {"detail": "Module not found"}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_modules_api.py -v`
Expected: FAIL, 404 on `/api/modules` (route doesn't exist).

- [ ] **Step 3: Write schemas and routes**

`backend/app/api/__init__.py`: empty file.

`backend/app/api/schemas.py`:

```python
from datetime import date

from pydantic import BaseModel, ConfigDict


class _Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ModuleSummary(_Out):
    key: str
    code: str
    title: str
    week_count: int
    task_count: int


class TaskOut(_Out):
    key: str
    title: str
    type: str
    external_url: str | None
    uplearn_url: str | None


class WeekOut(_Out):
    key: str
    week_number: int
    title: str
    tasks: list[TaskOut]


class AssessmentOut(_Out):
    key: str
    title: str
    due_date: date | None
    uplearn_url: str | None


class ModuleDetail(_Out):
    key: str
    code: str
    title: str
    weeks: list[WeekOut]
    assessments: list[AssessmentOut]
```

`backend/app/api/modules.py`:

```python
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.schemas import ModuleDetail, ModuleSummary
from app.db import get_db
from app.models import Module, Week

router = APIRouter(prefix="/modules", tags=["modules"])


@router.get("", response_model=list[ModuleSummary])
def list_modules(db: Session = Depends(get_db)) -> list[ModuleSummary]:
    modules = db.scalars(
        select(Module).options(selectinload(Module.weeks).selectinload(Week.tasks)).order_by(Module.position)
    ).all()
    return [
        ModuleSummary(
            key=m.key,
            code=m.code,
            title=m.title,
            week_count=len(m.weeks),
            task_count=sum(len(w.tasks) for w in m.weeks),
        )
        for m in modules
    ]


@router.get("/{key}", response_model=ModuleDetail)
def get_module(key: str, db: Session = Depends(get_db)) -> ModuleDetail:
    module = db.scalars(
        select(Module)
        .where(Module.key == key)
        .options(selectinload(Module.weeks).selectinload(Week.tasks), selectinload(Module.assessments))
    ).one_or_none()
    if module is None:
        raise HTTPException(status_code=404, detail="Module not found")
    detail = ModuleDetail.model_validate(module)
    detail.assessments.sort(key=lambda a: (a.due_date is None, a.due_date or date.max, a.title))
    return detail
```

Modify `backend/app/main.py`: add the import and include the router.

```python
from fastapi import APIRouter, FastAPI

from app.api import modules

app = FastAPI(title="Yoobee Study Guide")

api = APIRouter(prefix="/api")


@api.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


api.include_router(modules.router)
app.include_router(api)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest -v`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api backend/app/main.py backend/tests/test_modules_api.py
git commit -m "feat(api): list and detail endpoints for modules"
```

---

### Task 7: Frontend scaffold and Modules page

**Files:**
- Create (via template): `frontend/`
- Modify: `frontend/vite.config.ts`, `frontend/src/App.tsx`, `frontend/src/index.css`, `frontend/index.html`
- Delete: `frontend/src/App.css`, `frontend/src/assets/react.svg`
- Create: `frontend/src/api.ts`, `frontend/src/components/ErrorMessage.tsx`, `frontend/src/pages/ModulesPage.tsx`, `frontend/src/pages/ModulePage.tsx` (stub), `frontend/src/test/setup.ts`, `frontend/src/test/utils.tsx`, `frontend/src/pages/ModulesPage.test.tsx`

**Interfaces:**
- Consumes: `GET /api/modules` (Task 6).
- Produces: `api.ts` exports `TaskType`, `ModuleSummary`, `Task`, `Week`, `Assessment`, `ModuleDetail`, `ApiError` (`.status: number`), `fetchModules()`, `fetchModule(key)`. `App.tsx` exports default `App` and named `AppRoutes`. `ErrorMessage({ error, onRetry })`. Test helpers `renderAt(path: string)` and `jsonResponse(body: unknown, status?: number): Response`.

- [ ] **Step 1: Scaffold and install**

From the repo root:

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install @tanstack/react-query react-router-dom
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
rm src/App.css src/assets/react.svg
```

If `create vite` asks to install and start now, answer no.

In `package.json` `"scripts"`, add `"test": "vitest run"`.

In `index.html`, set `<title>Yoobee Study Guide</title>`.

- [ ] **Step 2: Configure Vite and the test setup**

`frontend/vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:8000' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

`frontend/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
```

- [ ] **Step 3: Write the API client**

`frontend/src/api.ts`:

```ts
export type TaskType = 'learning_path' | 'lab' | 'assessment_step'

export interface ModuleSummary {
  key: string
  code: string
  title: string
  week_count: number
  task_count: number
}

export interface Task {
  key: string
  title: string
  type: TaskType
  external_url: string | null
  uplearn_url: string | null
}

export interface Week {
  key: string
  week_number: number
  title: string
  tasks: Task[]
}

export interface Assessment {
  key: string
  title: string
  due_date: string | null
  uplearn_url: string | null
}

export interface ModuleDetail {
  key: string
  code: string
  title: string
  weeks: Week[]
  assessments: Assessment[]
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`)
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (typeof body?.detail === 'string') message = body.detail
    } catch {
      // non-JSON error body; keep the generic message
    }
    throw new ApiError(res.status, message)
  }
  return (await res.json()) as T
}

export const fetchModules = () => getJson<ModuleSummary[]>('/modules')
export const fetchModule = (key: string) => getJson<ModuleDetail>(`/modules/${encodeURIComponent(key)}`)
```

- [ ] **Step 4: Write test helpers and the failing tests**

`frontend/src/test/utils.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from '../App'

export function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
```

`frontend/src/pages/ModulesPage.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { jsonResponse, renderAt } from '../test/utils'

const modules = [
  { key: 'ccc601', code: 'CCC601', title: 'Public Cloud Administration', week_count: 0, task_count: 0 },
  { key: 'ccc602', code: 'CCC602', title: 'Data Engineering in the Public Cloud', week_count: 8, task_count: 30 },
]

describe('ModulesPage', () => {
  it('lists modules with links and counts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(modules)))
    renderAt('/')
    const link = await screen.findByRole('link', { name: /Data Engineering in the Public Cloud/ })
    expect(link).toHaveAttribute('href', '/modules/ccc602')
    expect(screen.getByText('8 weeks · 30 tasks')).toBeInTheDocument()
  })

  it('shows a hint when there are no modules', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([])))
    renderAt('/')
    expect(await screen.findByText(/No modules yet/)).toBeInTheDocument()
  })

  it('shows an error and retries', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ detail: 'Server exploded' }, 500))
      .mockResolvedValueOnce(jsonResponse(modules))
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/')

    expect(await screen.findByRole('alert')).toHaveTextContent('Server exploded')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('link', { name: /Public Cloud Administration/ })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shows an error when the backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderAt('/')
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to fetch')
  })
})
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, `AppRoutes` is not exported from `../App`.

- [ ] **Step 6: Write the components**

`frontend/src/components/ErrorMessage.tsx`:

```tsx
export function ErrorMessage({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div role="alert" className="error">
      <p>{error.message}</p>
      <button type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}
```

`frontend/src/pages/ModulesPage.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchModules } from '../api'
import { ErrorMessage } from '../components/ErrorMessage'

export function ModulesPage() {
  const query = useQuery({ queryKey: ['modules'], queryFn: fetchModules })

  if (query.isPending) return <p>Loading…</p>
  if (query.isError) return <ErrorMessage error={query.error} onRetry={() => query.refetch()} />

  return (
    <main>
      <h1>Modules</h1>
      {query.data.length === 0 ? (
        <p>No modules yet. Run the seed loader.</p>
      ) : (
        <ul className="module-list">
          {query.data.map((m) => (
            <li key={m.key}>
              <Link to={`/modules/${m.key}`}>
                <span className="code">{m.code}</span> {m.title}
              </Link>
              <span className="meta">
                {m.week_count} weeks · {m.task_count} tasks
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
```

`frontend/src/pages/ModulePage.tsx` (stub, replaced in Task 8):

```tsx
export function ModulePage() {
  return <main />
}
```

`frontend/src/App.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ModulePage } from './pages/ModulePage'
import { ModulesPage } from './pages/ModulesPage'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ModulesPage />} />
      <Route path="/modules/:key" element={<ModulePage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

`frontend/src/index.css` (replace template contents):

```css
:root {
  font-family: system-ui, sans-serif;
  line-height: 1.5;
  color: #1d1b26;
  background: #f7f6fb;
}
body { margin: 0; }
main { max-width: 760px; margin: 0 auto; padding: 24px 16px; }
a { color: #5b2bbf; }
.module-list { list-style: none; padding: 0; display: grid; gap: 12px; }
.module-list li { background: #fff; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 4px; }
.code { font-weight: 600; }
.meta { color: #615d70; font-size: 0.9rem; }
.error { background: #fdecec; border-radius: 8px; padding: 12px 16px; }
details { background: #fff; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; }
summary { cursor: pointer; font-weight: 600; }
.task-list { list-style: none; padding: 0; }
.task-list li { display: flex; gap: 12px; flex-wrap: wrap; padding: 6px 0; border-top: 1px solid #eee; }
.task-type { color: #615d70; font-size: 0.85rem; }
```

`src/main.tsx` from the template already imports `./index.css` and renders `<App />`; leave it unchanged.

- [ ] **Step 7: Run tests and the type check**

Run: `npm test`
Expected: 4 passed.

Run: `npm run build`
Expected: builds with no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add frontend
git commit -m "feat(frontend): Vite React app with modules list"
```

---

### Task 8: Module page with weeks, tasks and assessments

**Files:**
- Modify: `frontend/src/pages/ModulePage.tsx`
- Create: `frontend/src/pages/ModulePage.test.tsx`

**Interfaces:**
- Consumes: `fetchModule`, `ApiError`, `ModuleDetail` (Task 7); `GET /api/modules/{key}` (Task 6).
- Produces: `ModulePage` at `/modules/:key`; `formatDueDate(iso: string): string` exported from `ModulePage.tsx`.

- [ ] **Step 1: Write the failing tests**

`frontend/src/pages/ModulePage.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { jsonResponse, renderAt } from '../test/utils'
import { formatDueDate } from './ModulePage'

const detail = {
  key: 'ccc602',
  code: 'CCC602',
  title: 'Data Engineering in the Public Cloud',
  weeks: [
    {
      key: 'ccc602-w09',
      week_number: 9,
      title: 'DP-900 Learning Paths 1–4',
      tasks: [
        { key: 't1', title: 'DP-900 LP1', type: 'learning_path', external_url: 'https://learn.test/lp1', uplearn_url: null },
        { key: 't2', title: 'Read the A3 brief', type: 'assessment_step', external_url: null, uplearn_url: 'https://up.test/a3' },
      ],
    },
    { key: 'ccc602-w10', week_number: 10, title: 'Quiet week', tasks: [] },
  ],
  assessments: [
    { key: 'a3', title: 'Assessment 3', due_date: '2026-10-25', uplearn_url: 'https://up.test/a3' },
    { key: 'a4', title: 'Assessment 4', due_date: null, uplearn_url: null },
  ],
}

describe('ModulePage', () => {
  it('shows weeks with their tasks and links', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(detail)))
    renderAt('/modules/ccc602')

    expect(await screen.findByRole('heading', { name: /Data Engineering in the Public Cloud/ })).toBeInTheDocument()
    const week9 = screen.getByText('Week 9: DP-900 Learning Paths 1–4').closest('details')!
    expect(within(week9).getByText('2 tasks')).toBeInTheDocument()

    const lp1 = within(week9).getByText('DP-900 LP1').closest('li')!
    const open = within(lp1).getByRole('link', { name: 'Open' })
    expect(open).toHaveAttribute('href', 'https://learn.test/lp1')
    expect(open).toHaveAttribute('target', '_blank')
    expect(open).toHaveAttribute('rel', 'noopener noreferrer')

    const brief = within(week9).getByText('Read the A3 brief').closest('li')!
    expect(within(brief).queryByRole('link', { name: 'Open' })).toBeNull()
    expect(within(brief).getByRole('link', { name: 'UPLearn' })).toHaveAttribute('href', 'https://up.test/a3')
  })

  it('handles a week with no tasks', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(detail)))
    renderAt('/modules/ccc602')
    const week10 = (await screen.findByText('Week 10: Quiet week')).closest('details')!
    expect(within(week10).getByText('No tasks listed for this week.')).toBeInTheDocument()
  })

  it('lists assessments with due dates', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(detail)))
    renderAt('/modules/ccc602')
    const a3 = (await screen.findByText('Assessment 3')).closest('li')!
    expect(a3).toHaveTextContent(/25 Oct 2026/)
    const a4 = screen.getByText('Assessment 4').closest('li')!
    expect(a4).toHaveTextContent('Due date: see programme guide')
  })

  it('shows "Module not found" for an unknown key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ detail: 'Module not found' }, 404)))
    renderAt('/modules/nope')
    expect(await screen.findByRole('heading', { name: 'Module not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to modules' })).toHaveAttribute('href', '/')
  })

  it('formats dates without shifting the day', () => {
    expect(formatDueDate('2026-10-25')).toMatch(/25 Oct 2026/)
    expect(formatDueDate('2026-01-01')).toMatch(/1 Jan 2026/)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: ModulePage tests FAIL (stub renders nothing; `formatDueDate` not exported).

- [ ] **Step 3: Implement the page**

`frontend/src/pages/ModulePage.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ApiError, fetchModule, type TaskType } from '../api'
import { ErrorMessage } from '../components/ErrorMessage'

const TYPE_LABELS: Record<TaskType, string> = {
  learning_path: 'Learning path',
  lab: 'Lab',
  assessment_step: 'Assessment',
}

/** Format a YYYY-MM-DD date in local time so it never shifts a day. */
export function formatDueDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

export function ModulePage() {
  const { key = '' } = useParams()
  const query = useQuery({ queryKey: ['module', key], queryFn: () => fetchModule(key) })

  if (query.isPending) return <p>Loading…</p>
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <main>
          <h1>Module not found</h1>
          <Link to="/">Back to modules</Link>
        </main>
      )
    }
    return <ErrorMessage error={query.error} onRetry={() => query.refetch()} />
  }

  const mod = query.data
  return (
    <main>
      <Link to="/">← All modules</Link>
      <h1>
        {mod.code}: {mod.title}
      </h1>

      <section>
        <h2>Weeks</h2>
        {mod.weeks.map((week) => (
          <details key={week.key}>
            <summary>
              Week {week.week_number}: {week.title}
            </summary>
            <p className="meta">{week.tasks.length} tasks</p>
            {week.tasks.length === 0 ? (
              <p>No tasks listed for this week.</p>
            ) : (
              <ul className="task-list">
                {week.tasks.map((task) => (
                  <li key={task.key}>
                    <span>{task.title}</span>
                    <span className="task-type">{TYPE_LABELS[task.type]}</span>
                    {task.external_url && <ExternalLink href={task.external_url}>Open</ExternalLink>}
                    {task.uplearn_url && <ExternalLink href={task.uplearn_url}>UPLearn</ExternalLink>}
                  </li>
                ))}
              </ul>
            )}
          </details>
        ))}
      </section>

      <section>
        <h2>Assessments</h2>
        <ul className="task-list">
          {mod.assessments.map((a) => (
            <li key={a.key}>
              <span>{a.title}</span>
              <span className="meta">
                {a.due_date ? `Due ${formatDueDate(a.due_date)}` : 'Due date: see programme guide'}
              </span>
              {a.uplearn_url && <ExternalLink href={a.uplearn_url}>UPLearn</ExternalLink>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
```

Note: the test for `2 tasks` relies on the `<p className="meta">` inside `<details>`; jsdom renders closed `<details>` content in the DOM, so `within(...)` finds it.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all pass.

Run: `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages
git commit -m "feat(frontend): module page with weeks, tasks and assessments"
```

---

### Task 9: Run it end to end and document commands

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Start both servers**

Terminal 1: `cd backend && uv run uvicorn app.main:app --reload`
Terminal 2: `cd frontend && npm run dev`

- [ ] **Step 2: Check in the browser**

Open http://localhost:5173 and confirm:
- CCC602 appears with 8 weeks and its task count.
- Clicking it shows weeks 9–16; expanding week 9 shows the DP-900 tasks; "Open" opens Microsoft Learn in a new tab.
- Assessment 3 shows "Due Sun, 25 Oct 2026".
- http://localhost:5173/modules/nope shows "Module not found".
- Stopping the backend and reloading `/` shows the error box; restarting it and clicking "Try again" recovers.

- [ ] **Step 3: Add commands to `CLAUDE.md`**

Insert after the "Stack and layout" section:

````markdown
## Commands

Backend (run in `backend/`; needs `backend/.env`, see `.env.example`):

```bash
uv sync                                    # install deps
uv run uvicorn app.main:app --reload       # API on :8000
uv run pytest                              # all tests (uses TEST_DATABASE_URL)
uv run pytest tests/test_seed_apply.py::test_rerun_is_idempotent -v   # single test
uv run alembic upgrade head                # apply migrations to DATABASE_URL
uv run alembic check                       # confirm models match migrations
uv run python -m app.seed                  # validate + load seed/*.yaml
```

Frontend (run in `frontend/`):

```bash
npm install
npm run dev                                # http://localhost:5173, proxies /api to :8000
npm test                                   # vitest
npx vitest run src/pages/ModulePage.test.tsx   # single file
npm run build                              # type check + build
```
````

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add dev commands to CLAUDE.md"
```
