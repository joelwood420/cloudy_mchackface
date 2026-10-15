# Submodules and Prerequisites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support the new seed format (Module → Submodule → Week → Task, plus shared prerequisites) in the database, seed loader, API and module page, so the timeline is grouped by certification track with a "Before you start" box under each.

**Architecture:** New `submodules`, `prerequisites` and `submodule_prerequisites` tables. `weeks` gains `submodule_id` but keeps `module_id`. The seed loader reads `seed/prerequisites.yaml` plus one file per module, checks references between files, and upserts everything by key. It removes stale rows with one `DELETE … WHERE key NOT IN (…)` per table (the database's ON DELETE CASCADE removes their children) and rebuilds the link rows. `GET /api/modules/{key}` keeps its flat `weeks` list, adds `submodule_key` to each week and adds a `submodules` list. The frontend groups weeks by submodule. This plan also does the database clean-up that was planned for the start of Phase 2: a naming convention, FK indexes and a migration test.

**Tech Stack:** FastAPI, SQLAlchemy 2, Alembic, Pydantic 2, pytest on the Neon test branch; React 19, TanStack Query 5, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-16-submodules-prerequisites-handoff.md` (on the base branch), within `docs/superpowers/specs/2026-10-15-yoobee-study-guide-design.md`.

## Global Constraints

- Work on branch `submodules` in its own git worktree, created from `worktree-submodules-seed` (commit `0dd52fc`). Never commit to `main` or to `worktree-submodules-seed`. Merge or push only when the owner says so.
- Migrations: `0004` (FK indexes) and `0005` (submodules and prerequisites). Auth work follows from `0006`.
- Prerequisites are tickable later (Phase 2) but **never** counted in progress. This plan adds no completion tables.
- `GET /api/modules/{key}` keeps the flat `weeks` list (no breaking change).
- Prerequisites and notes hold pointers only: never a training key, password or Teams/Calendly/Zoom link. No Yoobee-owned text.
- Seed loading is all-or-nothing: report every problem with its file and location, and write nothing if anything fails.
- Seed column limits: key 100; module/week title 200; submodule, task, assessment and prerequisite title 300; code 20; note 300; URLs 1000.
- Week numbers are programme-wide. They must be unique within a module, and each submodule's weeks must be consecutive and ascending. Two modules may share a week number.
- Tests wipe `TEST_DATABASE_URL` only; no test may touch `DATABASE_URL`.
- Always `git add` by path. Never `git add -A` or `git add .`.
- Never kill whatever is on port 5173 (the owner's other project). In Git Bash, `taskkill` needs `//PID`.
- Backend commands run in `backend/` with `uv run ...`; frontend commands run in `frontend/`. The worktree needs its own `backend/.env` (copy it from the main checkout; it's git-ignored), `uv sync` and `npm install`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A prerequisite used by several submodules.** It's stored once and linked from each submodule. Removing it from one submodule's list removes only that link. Removing it from `prerequisites.yaml` removes it everywhere. Tested in Task 2.
2. **Content moving around on re-seed.** A week moving to another submodule, or a task moving to another week, keeps its database id (Phase 2 ticks point at ids). Tested in Task 2.
3. **Broken references between files.** A submodule naming a prerequisite that doesn't exist, a key used in both the prerequisites file and a module file, or a missing `prerequisites.yaml` all produce a clear file-and-location message, and nothing gets written. Tested in Task 2.
4. **The old seed format.** A module file that still has a top-level `weeks:` is rejected with a message naming `weeks`, instead of loading as empty. Tested in Task 2.
5. **An API week whose submodule isn't in the list,** and a submodule without prerequisites. The page still shows every week and leaves out an empty "Before you start" box. Tested in Task 4.

---

## File Structure

Backend (`backend/`):

| File | Responsibility |
|---|---|
| `app/db.py` (modify) | Metadata naming convention matching Postgres defaults |
| `app/models.py` (modify) | FK indexes; `Submodule`, `Prerequisite`, `SubmodulePrerequisite`; `Week.submodule` |
| `alembic/env.py` (modify) | Accept a connection passed in by tests |
| `alembic/versions/0004_fk_indexes.py` (create) | Indexes on existing FKs |
| `alembic/versions/0005_submodules_prerequisites.py` (create) | New tables and `weeks.submodule_id` |
| `app/seed/schema.py` (modify) | New seed shapes and checks within one file |
| `app/seed/loader.py` (modify) | `SeedBundle`, checks across files, upsert and delete |
| `app/seed/__main__.py` (modify) | Pass prerequisites through; summary line |
| `app/api/schemas.py`, `app/api/modules.py` (modify) | `submodules`, `submodule_key`, `submodule_count` |
| `tests/test_migrations.py` (create) | Migrations build exactly the model schema |
| `tests/test_models.py`, `tests/test_seed_*.py`, `tests/test_modules_api.py` (modify) | New format |

Frontend (`frontend/src/`):

| File | Responsibility |
|---|---|
| `api.ts` (modify) | `Submodule`, `Prerequisite` types; new fields |
| `format.ts` (modify) | `weekRange` helper |
| `components/ExternalLink.tsx` (modify) | Optional `label` (accessible name) |
| `components/module/PrerequisiteBox.tsx` (create) | "Before you start" box |
| `components/module/WeekTimeline.tsx` (modify) | Group weeks by submodule |
| `pages/ModulePage.tsx` (modify) | Pass submodules |
| `index.css` (modify) | Submodule and prerequisite styles |

---

### Task 0: Set up the worktree (controller does this, no subagent)

- [ ] Use superpowers:using-git-worktrees to create a worktree on a new branch `submodules` from `worktree-submodules-seed`.
- [ ] Copy `backend/.env` from the main checkout into the worktree's `backend/`.
- [ ] Run `uv sync` in `backend/` and `npm install` in `frontend/`.
- [ ] Copy this plan into the worktree's `docs/superpowers/plans/`, then commit it: `git add docs/superpowers/plans/2026-10-16-submodules-and-prerequisites.md && git commit -m "docs: submodules and prerequisites plan"`
- [ ] Baseline: `uv run pytest`. Expected: `tests/test_seed_files.py` FAILS (the new seed format isn't supported yet) and everything else passes. Frontend `npm test` passes.

---

### Task 1: Database hardening — naming convention, FK indexes, migration test

**Files:**
- Modify: `backend/app/db.py`, `backend/app/models.py`, `backend/alembic/env.py`
- Create: `backend/alembic/versions/0004_fk_indexes.py`
- Test: `backend/tests/test_migrations.py`

**Interfaces:**
- Produces: `Base.metadata` with `NAMING_CONVENTION` (names match Postgres defaults, so existing databases need no renames). `alembic/env.py` uses `config.attributes["connection"]` when one is passed in.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_migrations.py`:

```python
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

            command.downgrade(alembic_config(conn), "base")
            tables = conn.execute(
                text("select table_name from information_schema.tables where table_schema = :s"), {"s": SCHEMA}
            ).scalars().all()
            assert tables == ["alembic_version"]
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
```

- [ ] **Step 2: Run the database-free tests to verify they fail**

The migration test must not run until `env.py` is fixed (Step 5). The current `env.py` ignores the passed connection and would point Alembic at `DATABASE_URL`.

Run: `uv run pytest tests/test_migrations.py -v -k "indexed or postgres_defaults"`
Expected: FAIL. `test_foreign_keys_are_indexed` fails with "weeks.module_id has no index". `test_constraint_names_match_postgres_defaults` fails because the names are `None`.

- [ ] **Step 3: Naming convention**

Replace `backend/app/db.py`:

```python
from collections.abc import Iterator

from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings, sqlalchemy_url

engine = create_engine(sqlalchemy_url(get_settings().database_url), pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

# Same names Postgres picks for unnamed constraints, so existing databases match without renames.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "%(table_name)s_%(column_0_name)s_key",
    "ck": "%(table_name)s_%(constraint_name)s_check",
    "fk": "%(table_name)s_%(column_0_name)s_fkey",
    "pk": "%(table_name)s_pkey",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


def get_db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session
```

- [ ] **Step 4: FK indexes and migration 0004**

In `backend/app/models.py` add `index=True` to `Week.module_id`, `Task.week_id` and `Assessment.module_id`, e.g.:

```python
    module_id: Mapped[int] = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"), index=True)
```

Create `backend/alembic/versions/0004_fk_indexes.py`:

```python
"""index foreign keys

Revision ID: 0004
Revises: 0003
"""
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_weeks_module_id", "weeks", ["module_id"])
    op.create_index("ix_tasks_week_id", "tasks", ["week_id"])
    op.create_index("ix_assessments_module_id", "assessments", ["module_id"])


def downgrade() -> None:
    op.drop_index("ix_assessments_module_id", table_name="assessments")
    op.drop_index("ix_tasks_week_id", table_name="tasks")
    op.drop_index("ix_weeks_module_id", table_name="weeks")
```

- [ ] **Step 5: env.py takes a connection**

Replace `backend/alembic/env.py`:

```python
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
```

- [ ] **Step 6: Run tests**

Run: `uv run pytest tests/test_migrations.py -v`
Expected: 3 PASS.

Run: `uv run pytest --deselect tests/test_seed_files.py`
Expected: all PASS (`test_seed_files` is fixed in Task 2).

- [ ] **Step 7: Commit**

```bash
git add backend/app/db.py backend/app/models.py backend/alembic/env.py backend/alembic/versions/0004_fk_indexes.py backend/tests/test_migrations.py
git commit -m "feat(db): naming convention, FK indexes and a migration test"
```

(Migrations are applied to the dev branch at the end of Task 2, together with re-seeding.)

---

### Task 2: Submodules and prerequisites in the database and seed loader

This is one task because the models, the seed format and the loader only work together. The seed tests can't pass until all three are done.

**Files:**
- Modify: `backend/app/models.py`
- Create: `backend/alembic/versions/0005_submodules_prerequisites.py`
- Modify: `backend/app/seed/schema.py`, `backend/app/seed/loader.py`, `backend/app/seed/__main__.py`
- Test: `backend/tests/test_models.py`, `backend/tests/test_seed_validation.py`, `backend/tests/test_seed_apply.py`, `backend/tests/test_seed_files.py`, `backend/tests/test_modules_api.py` (fixture only)

**Interfaces:**
- Consumes: Task 1's `Base`.
- Produces (models):
  - `Submodule(id, key, module_id, code, title, uplearn_url, position, module, weeks, prerequisite_links)`. `prerequisite_links` is view-only and ordered by `position`.
  - `Week.submodule_id`, `Week.submodule`, and the property `Week.submodule_key -> str`.
  - `Module.submodules` (ordered by `position`).
  - `Prerequisite(id, key, title, note, external_url, uplearn_url)`
  - `SubmodulePrerequisite(submodule_id, prerequisite_id, position, prerequisite)`
- Produces (seed):
  - `SeedPrerequisite`, `SeedPrerequisiteFile`, `SeedSubmodule`
  - `SeedFile.submodules`, `SeedFile.all_weeks() -> list[SeedWeek]`
  - `SeedBundle(modules: list[SeedFile], prerequisites: list[SeedPrerequisite])`
  - `load_seed_dir(path) -> SeedBundle`
  - `apply_seed(session, seeds: list[SeedFile], prerequisites: Sequence[SeedPrerequisite] = ()) -> None`

- [ ] **Step 1: Write the failing model tests**

Replace `backend/tests/test_models.py`:

```python
from datetime import date

from sqlalchemy import func, select

from app.models import Assessment, Module, Prerequisite, Submodule, SubmodulePrerequisite, Task, Week


def make_module(db):
    module = Module(key="ccc602", code="CCC602", title="Data Engineering", position=2)
    sub = Submodule(key="dp900", code="DP-900", title="Azure Data Fundamentals", position=0)
    week = Week(key="ccc602-w09", week_number=9, title="DP-900", position=0, submodule=sub)
    week.tasks = [
        Task(key="t2", title="Second", type="lab", external_url="https://x.test/2", position=1),
        Task(key="t1", title="First", type="learning_path", external_url="https://x.test/1", position=0),
    ]
    module.submodules = [sub]
    module.weeks = [week]
    module.assessments = [Assessment(key="a3", title="Assessment 3", due_date=date(2026, 10, 25))]
    azure = Prerequisite(key="azure-account", title="Azure account", external_url="https://azure.test")
    skillable = Prerequisite(key="skillable", title="Skillable", uplearn_url="https://up.test/s")
    db.add_all([module, azure, skillable])
    db.flush()
    db.add_all([
        SubmodulePrerequisite(submodule_id=sub.id, prerequisite_id=skillable.id, position=1),
        SubmodulePrerequisite(submodule_id=sub.id, prerequisite_id=azure.id, position=0),
    ])
    db.flush()
    db.expire_all()
    return db.scalars(select(Module).where(Module.key == "ccc602")).one()


def count(db, model):
    return db.scalar(select(func.count()).select_from(model))


def test_tasks_load_in_position_order(db):
    module = make_module(db)
    assert [t.key for t in module.weeks[0].tasks] == ["t1", "t2"]


def test_week_knows_its_submodule(db):
    module = make_module(db)
    assert module.weeks[0].submodule_key == "dp900"
    assert [w.key for w in module.submodules[0].weeks] == ["ccc602-w09"]


def test_prerequisite_links_load_in_position_order(db):
    module = make_module(db)
    assert [link.prerequisite.key for link in module.submodules[0].prerequisite_links] == ["azure-account", "skillable"]


def test_deleting_module_cascades(db):
    module = make_module(db)
    db.delete(module)
    db.flush()
    assert (count(db, Submodule), count(db, Week), count(db, Task), count(db, Assessment)) == (0, 0, 0, 0)
    assert count(db, SubmodulePrerequisite) == 0
    assert count(db, Prerequisite) == 2  # prerequisites are shared; they outlive any one module


def test_deleting_a_prerequisite_removes_only_its_links(db):
    make_module(db)
    db.delete(db.scalars(select(Prerequisite).where(Prerequisite.key == "azure-account")).one())
    db.flush()
    assert db.scalars(select(SubmodulePrerequisite.position)).all() == [1]
    assert count(db, Submodule) == 1
```

- [ ] **Step 2: Run to verify it fails**

Run: `uv run pytest tests/test_models.py -v`
Expected: FAIL with `ImportError: cannot import name 'Prerequisite'`.

- [ ] **Step 3: Add the models**

In `backend/app/models.py`:

Add to `class Module`:

```python
    submodules: Mapped[list["Submodule"]] = relationship(
        back_populates="module", cascade="all, delete-orphan", passive_deletes=True,
        order_by="Submodule.position"
    )
```

Add a new class between `Module` and `Week`:

```python
class Submodule(Base):
    __tablename__ = "submodules"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(100), unique=True)
    module_id: Mapped[int] = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(300))
    uplearn_url: Mapped[str | None] = mapped_column(String(1000))
    position: Mapped[int]

    module: Mapped[Module] = relationship(back_populates="submodules")
    weeks: Mapped[list["Week"]] = relationship(
        back_populates="submodule", cascade="all, delete-orphan", passive_deletes=True,
        order_by="Week.position"
    )
    # Read-only: the seed loader writes link rows directly.
    prerequisite_links: Mapped[list["SubmodulePrerequisite"]] = relationship(
        viewonly=True, order_by="SubmodulePrerequisite.position"
    )
```

In `class Week` add, after `module_id`:

```python
    submodule_id: Mapped[int] = mapped_column(ForeignKey("submodules.id", ondelete="CASCADE"), index=True)
```

and after `module: Mapped[Module] = ...`:

```python
    submodule: Mapped[Submodule] = relationship(back_populates="weeks")
```

and at the end of the class:

```python
    @property
    def submodule_key(self) -> str:
        return self.submodule.key
```

Append to the end of the file:

```python
class Prerequisite(Base):
    """One-off setup step (an account, an invite) shared by any number of submodules. Never counted in progress."""

    __tablename__ = "prerequisites"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(100), unique=True)
    title: Mapped[str] = mapped_column(String(300))
    note: Mapped[str | None] = mapped_column(String(300))
    external_url: Mapped[str | None] = mapped_column(String(1000))
    uplearn_url: Mapped[str | None] = mapped_column(String(1000))


class SubmodulePrerequisite(Base):
    __tablename__ = "submodule_prerequisites"

    submodule_id: Mapped[int] = mapped_column(ForeignKey("submodules.id", ondelete="CASCADE"), primary_key=True)
    prerequisite_id: Mapped[int] = mapped_column(
        ForeignKey("prerequisites.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    position: Mapped[int]

    prerequisite: Mapped[Prerequisite] = relationship()
```

- [ ] **Step 4: Write migration 0005**

Create `backend/alembic/versions/0005_submodules_prerequisites.py`:

```python
"""submodules and prerequisites

Revision ID: 0005
Revises: 0004
"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Content is re-seedable and nothing per-user points at it yet, so clear it rather than backfill
    # weeks.submodule_id. Run `uv run python -m app.seed` straight after upgrading.
    op.execute("DELETE FROM modules")

    op.create_table(
        "submodules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(100), nullable=False, unique=True),
        sa.Column("module_id", sa.Integer(), sa.ForeignKey("modules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("uplearn_url", sa.String(1000), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
    )
    op.create_index("ix_submodules_module_id", "submodules", ["module_id"])

    op.add_column("weeks", sa.Column("submodule_id", sa.Integer(), nullable=False))
    op.create_foreign_key(
        "weeks_submodule_id_fkey", "weeks", "submodules", ["submodule_id"], ["id"], ondelete="CASCADE"
    )
    op.create_index("ix_weeks_submodule_id", "weeks", ["submodule_id"])

    op.create_table(
        "prerequisites",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(100), nullable=False, unique=True),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("note", sa.String(300), nullable=True),
        sa.Column("external_url", sa.String(1000), nullable=True),
        sa.Column("uplearn_url", sa.String(1000), nullable=True),
    )
    op.create_table(
        "submodule_prerequisites",
        sa.Column("submodule_id", sa.Integer(), sa.ForeignKey("submodules.id", ondelete="CASCADE"), primary_key=True),
        sa.Column(
            "prerequisite_id", sa.Integer(), sa.ForeignKey("prerequisites.id", ondelete="CASCADE"), primary_key=True
        ),
        sa.Column("position", sa.Integer(), nullable=False),
    )
    op.create_index(
        "ix_submodule_prerequisites_prerequisite_id", "submodule_prerequisites", ["prerequisite_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_submodule_prerequisites_prerequisite_id", table_name="submodule_prerequisites")
    op.drop_table("submodule_prerequisites")
    op.drop_table("prerequisites")
    op.drop_index("ix_weeks_submodule_id", table_name="weeks")
    op.drop_constraint("weeks_submodule_id_fkey", "weeks", type_="foreignkey")
    op.drop_column("weeks", "submodule_id")
    op.drop_index("ix_submodules_module_id", table_name="submodules")
    op.drop_table("submodules")
```

- [ ] **Step 5: Fix the module API test fixture so it still builds weeks**

In `backend/tests/test_modules_api.py`, replace `add_content` (the expected API output doesn't change until Task 3):

```python
from app.models import Assessment, Module, Prerequisite, Submodule, SubmodulePrerequisite, Task, Week


def add_content(db):
    de = Module(key="ccc602", code="CCC602", title="Data Engineering", position=2, uplearn_url="https://up.test/602")
    dp900 = Submodule(key="dp900", code="DP-900", title="Azure Data Fundamentals", position=0, uplearn_url="https://up.test/dp900")
    dea = Submodule(key="dea", code="DEA-C01", title="AWS Data Engineer", position=1)
    de.submodules = [dp900, dea]
    de.weeks = [
        Week(key="w10", week_number=10, title="Empty", position=1, submodule=dea),
        Week(key="w9", week_number=9, title="DP-900", position=0, submodule=dp900, tasks=[
            Task(key="t2", title="Labs", type="lab", external_url="https://lab.test", position=1, note="Key in Teams"),
            Task(key="t1", title="LP1", type="learning_path", external_url="https://learn.test", position=0),
        ]),
    ]
    de.assessments = [
        Assessment(key="a4", title="Assessment 4", due_date=None),
        Assessment(key="a3", title="Assessment 3", due_date=date(2026, 10, 25), uplearn_url="https://up.test"),
    ]
    admin = Module(key="ccc601", code="CCC601", title="Public Cloud Administration", position=1)
    azure = Prerequisite(key="azure-account", title="Create an Azure account", note="Personal email", external_url="https://azure.test")
    db.add_all([de, admin, azure])
    db.flush()
    db.add(SubmodulePrerequisite(submodule_id=dp900.id, prerequisite_id=azure.id, position=0))
    db.flush()
    db.expire_all()
```

Run: `uv run pytest tests/test_models.py tests/test_modules_api.py tests/test_migrations.py -v`
Expected: all PASS.

- [ ] **Step 6: Write the failing seed validation tests**

Replace `backend/tests/test_seed_validation.py`:

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
submodules:
  - key: ccc602-dp900
    code: DP-900
    title: Microsoft Azure Data Fundamentals
    uplearn_url: https://yoobee.uplearn.education/course/section.php?id=9001
    prerequisites:
      - azure-account
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

PREREQS = """\
prerequisites:
  - key: azure-account
    title: Create an Azure free account
    note: Use a personal email
    external_url: https://azure.microsoft.com/free
"""

SECOND_SUBMODULE = """\
  - key: ccc602-dea
    code: DEA-C01
    title: AWS Data Engineer
    weeks:
      - key: ccc602-w13
        week_number: 13
        title: DEA week
"""


def write(dir: Path, name: str, text: str) -> None:
    (dir / name).write_bytes(text.encode("utf-8"))


def write_valid(dir: Path, module: str = VALID, prereqs: str | None = PREREQS) -> None:
    write(dir, "ccc602.yaml", module)
    if prereqs is not None:
        write(dir, "prerequisites.yaml", prereqs)


def problems(dir: Path) -> list[str]:
    with pytest.raises(SeedError) as exc:
        load_seed_dir(dir)
    return exc.value.problems


def with_second_submodule(text: str = SECOND_SUBMODULE) -> str:
    return VALID.replace("assessments:\n", text + "assessments:\n")


def test_valid_files_load_with_utf8_text(tmp_path):
    write_valid(tmp_path)
    bundle = load_seed_dir(tmp_path)
    [seed] = bundle.modules
    assert seed.module.key == "ccc602"
    assert seed.submodules[0].code == "DP-900"
    assert seed.submodules[0].prerequisites == ["azure-account"]
    assert seed.all_weeks()[0].title == "DP-900 Learning Paths 1–4 · Ngā pūkenga"
    assert seed.all_weeks()[1].tasks == []
    assert str(seed.assessments[0].due_date) == "2026-10-25"
    assert [p.key for p in bundle.prerequisites] == ["azure-account"]


def test_empty_directory_is_an_error(tmp_path):
    assert "no .yaml files" in problems(tmp_path)[0]


def test_prerequisites_file_alone_is_an_error(tmp_path):
    write(tmp_path, "prerequisites.yaml", PREREQS)
    assert "no module files" in problems(tmp_path)[0]


def test_duplicate_key_across_module_files_names_both_files(tmp_path):
    write_valid(tmp_path)
    write(tmp_path, "b.yaml", VALID.replace("key: ccc602\n", "key: other\n"))
    joined = "\n".join(problems(tmp_path))
    assert "duplicate key 'ccc602-w09'" in joined
    assert "ccc602.yaml" in joined and "b.yaml" in joined


def test_duplicate_key_across_prerequisites_and_a_module(tmp_path):
    write_valid(tmp_path, prereqs=PREREQS + "  - key: ccc602-dp900\n    title: Clash\n    external_url: https://x.test\n")
    joined = "\n".join(problems(tmp_path))
    assert "duplicate key 'ccc602-dp900'" in joined
    assert "prerequisites.yaml" in joined


def test_unknown_prerequisite_names_file_and_submodule(tmp_path):
    write_valid(tmp_path, module=VALID.replace("      - azure-account\n", "      - azure-acount\n"))
    assert any(
        p.startswith("ccc602.yaml: submodules.0.prerequisites") and "unknown prerequisite 'azure-acount'" in p
        for p in problems(tmp_path)
    )


def test_missing_prerequisites_file_makes_references_unknown(tmp_path):
    write_valid(tmp_path, prereqs=None)
    assert any("unknown prerequisite 'azure-account'" in p for p in problems(tmp_path))


def test_prerequisite_listed_twice_in_a_submodule_is_rejected(tmp_path):
    write_valid(tmp_path, module=VALID.replace("      - azure-account\n", "      - azure-account\n      - azure-account\n"))
    assert any("submodules.0" in p and "more than once" in p for p in problems(tmp_path))


def test_prerequisite_without_a_url_is_rejected(tmp_path):
    write_valid(tmp_path, prereqs=PREREQS.replace("    external_url: https://azure.microsoft.com/free\n", ""))
    assert any(
        p.startswith("prerequisites.yaml: prerequisites.0") and "external_url or uplearn_url" in p
        for p in problems(tmp_path)
    )


def test_submodule_weeks_must_be_consecutive(tmp_path):
    write_valid(tmp_path, module=VALID.replace("week_number: 10", "week_number: 12"))
    assert any(p.startswith("ccc602.yaml: submodules.0") and "consecutive" in p for p in problems(tmp_path))


def test_submodule_weeks_must_ascend(tmp_path):
    write_valid(tmp_path, module=VALID.replace("week_number: 10", "week_number: 8"))
    assert any("consecutive" in p for p in problems(tmp_path))


def test_week_number_used_twice_in_a_module_is_rejected(tmp_path):
    write_valid(tmp_path, module=with_second_submodule(SECOND_SUBMODULE.replace("week_number: 13", "week_number: 9")))
    assert any(p.startswith("ccc602.yaml") and "week_number 9" in p for p in problems(tmp_path))


def test_two_submodules_with_their_own_weeks_load(tmp_path):
    write_valid(tmp_path, module=with_second_submodule())
    [seed] = load_seed_dir(tmp_path).modules
    assert [w.week_number for w in seed.all_weeks()] == [9, 10, 13]


def test_two_modules_may_share_a_week_number(tmp_path):
    write_valid(tmp_path)
    write(tmp_path, "b.yaml", VALID.replace("key: ccc602", "key: other"))  # renames every key, keeps week numbers
    assert len(load_seed_dir(tmp_path).modules) == 2


def test_old_top_level_weeks_is_rejected(tmp_path):
    write_valid(tmp_path, module=VALID + "weeks: []\n")
    assert any(p.startswith("ccc602.yaml: weeks") for p in problems(tmp_path))


def test_bad_task_type_is_reported_with_file_and_location(tmp_path):
    write_valid(tmp_path, module=VALID.replace("type: learning_path", "type: video"))
    assert any(p.startswith("ccc602.yaml: submodules.0.weeks.0.tasks.0.type") for p in problems(tmp_path))


def test_task_without_any_url_is_rejected(tmp_path):
    text = VALID.replace(
        "            external_url: https://learn.microsoft.com/en-us/training/paths/azure-data-fundamentals-explore-core-data-concepts/\n",
        "",
    )
    write_valid(tmp_path, module=text)
    assert any("external_url or uplearn_url" in p for p in problems(tmp_path))


def test_bad_url_and_bad_key_are_rejected(tmp_path):
    text = VALID.replace("https://learn.microsoft.com", "not-a-url").replace("key: ccc602-w10", "key: CCC602 W10")
    write_valid(tmp_path, module=text)
    joined = "\n".join(problems(tmp_path))
    assert "external_url" in joined
    assert "submodules.0.weeks.1.key" in joined


def test_invalid_yaml_is_reported(tmp_path):
    write_valid(tmp_path)
    write(tmp_path, "broken.yaml", "module: [unclosed")
    assert any(p.startswith("broken.yaml: invalid YAML") for p in problems(tmp_path))


def test_unknown_field_is_rejected(tmp_path):
    write_valid(tmp_path, module=VALID.replace("  order: 2\n", "  order: 2\n  colour: red\n"))
    assert any("module.colour" in p for p in problems(tmp_path))


def test_task_note_is_optional_and_length_limited(tmp_path):
    with_note = VALID.replace(
        "            type: learning_path\n", "            type: learning_path\n            note: Use your personal email\n", 1
    )
    write_valid(tmp_path, module=with_note)
    [seed] = load_seed_dir(tmp_path).modules
    assert seed.all_weeks()[0].tasks[0].note == "Use your personal email"

    write_valid(tmp_path, module=with_note.replace("Use your personal email", "x" * 301))
    assert problems(tmp_path)


def test_titles_fit_their_columns(tmp_path):
    write_valid(tmp_path, module=VALID.replace("title: Empty week", "title: " + "w" * 201))
    assert any(p.startswith("ccc602.yaml: submodules.0.weeks.1.title") for p in problems(tmp_path))

    write_valid(tmp_path, module=VALID.replace("title: Data Engineering in the Public Cloud", "title: " + "m" * 201))
    assert any(p.startswith("ccc602.yaml: module.title") for p in problems(tmp_path))

    write_valid(tmp_path, module=VALID.replace("title: Microsoft Azure Data Fundamentals", "title: " + "s" * 301))
    assert any(p.startswith("ccc602.yaml: submodules.0.title") for p in problems(tmp_path))


def test_task_title_may_use_its_full_column(tmp_path):
    write_valid(tmp_path, module=VALID.replace("title: Explore core data concepts", "title: " + "t" * 300))
    [seed] = load_seed_dir(tmp_path).modules
    assert len(seed.all_weeks()[0].tasks[0].title) == 300


def test_url_longer_than_its_column_is_rejected(tmp_path):
    long_url = "https://learn.microsoft.com/" + "a" * 1000
    write_valid(tmp_path, module=VALID.replace(
        "https://learn.microsoft.com/en-us/training/paths/azure-data-fundamentals-explore-core-data-concepts/", long_url
    ))
    assert any("submodules.0.weeks.0.tasks.0.external_url" in p for p in problems(tmp_path))


def test_submodule_code_fits_its_column(tmp_path):
    write_valid(tmp_path, module=VALID.replace("code: DP-900", "code: " + "C" * 21))
    assert any(p.startswith("ccc602.yaml: submodules.0.code") for p in problems(tmp_path))
```

- [ ] **Step 7: Write the failing seed apply tests**

Replace `backend/tests/test_seed_apply.py`:

```python
from datetime import date

from sqlalchemy import func, select

from app.models import Assessment, Module, Prerequisite, Submodule, SubmodulePrerequisite, Task, Week
from app.seed.__main__ import run
from app.seed.loader import apply_seed
from app.seed.schema import SeedFile, SeedPrerequisite


def seed(weeks=None, assessments=None, module_key="ccc602", submodules=None):
    """A module file. Pass `weeks` for a single submodule, or `submodules` for full control."""
    if submodules is None:
        submodules = [{"key": f"{module_key}-sub", "code": "SUB", "title": "Sub", "weeks": weeks or []}]
    return SeedFile.model_validate({
        "module": {"key": module_key, "code": "CCC602", "title": "Data Engineering", "order": 2},
        "submodules": submodules,
        "assessments": assessments or [],
    })


def sub(key, weeks=(), prerequisites=(), code="SUB"):
    return {"key": key, "code": code, "title": key.upper(), "prerequisites": list(prerequisites), "weeks": list(weeks)}


def week(key, number, tasks=()):
    return {"key": key, "week_number": number, "title": key.upper(), "tasks": list(tasks)}


def task(key, title="T"):
    return {"key": key, "title": title, "type": "learning_path", "external_url": "https://x.test/" + key}


def prereq(key, title=None):
    return SeedPrerequisite.model_validate({"key": key, "title": title or key, "external_url": "https://x.test/" + key})


def count(db, model):
    return db.scalar(select(func.count()).select_from(model))


def links(db):
    """(submodule key, prerequisite key, position) for every link row."""
    return db.execute(
        select(Submodule.key, Prerequisite.key, SubmodulePrerequisite.position)
        .join(Submodule, Submodule.id == SubmodulePrerequisite.submodule_id)
        .join(Prerequisite, Prerequisite.id == SubmodulePrerequisite.prerequisite_id)
        .order_by(Submodule.key, SubmodulePrerequisite.position)
    ).all()


def test_inserts_everything_with_positions(db):
    apply_seed(db, [seed(
        [week("w9", 9, [task("t1"), task("t2")])],
        [{"key": "a3", "title": "A3", "due_date": "2026-10-25"}],
    )])
    module = db.scalars(select(Module)).one()
    assert module.position == 2
    assert [(t.key, t.position) for t in module.weeks[0].tasks] == [("t1", 0), ("t2", 1)]
    assert module.assessments[0].due_date == date(2026, 10, 25)
    assert module.weeks[0].tasks[0].external_url == "https://x.test/t1"


def test_weeks_belong_to_module_and_submodule_in_file_order(db):
    apply_seed(db, [seed(submodules=[
        sub("s1", [week("w1", 1), week("w2", 2)], code="AZ-900"),
        sub("s2", [week("w3", 3)], code="AZ-104"),
    ])])
    module = db.scalars(select(Module)).one()
    assert [(s.key, s.code, s.position) for s in module.submodules] == [("s1", "AZ-900", 0), ("s2", "AZ-104", 1)]
    assert [(w.key, w.position, w.submodule_key) for w in module.weeks] == [("w1", 0, "s1"), ("w2", 1, "s1"), ("w3", 2, "s2")]


def test_shared_prerequisite_is_stored_once_and_linked_in_order(db):
    apply_seed(db, [seed(submodules=[
        sub("s1", [week("w1", 1)], prerequisites=["azure", "skillable"]),
        sub("s2", [week("w2", 2)], prerequisites=["azure"]),
    ])], [prereq("azure", "Azure account"), prereq("skillable")])
    assert count(db, Prerequisite) == 2
    assert links(db) == [("s1", "azure", 0), ("s1", "skillable", 1), ("s2", "azure", 0)]
    assert db.scalars(select(Prerequisite.title).where(Prerequisite.key == "azure")).one() == "Azure account"


def test_rerun_is_idempotent_and_keeps_ids(db):
    data = [seed(submodules=[sub("s1", [week("w9", 9, [task("t1")])], prerequisites=["azure"])])]
    apply_seed(db, data, [prereq("azure")])
    ids = (db.scalar(select(Prerequisite.id)), db.scalar(select(Submodule.id)), db.scalar(select(Task.id)))
    apply_seed(db, data, [prereq("azure")])
    assert (db.scalar(select(Prerequisite.id)), db.scalar(select(Submodule.id)), db.scalar(select(Task.id))) == ids
    assert (count(db, Module), count(db, Submodule), count(db, Week), count(db, Task)) == (1, 1, 1, 1)
    assert links(db) == [("s1", "azure", 0)]


def test_unlinking_keeps_the_prerequisite_and_removing_it_deletes_its_links(db):
    two = [prereq("azure"), prereq("skillable")]
    apply_seed(db, [seed(submodules=[sub("s1", [week("w1", 1)], prerequisites=["azure", "skillable"])])], two)

    apply_seed(db, [seed(submodules=[sub("s1", [week("w1", 1)], prerequisites=["skillable"])])], two)
    assert links(db) == [("s1", "skillable", 0)]
    assert count(db, Prerequisite) == 2

    apply_seed(db, [seed(submodules=[sub("s1", [week("w1", 1)])])], [prereq("azure")])
    assert links(db) == []
    assert db.scalars(select(Prerequisite.key)).all() == ["azure"]


def test_week_moved_to_other_submodule_keeps_its_row(db):
    apply_seed(db, [seed(submodules=[sub("s1", [week("w1", 1), week("w2", 2)]), sub("s2", [])])])
    original_id = db.scalar(select(Week.id).where(Week.key == "w2"))

    apply_seed(db, [seed(submodules=[sub("s1", [week("w1", 1)]), sub("s2", [week("w2", 2)])])])
    moved = db.scalars(select(Week).where(Week.key == "w2")).one()
    assert moved.id == original_id
    assert moved.submodule_key == "s2"


def test_task_moved_to_other_week_keeps_its_row(db):
    apply_seed(db, [seed([week("w9", 9, [task("t1")]), week("w10", 10)])])
    original_id = db.scalars(select(Task.id).where(Task.key == "t1")).one()

    apply_seed(db, [seed([week("w9", 9), week("w10", 10, [task("t1", title="Moved")])])])

    moved = db.scalars(select(Task).where(Task.key == "t1")).one()
    assert moved.id == original_id
    assert moved.week.key == "w10"
    assert moved.title == "Moved"
    assert count(db, Task) == 1


def test_removed_items_are_deleted(db):
    apply_seed(db, [
        seed([week("w9", 9, [task("t1"), task("t2")])], [{"key": "a3", "title": "A3"}]),
        seed([week("x-w1", 1, [task("x1")])], module_key="other"),
    ])
    apply_seed(db, [seed([week("w9", 9, [task("t1")])])])

    assert db.scalars(select(Task.key)).all() == ["t1"]
    assert count(db, Assessment) == 0
    assert db.scalars(select(Module.key)).all() == ["ccc602"]
    assert db.scalars(select(Submodule.key)).all() == ["ccc602-sub"]


def test_removing_a_submodule_removes_its_weeks_and_tasks(db):
    apply_seed(db, [seed(submodules=[sub("s1", [week("w1", 1, [task("t1")])]), sub("s2", [week("w2", 2, [task("t2")])])])])
    apply_seed(db, [seed(submodules=[sub("s2", [week("w2", 2, [task("t2")])])])])
    assert db.scalars(select(Submodule.key)).all() == ["s2"]
    assert db.scalars(select(Week.key)).all() == ["w2"]
    assert db.scalars(select(Task.key)).all() == ["t2"]


def test_removing_one_week_keeps_module_and_other_weeks(db):
    apply_seed(db, [seed([week("w9", 9, [task("t1"), task("t2")]), week("w10", 10, [task("t3")])])])
    apply_seed(db, [seed([week("w10", 10, [task("t3")])])])

    assert db.scalars(select(Module.key)).all() == ["ccc602"]
    assert db.scalars(select(Week.key)).all() == ["w10"]
    assert db.scalars(select(Task.key)).all() == ["t3"]


def test_key_that_changes_type_deletes_the_old_row(db):
    apply_seed(db, [seed([week("w9", 9, [task("shared")])])])
    apply_seed(db, [seed([week("w9", 9), week("shared", 10)])])

    assert db.scalars(select(Task.key)).all() == []
    assert sorted(db.scalars(select(Week.key)).all()) == ["shared", "w9"]


def test_module_uplearn_url_is_stored_and_cleared(db):
    with_link = SeedFile.model_validate({
        "module": {
            "key": "ccc602", "code": "CCC602", "title": "Data Engineering", "order": 2,
            "uplearn_url": "https://yoobee.uplearn.education/course/view.php?id=548",
        }
    })
    apply_seed(db, [with_link])
    assert db.scalars(select(Module.uplearn_url)).one() == "https://yoobee.uplearn.education/course/view.php?id=548"

    apply_seed(db, [seed([])])
    assert db.scalars(select(Module.uplearn_url)).one() is None


def test_task_note_is_stored_and_cleared(db):
    with_note = {**task("t1"), "note": "Training key is in the Teams tutor-only channel."}
    apply_seed(db, [seed([week("w9", 9, [with_note])])])
    assert db.scalars(select(Task.note)).one() == "Training key is in the Teams tutor-only channel."

    apply_seed(db, [seed([week("w9", 9, [task("t1")])])])
    assert db.scalars(select(Task.note)).one() is None


GOOD = (
    "module: {key: ccc602, code: CCC602, title: DE, order: 2}\n"
    "submodules: [{key: ccc602-s, code: S, title: S, prerequisites: [azure], "
    "weeks: [{key: w9, week_number: 9, title: W9}]}]\n"
)
PREREQS = "prerequisites: [{key: azure, title: Azure, external_url: 'https://azure.test'}]\n"


def test_run_with_invalid_files_writes_nothing(db, tmp_path, capsys):
    (tmp_path / "a.yaml").write_text(GOOD, encoding="utf-8")
    (tmp_path / "b.yaml").write_text(GOOD.replace("key: ccc602", "key: other"), encoding="utf-8")
    (tmp_path / "prerequisites.yaml").write_text(PREREQS, encoding="utf-8")

    assert run(tmp_path, db) == 1
    assert count(db, Module) == 0
    assert count(db, Prerequisite) == 0
    assert "duplicate key 'w9'" in capsys.readouterr().err


def test_run_with_valid_files_succeeds(db, tmp_path, capsys):
    (tmp_path / "a.yaml").write_text(GOOD, encoding="utf-8")
    (tmp_path / "prerequisites.yaml").write_text(PREREQS, encoding="utf-8")
    assert run(tmp_path, db) == 0
    assert (count(db, Module), count(db, Submodule), count(db, Prerequisite)) == (1, 1, 1)
    assert links(db) == [("ccc602-s", "azure", 0)]
    assert "Seeded 1 module(s) and 1 prerequisite(s)" in capsys.readouterr().out
```

- [ ] **Step 8: Rewrite the repo seed file tests**

Replace `backend/tests/test_seed_files.py`:

```python
from app.seed.__main__ import DEFAULT_SEED_DIR
from app.seed.loader import load_seed_dir

FORBIDDEN_IN_NOTES = ("http", "calendly", "teams.microsoft", "zoom.us")


def bundle():
    return load_seed_dir(DEFAULT_SEED_DIR)


def modules():
    return {s.module.key: s for s in bundle().modules}


def test_repo_seed_files_are_valid():
    b = bundle()
    assert b.modules, "expected at least one module file"
    assert b.prerequisites, "expected seed/prerequisites.yaml"


def test_every_module_has_submodules():
    assert all(s.submodules for s in bundle().modules)


def test_ccc602_has_portal_link():
    assert str(modules()["ccc602"].module.uplearn_url) == "https://yoobee.uplearn.education/course/view.php?id=548"


def test_ccc602_covers_full_time_weeks_9_to_16():
    weeks = modules()["ccc602"].all_weeks()
    assert [w.week_number for w in weeks] == list(range(9, 17))
    assert all(w.tasks for w in weeks), "every week should list at least one task"


def test_notes_point_to_access_without_secrets():
    b = bundle()
    tasks = {t.key: t for s in b.modules for w in s.all_weeks() for t in w.tasks}
    prereqs = {p.key: p for p in b.prerequisites}
    assert "AWS Academy" in tasks["ccc602-w13-dea-lab-athena"].note
    assert "AWS Academy" in tasks["ccc603-w18-lab-kms"].note
    assert "Teams tutor-only channel" in prereqs["skillable-dp900"].note

    notes = [t.note for t in tasks.values()] + [p.note for p in prereqs.values()]
    for note in filter(None, notes):
        assert not any(s in note.lower() for s in FORBIDDEN_IN_NOTES), note
```

- [ ] **Step 9: Run to verify they fail**

Run: `uv run pytest tests/test_seed_validation.py tests/test_seed_apply.py tests/test_seed_files.py -q`
Expected: FAIL (e.g. `ImportError: cannot import name 'SeedPrerequisite'`).

- [ ] **Step 10: Implement the seed schema**

Replace `backend/app/seed/schema.py`:

```python
from datetime import date
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, HttpUrl, StringConstraints, model_validator

# Limits mirror the column sizes in app/models.py; a value that passes here always fits the database.
Key = Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=100)]
Code = Annotated[str, StringConstraints(min_length=1, max_length=20)]
ShortTitle = Annotated[str, StringConstraints(min_length=1, max_length=200, strip_whitespace=True)]
Title = Annotated[str, StringConstraints(min_length=1, max_length=300, strip_whitespace=True)]
Note = Annotated[str, StringConstraints(min_length=1, max_length=300, strip_whitespace=True)]
TaskType = Literal["learning_path", "lab", "assessment_step"]


def _fits_url_column(url: HttpUrl) -> HttpUrl:
    if len(str(url)) > 1000:
        raise ValueError("URL is longer than 1000 characters")
    return url


Url = Annotated[HttpUrl, AfterValidator(_fits_url_column)]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class _Linked(_Strict):
    """Something the student goes and does somewhere else, so it needs at least one link."""

    external_url: Url | None = None
    uplearn_url: Url | None = None

    @model_validator(mode="after")
    def needs_a_link(self):
        if self.external_url is None and self.uplearn_url is None:
            raise ValueError("needs external_url or uplearn_url")
        return self


class SeedTask(_Linked):
    key: Key
    title: Title
    type: TaskType
    note: Note | None = None


class SeedWeek(_Strict):
    key: Key
    week_number: int = Field(ge=1)
    title: ShortTitle
    tasks: list[SeedTask] = []


class SeedSubmodule(_Strict):
    key: Key
    code: Code
    title: Title
    uplearn_url: Url | None = None
    prerequisites: list[Key] = []
    weeks: list[SeedWeek] = []

    @model_validator(mode="after")
    def check_lists(self) -> "SeedSubmodule":
        if len(set(self.prerequisites)) != len(self.prerequisites):
            raise ValueError("a prerequisite is listed more than once")
        numbers = [w.week_number for w in self.weeks]
        if numbers and numbers != list(range(numbers[0], numbers[0] + len(numbers))):
            raise ValueError(f"weeks must be consecutive and ascending (got {numbers})")
        return self


class SeedModule(_Strict):
    key: Key
    code: Code
    title: ShortTitle
    order: int
    uplearn_url: Url | None = None


class SeedAssessment(_Strict):
    key: Key
    title: Title
    due_date: date | None = None
    uplearn_url: Url | None = None


class SeedFile(_Strict):
    """One module file: seed/<module>.yaml."""

    module: SeedModule
    submodules: list[SeedSubmodule] = []
    assessments: list[SeedAssessment] = []

    @model_validator(mode="after")
    def unique_week_numbers(self) -> "SeedFile":
        seen: set[int] = set()
        for week in self.all_weeks():
            if week.week_number in seen:
                raise ValueError(f"week_number {week.week_number} is used by more than one week")
            seen.add(week.week_number)
        return self

    def all_weeks(self) -> list[SeedWeek]:
        return [week for sub in self.submodules for week in sub.weeks]

    def keys(self) -> list[str]:
        out = [self.module.key]
        for sub in self.submodules:
            out.append(sub.key)
            for week in sub.weeks:
                out.append(week.key)
                out.extend(task.key for task in week.tasks)
        out.extend(a.key for a in self.assessments)
        return out


class SeedPrerequisite(_Linked):
    key: Key
    title: Title
    note: Note | None = None


class SeedPrerequisiteFile(_Strict):
    """seed/prerequisites.yaml: shared one-off setup steps, referenced by key from submodules."""

    prerequisites: list[SeedPrerequisite] = []

    def keys(self) -> list[str]:
        return [p.key for p in self.prerequisites]
```

- [ ] **Step 11: Implement the loader**

Replace `backend/app/seed/loader.py`:

```python
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

import yaml
from pydantic import BaseModel, ValidationError
from sqlalchemy import delete, insert, select
from sqlalchemy.orm import Session

from app.models import Assessment, Module, Prerequisite, Submodule, SubmodulePrerequisite, Task, Week
from app.seed.schema import SeedFile, SeedPrerequisite, SeedPrerequisiteFile

PREREQUISITES_FILE = "prerequisites.yaml"


class SeedError(Exception):
    def __init__(self, problems: list[str]):
        self.problems = problems
        super().__init__("\n".join(problems))


@dataclass
class SeedBundle:
    modules: list[SeedFile]
    prerequisites: list[SeedPrerequisite]


def _parse(file: Path, schema: type[BaseModel], problems: list[str]) -> BaseModel | None:
    try:
        return schema.model_validate(yaml.safe_load(file.read_text(encoding="utf-8")))
    except yaml.YAMLError as e:
        problems.append(f"{file.name}: invalid YAML: {e}")
    except ValidationError as e:
        for err in e.errors():
            loc = ".".join(str(part) for part in err["loc"])
            problems.append(f"{file.name}: {loc}: {err['msg']}")
    return None


def load_seed_dir(path: Path) -> SeedBundle:
    """Parse and validate seed/prerequisites.yaml and every module file in `path`.

    Raises SeedError listing every problem, so nothing is written unless everything is valid."""
    files = sorted(path.glob("*.yaml"))
    if not files:
        raise SeedError([f"no .yaml files in {path}"])
    module_files = [f for f in files if f.name != PREREQUISITES_FILE]
    if not module_files:
        raise SeedError([f"no module files in {path} (only {PREREQUISITES_FILE})"])

    problems: list[str] = []
    prereq_path = path / PREREQUISITES_FILE
    prereq_file: SeedPrerequisiteFile | None = None
    prereqs_ok = True
    if prereq_path.exists():
        prereq_file = _parse(prereq_path, SeedPrerequisiteFile, problems)
        prereqs_ok = prereq_file is not None
    modules = [(f.name, seed) for f in module_files if (seed := _parse(f, SeedFile, problems)) is not None]

    named: list[tuple[str, SeedFile | SeedPrerequisiteFile]] = list(modules)
    if prereq_file is not None:
        named.insert(0, (PREREQUISITES_FILE, prereq_file))
    seen: dict[str, str] = {}
    for name, seed in named:
        for key in seed.keys():
            if key in seen:
                problems.append(f"{name}: duplicate key '{key}' (also in {seen[key]})")
            else:
                seen[key] = name

    # Only check references when the prerequisites file itself was readable; otherwise every one would fail.
    if prereqs_ok:
        known = set(prereq_file.keys()) if prereq_file else set()
        for name, seed in modules:
            for i, sub in enumerate(seed.submodules):
                for key in sub.prerequisites:
                    if key not in known:
                        problems.append(
                            f"{name}: submodules.{i}.prerequisites: unknown prerequisite '{key}' "
                            f"(submodule {sub.key}; define it in {PREREQUISITES_FILE})"
                        )

    if problems:
        raise SeedError(problems)
    return SeedBundle([seed for _, seed in modules], prereq_file.prerequisites if prereq_file else [])


def _url(value) -> str | None:
    return str(value) if value else None


def apply_seed(session: Session, seeds: list[SeedFile], prerequisites: Sequence[SeedPrerequisite] = ()) -> None:
    """Upsert all seed content by key, then delete anything no longer in the seed files.

    Rows keep their ids across re-seeds, so anything per-user that points at a task or prerequisite survives."""
    models = (Prerequisite, Module, Submodule, Week, Task, Assessment)
    existing = {model: {row.key: row for row in session.scalars(select(model))} for model in models}
    kept: dict[type, set[str]] = {model: set() for model in models}

    def upsert(model, key):
        row = existing[model].get(key)
        if row is None:
            row = existing[model][key] = model(key=key)
            session.add(row)
        kept[model].add(key)
        return row

    for sp in prerequisites:
        prereq = upsert(Prerequisite, sp.key)
        prereq.title, prereq.note = sp.title, sp.note
        prereq.external_url, prereq.uplearn_url = _url(sp.external_url), _url(sp.uplearn_url)

    wanted_links: list[tuple[Submodule, str, int]] = []
    for seed in seeds:
        sm = seed.module
        module = upsert(Module, sm.key)
        module.code, module.title, module.position = sm.code, sm.title, sm.order
        module.uplearn_url = _url(sm.uplearn_url)

        week_position = 0  # module-wide, so the flat week list comes out in submodule order
        for s_pos, ss in enumerate(seed.submodules):
            submodule = upsert(Submodule, ss.key)
            submodule.module = module
            submodule.code, submodule.title, submodule.position = ss.code, ss.title, s_pos
            submodule.uplearn_url = _url(ss.uplearn_url)
            wanted_links += [(submodule, key, pos) for pos, key in enumerate(ss.prerequisites)]

            for sw in ss.weeks:
                week = upsert(Week, sw.key)
                week.module, week.submodule = module, submodule
                week.week_number, week.title, week.position = sw.week_number, sw.title, week_position
                week_position += 1

                for t_pos, st in enumerate(sw.tasks):
                    task = upsert(Task, st.key)
                    task.week = week
                    task.title, task.type, task.position = st.title, st.type, t_pos
                    task.external_url, task.uplearn_url = _url(st.external_url), _url(st.uplearn_url)
                    task.note = st.note

        for sa in seed.assessments:
            assessment = upsert(Assessment, sa.key)
            assessment.module = module
            assessment.title, assessment.due_date = sa.title, sa.due_date
            assessment.uplearn_url = _url(sa.uplearn_url)

    session.flush()

    # One statement per table: rows under a removed parent go with it via ON DELETE CASCADE.
    for model in (Module, Submodule, Week, Task, Assessment, Prerequisite):
        session.execute(
            delete(model).where(model.key.not_in(list(kept[model]))).execution_options(synchronize_session=False)
        )

    # Links carry no per-user data, so rebuild them from the seed files every time.
    session.execute(delete(SubmodulePrerequisite))
    rows = [
        {"submodule_id": sub.id, "prerequisite_id": existing[Prerequisite][key].id, "position": pos}
        for sub, key, pos in wanted_links
    ]
    if rows:
        session.execute(insert(SubmodulePrerequisite), rows)
    session.flush()
    # Bulk deletes bypass the identity map; drop cached state so later reads see the database.
    session.expire_all()
```

`load_seed_dir` makes sure every linked key exists. If `apply_seed` is called directly with a link to a prerequisite it wasn't given, `existing[Prerequisite][key]` raises `KeyError`. That's a programming error, not a seed-file error, so leaving it as a crash is fine.

- [ ] **Step 12: Update the CLI**

In `backend/app/seed/__main__.py`, change `run`:

```python
def run(seed_dir: Path, session: Session) -> int:
    try:
        bundle = load_seed_dir(seed_dir)
    except SeedError as e:
        print("Seed validation failed; nothing was written:", file=sys.stderr)
        for problem in e.problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1
    apply_seed(session, bundle.modules, bundle.prerequisites)
    print(f"Seeded {len(bundle.modules)} module(s) and {len(bundle.prerequisites)} prerequisite(s) from {seed_dir}")
    return 0
```

- [ ] **Step 13: Run all backend tests**

Run: `uv run pytest`
Expected: all PASS, including `test_seed_files.py` against the real seed files and `test_migrations.py` against migration 0005.

- [ ] **Step 14: Apply to dev and re-seed**

Migration 0005 clears the content tables on dev (there are no user tables yet), so re-seed straight after.

Run: `uv run alembic upgrade head`, then `uv run python -m app.seed`, then `uv run alembic check`
Expected: upgrade `0003 -> 0004 -> 0005`; `Seeded 3 module(s) and 12 prerequisite(s) from …`; `No new upgrade operations detected.`

- [ ] **Step 15: Commit**

```bash
git add backend/app/models.py backend/alembic/versions/0005_submodules_prerequisites.py backend/app/seed/schema.py backend/app/seed/loader.py backend/app/seed/__main__.py backend/tests/test_models.py backend/tests/test_seed_validation.py backend/tests/test_seed_apply.py backend/tests/test_seed_files.py backend/tests/test_modules_api.py
git commit -m "feat(seed): submodules and shared prerequisites in the database and loader"
```

---

### Task 3: API — submodules on the module endpoints

**Files:**
- Modify: `backend/app/api/schemas.py`, `backend/app/api/modules.py`
- Test: `backend/tests/test_modules_api.py`

**Interfaces:**
- Consumes: `Submodule`, `SubmodulePrerequisite`, `Week.submodule_key` (Task 2).
- Produces:
  - `GET /api/modules` items gain `submodule_count: int`
  - `GET /api/modules/{key}` gains `submodules: [{key, code, title, uplearn_url, first_week, last_week, prerequisites: [{key, title, note, external_url, uplearn_url}]}]` in submodule order. Each week gains `submodule_key`. `first_week` and `last_week` are `null` when a submodule has no weeks.

- [ ] **Step 1: Write the failing tests**

In `backend/tests/test_modules_api.py`:
- In `test_list_modules_in_order_with_counts`, add `"submodule_count": 0` to the `ccc601` dict and `"submodule_count": 2` to the `ccc602` dict.
- Append:

```python
def test_module_detail_lists_submodules_with_prerequisites(client, db):
    add_content(db)
    body = client.get("/api/modules/ccc602").json()
    assert body["submodules"] == [
        {
            "key": "dp900", "code": "DP-900", "title": "Azure Data Fundamentals",
            "uplearn_url": "https://up.test/dp900", "first_week": 9, "last_week": 9,
            "prerequisites": [{
                "key": "azure-account", "title": "Create an Azure account", "note": "Personal email",
                "external_url": "https://azure.test", "uplearn_url": None,
            }],
        },
        {
            "key": "dea", "code": "DEA-C01", "title": "AWS Data Engineer",
            "uplearn_url": None, "first_week": 10, "last_week": 10, "prerequisites": [],
        },
    ]
    assert [(w["key"], w["submodule_key"]) for w in body["weeks"]] == [("w9", "dp900"), ("w10", "dea")]


def test_submodule_without_weeks_has_no_week_range(client, db):
    db.add(Module(key="m", code="M", title="M", position=1, submodules=[
        Submodule(key="empty", code="E", title="Empty", position=0),
    ]))
    db.flush()
    db.expire_all()
    [sub] = client.get("/api/modules/m").json()["submodules"]
    assert (sub["first_week"], sub["last_week"]) == (None, None)
```

- [ ] **Step 2: Run to verify they fail**

Run: `uv run pytest tests/test_modules_api.py -v`
Expected: FAIL (`submodule_count` and `submodules` are missing).

- [ ] **Step 3: Schemas**

In `backend/app/api/schemas.py`:
- `ModuleSummary`: add `submodule_count: int`
- `WeekOut`: add `submodule_key: str`
- Add before `ModuleDetail`:

```python
class PrerequisiteOut(_Out):
    key: str
    title: str
    note: str | None
    external_url: str | None
    uplearn_url: str | None


class SubmoduleOut(BaseModel):
    key: str
    code: str
    title: str
    uplearn_url: str | None
    first_week: int | None
    last_week: int | None
    prerequisites: list[PrerequisiteOut]
```

- `ModuleDetail`: add `submodules: list[SubmoduleOut]`

- [ ] **Step 4: Routes**

Replace `backend/app/api/modules.py`:

```python
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.schemas import AssessmentOut, ModuleDetail, ModuleSummary, PrerequisiteOut, SubmoduleOut, WeekOut
from app.db import get_db
from app.models import Module, Submodule, SubmodulePrerequisite, Week

router = APIRouter(prefix="/modules", tags=["modules"])


@router.get("", response_model=list[ModuleSummary])
def list_modules(db: Session = Depends(get_db)) -> list[ModuleSummary]:
    modules = db.scalars(
        select(Module)
        .options(selectinload(Module.weeks).selectinload(Week.tasks), selectinload(Module.submodules))
        .order_by(Module.position)
    ).all()
    return [
        ModuleSummary(
            key=m.key,
            code=m.code,
            title=m.title,
            submodule_count=len(m.submodules),
            week_count=len(m.weeks),
            task_count=sum(len(w.tasks) for w in m.weeks),
            uplearn_url=m.uplearn_url,
        )
        for m in modules
    ]


def _submodule_out(sub: Submodule) -> SubmoduleOut:
    numbers = [w.week_number for w in sub.weeks]
    return SubmoduleOut(
        key=sub.key,
        code=sub.code,
        title=sub.title,
        uplearn_url=sub.uplearn_url,
        first_week=min(numbers, default=None),
        last_week=max(numbers, default=None),
        prerequisites=[PrerequisiteOut.model_validate(link.prerequisite) for link in sub.prerequisite_links],
    )


@router.get("/{key}", response_model=ModuleDetail)
def get_module(key: str, db: Session = Depends(get_db)) -> ModuleDetail:
    module = db.scalars(
        select(Module)
        .where(Module.key == key)
        .options(
            selectinload(Module.weeks).selectinload(Week.tasks),
            selectinload(Module.submodules).selectinload(Submodule.weeks),
            selectinload(Module.submodules)
            .selectinload(Submodule.prerequisite_links)
            .selectinload(SubmodulePrerequisite.prerequisite),
            selectinload(Module.assessments),
        )
    ).one_or_none()
    if module is None:
        raise HTTPException(status_code=404, detail="Module not found")
    assessments = sorted(
        (AssessmentOut.model_validate(a) for a in module.assessments),
        key=lambda a: (a.due_date is None, a.due_date or date.max, a.title),
    )
    return ModuleDetail(
        key=module.key,
        code=module.code,
        title=module.title,
        uplearn_url=module.uplearn_url,
        submodules=[_submodule_out(s) for s in module.submodules],
        weeks=[WeekOut.model_validate(w) for w in module.weeks],
        assessments=assessments,
    )
```

(`Week.submodule_key` reads `week.submodule`. That submodule is already loaded by `Module.submodules → Submodule.weeks`, so the lookup comes from the session's identity map and doesn't run another query.)

- [ ] **Step 5: Run tests**

Run: `uv run pytest`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/schemas.py backend/app/api/modules.py backend/tests/test_modules_api.py
git commit -m "feat(api): submodules, week submodule keys and prerequisites on module endpoints"
```

---

### Task 4: Frontend — timeline grouped by submodule, "Before you start" box

**Files:**
- Modify: `frontend/src/api.ts`, `frontend/src/format.ts`, `frontend/src/format.test.ts`, `frontend/src/components/ExternalLink.tsx`, `frontend/src/components/module/WeekTimeline.tsx`, `frontend/src/pages/ModulePage.tsx`, `frontend/src/index.css`
- Create: `frontend/src/components/module/PrerequisiteBox.tsx`
- Test: `frontend/src/pages/ModulePage.test.tsx`

**Interfaces:**
- Consumes: the Task 3 API.
- Produces:
  - `api.ts`: `Prerequisite`, `Submodule`, `Week.submodule_key`, `ModuleDetail.submodules`, `ModuleSummary.submodule_count`
  - `format.ts`: `weekRange(first: number, last: number): string` → `"Week 9"` / `"Weeks 10–12"` (`weekSummary` now uses it)
  - `ExternalLink` takes an optional `label?: string` (sets `aria-label`). Phase 2 relies on it.
  - `WeekTimeline({ weeks, submodules })`: one `<section>` (region) per submodule, named by its `<h3>` `"<code> · <title>"`. Week headings become `<h4>`. Weeks whose `submodule_key` matches no submodule go in a final group with no heading.
  - `PrerequisiteBox({ submodule })` renders nothing when the submodule has no prerequisites.

- [ ] **Step 1: Write the failing tests**

In `frontend/src/format.test.ts` append (and add `weekRange` to the import from `./format`):

```ts
describe('weekRange', () => {
  it('names one week or a range', () => {
    expect(weekRange(9, 9)).toBe('Week 9')
    expect(weekRange(10, 12)).toBe('Weeks 10–12')
  })
})
```

(If `describe` isn't imported in that file yet, add it to the `vitest` import.)

In `frontend/src/pages/ModulePage.test.tsx`:
- Add `submodule_key: 'dp900'` to week `ccc602-w09` and `submodule_key: 'dp203'` to week `ccc602-w10` in `detail`. Add this to `detail`:

```ts
const azure = {
  key: 'azure-account',
  title: 'Create an Azure account',
  note: 'Use a personal email.',
  external_url: 'https://azure.test/free',
  uplearn_url: 'https://up.test/how-azure',
}
```

(declare it above `detail`) and inside `detail`:

```ts
  submodules: [
    {
      key: 'dp900',
      code: 'DP-900',
      title: 'Azure Data Fundamentals',
      uplearn_url: 'https://up.test/dp900',
      first_week: 9,
      last_week: 9,
      prerequisites: [
        azure,
        { key: 'skillable-dp900', title: 'Register for the DP-900 Skillable class', note: null, external_url: null, uplearn_url: 'https://up.test/how-skillable' },
      ],
    },
    { key: 'dp203', code: 'DP-203', title: 'Azure Data Engineer', uplearn_url: null, first_week: 10, last_week: 10, prerequisites: [azure] },
  ],
```

- In `frontend/src/components/Sidebar.test.tsx`, add `submodules: []` to the `detail` fixture. Every module detail now has a `submodules` list.
- Append these tests inside the `describe`:

```tsx
  it('groups weeks under submodule headings with their week range', async () => {
    const main = await open()
    const dp900 = within(main).getByRole('region', { name: 'DP-900 · Azure Data Fundamentals' })
    expect(dp900.querySelector('.submodule-head')).toHaveTextContent('Week 9')
    expect(within(dp900).getByRole('button', { name: /Week 9/ })).toBeInTheDocument()
    expect(within(dp900).queryByRole('button', { name: /Week 10/ })).toBeNull()
    expect(within(dp900).getByRole('link', { name: 'DP-900 on UPLearn' })).toHaveAttribute('href', 'https://up.test/dp900')

    const dp203 = within(main).getByRole('region', { name: 'DP-203 · Azure Data Engineer' })
    expect(within(dp203).getByRole('button', { name: /Week 10/ })).toBeInTheDocument()
    expect(within(dp203).queryByRole('link', { name: /on UPLearn/ })).toBeNull()
  })

  it('shows a Before you start box with links for each prerequisite', async () => {
    const main = await open()
    const dp900 = within(main).getByRole('region', { name: 'DP-900 · Azure Data Fundamentals' })
    expect(within(dp900).getByRole('heading', { name: 'Before you start' })).toBeInTheDocument()

    const azureItem = within(dp900).getByText('Create an Azure account').closest('li')!
    expect(within(azureItem).getByText('Use a personal email.')).toBeInTheDocument()
    const doIt = within(azureItem).getByRole('link', { name: 'Do it: Create an Azure account' })
    expect(doIt).toHaveAttribute('href', 'https://azure.test/free')
    expect(doIt).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(azureItem).getByRole('link', { name: 'Watch the guide: Create an Azure account' })).toHaveAttribute(
      'href',
      'https://up.test/how-azure',
    )

    const skillable = within(dp900).getByText('Register for the DP-900 Skillable class').closest('li')!
    expect(within(skillable).queryByRole('link', { name: /^Do it/ })).toBeNull()
    expect(within(skillable).getByRole('link', { name: /^Watch the guide/ })).toBeInTheDocument()
  })

  it('shows a shared prerequisite under every submodule that uses it', async () => {
    const main = await open()
    expect(within(main).getAllByText('Create an Azure account')).toHaveLength(2)
  })

  it('leaves out the box when a submodule has no prerequisites', async () => {
    const main = await open({ ...detail, submodules: [detail.submodules[0], { ...detail.submodules[1], prerequisites: [] }] })
    const dp203 = within(main).getByRole('region', { name: 'DP-203 · Azure Data Engineer' })
    expect(within(dp203).queryByRole('heading', { name: 'Before you start' })).toBeNull()
  })

  it('still shows weeks whose submodule is missing from the list', async () => {
    const main = await open({ ...detail, submodules: [detail.submodules[0]] })
    expect(within(main).getByRole('button', { name: /Week 10/ })).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test`
Expected: the new tests FAIL (no regions, no box, no `weekRange`).

- [ ] **Step 3: Types and helpers**

In `frontend/src/api.ts`:
- `ModuleSummary`: add `submodule_count: number`
- `Week`: add `submodule_key: string`
- Add:

```ts
export interface Prerequisite {
  key: string
  title: string
  note: string | null
  external_url: string | null
  uplearn_url: string | null
}

export interface Submodule {
  key: string
  code: string
  title: string
  uplearn_url: string | null
  first_week: number | null
  last_week: number | null
  prerequisites: Prerequisite[]
}
```

- `ModuleDetail`: add `submodules: Submodule[]`

In `frontend/src/format.ts` add and use:

```ts
export function weekRange(first: number, last: number): string {
  return first === last ? `Week ${first}` : `Weeks ${first}–${last}`
}

export function weekSummary(weekNumbers: number[], taskCount: number): string {
  if (weekNumbers.length === 0) return 'No weeks yet'
  const range = weekRange(Math.min(...weekNumbers), Math.max(...weekNumbers))
  return `${range} · ${plural(weekNumbers.length, 'week')} · ${plural(taskCount, 'task')}`
}
```

`frontend/src/components/ExternalLink.tsx`:

```tsx
export function ExternalLink({ href, children, label }: { href: string; children: string; label?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
      {children}
    </a>
  )
}
```

- [ ] **Step 4: Prerequisite box**

Create `frontend/src/components/module/PrerequisiteBox.tsx`:

```tsx
import type { Submodule } from '../../api'
import { ExternalLink } from '../ExternalLink'

/** One-off setup steps for a submodule. Shown for guidance only; never part of progress. */
export function PrerequisiteBox({ submodule }: { submodule: Submodule }) {
  if (submodule.prerequisites.length === 0) return null
  return (
    <div className="prereq-box">
      <h4>Before you start</h4>
      <ul className="prereq-list">
        {submodule.prerequisites.map((p) => (
          <li key={p.key} className="prereq-item">
            <span className="task-main">
              <span className="prereq-title">{p.title}</span>
              {p.note && <span className="task-note">{p.note}</span>}
            </span>
            <span className="task-links">
              {p.external_url && (
                <ExternalLink href={p.external_url} label={`Do it: ${p.title}`}>
                  Do it
                </ExternalLink>
              )}
              {p.uplearn_url && (
                <ExternalLink href={p.uplearn_url} label={`Watch the guide: ${p.title}`}>
                  Watch the guide
                </ExternalLink>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 5: Group the timeline**

In `frontend/src/components/module/WeekTimeline.tsx`:
- Imports: `import type { Submodule, Task, TaskType, Week } from '../../api'`, `import { plural, weekRange } from '../../format'`, `import { PrerequisiteBox } from './PrerequisiteBox'`.
- In `WeekCard`, change `<h3 className="week-heading">` / `</h3>` to `<h4 className="week-heading">` / `</h4>`.
- Replace `WeekTimeline` with:

```tsx
interface WeekGroup {
  submodule: Submodule | null
  weeks: Week[]
}

/** Weeks grouped by submodule, in submodule order. Weeks with an unknown submodule go in a last, unnamed group. */
function groupWeeks(weeks: Week[], submodules: Submodule[]): WeekGroup[] {
  const known = new Set(submodules.map((s) => s.key))
  const groups: WeekGroup[] = submodules.map((s) => ({ submodule: s, weeks: weeks.filter((w) => w.submodule_key === s.key) }))
  const orphans = weeks.filter((w) => !known.has(w.submodule_key))
  if (orphans.length > 0) groups.push({ submodule: null, weeks: orphans })
  return groups
}

function SubmoduleHead({ submodule }: { submodule: Submodule }) {
  const { first_week: first, last_week: last } = submodule
  return (
    <header className="submodule-head">
      <h3 id={`submodule-${submodule.key}`}>
        <span className="mono">{submodule.code}</span> · {submodule.title}
      </h3>
      {first !== null && last !== null && <span className="small muted">{weekRange(first, last)}</span>}
      {submodule.uplearn_url && (
        <ExternalLink href={submodule.uplearn_url} label={`${submodule.code} on UPLearn`}>
          UPLearn
        </ExternalLink>
      )}
    </header>
  )
}

export function WeekTimeline({ weeks, submodules }: { weeks: Week[]; submodules: Submodule[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const toggle = (key: string) => setOpenKey(openKey === key ? null : key)
  return (
    <section className="timeline" aria-labelledby="timeline-heading">
      <div className="section-head">
        <h2 id="timeline-heading">Weekly timeline</h2>
        <span className="small muted">Select a week to see its tasks</span>
      </div>
      {weeks.length === 0 && submodules.length === 0 ? (
        <p className="muted">No weeks listed yet.</p>
      ) : (
        groupWeeks(weeks, submodules).map((group) => (
          <section
            key={group.submodule?.key ?? 'other'}
            className="submodule"
            aria-labelledby={group.submodule ? `submodule-${group.submodule.key}` : undefined}
          >
            {group.submodule && <SubmoduleHead submodule={group.submodule} />}
            {group.submodule && <PrerequisiteBox submodule={group.submodule} />}
            {group.weeks.length > 0 && (
              <ol className="timeline-list">
                {group.weeks.map((week, i) => (
                  <WeekCard
                    key={week.key}
                    week={week}
                    open={openKey === week.key}
                    isLast={i === group.weeks.length - 1}
                    onToggle={() => toggle(week.key)}
                  />
                ))}
              </ol>
            )}
          </section>
        ))
      )}
    </section>
  )
}
```

In `frontend/src/pages/ModulePage.tsx` pass the submodules: `<WeekTimeline key={mod.key} weeks={mod.weeks} submodules={mod.submodules} />`.

- [ ] **Step 6: Styles**

In `frontend/src/index.css` change `.week-heading { font: inherit; }` to `.week-heading { font: inherit; margin: 0; }` and append:

```css
/* Submodules and prerequisites */
.submodule { display: flex; flex-direction: column; gap: 12px; }
.submodule + .submodule { margin-top: 20px; }
.submodule-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 12px; }
.submodule-head h3 { font-size: 17px; font-weight: 600; }
.submodule-head a { display: inline-flex; align-items: center; min-height: 44px; font-size: 14px; font-weight: 500; }
.prereq-box { padding: 14px 18px; border-radius: 12px; background: var(--accent-tint); border: 1px solid var(--accent-line); }
.prereq-box h4 { margin: 0 0 4px; font-family: var(--font-body); font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent-strong); }
.prereq-list { list-style: none; margin: 0; padding: 0; }
.prereq-item { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 14px; padding: 6px 0; }
.prereq-item + .prereq-item { border-top: 1px solid var(--accent-line); }
.prereq-title { font-weight: 500; }
```

- [ ] **Step 7: Run all frontend checks**

Run: `npm test`, then `npm run build`, then `npm run lint`
Expected: all PASS, clean.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/Sidebar.test.tsx frontend/src/api.ts frontend/src/format.ts frontend/src/format.test.ts frontend/src/components/ExternalLink.tsx frontend/src/components/module/PrerequisiteBox.tsx frontend/src/components/module/WeekTimeline.tsx frontend/src/pages/ModulePage.tsx frontend/src/pages/ModulePage.test.tsx frontend/src/index.css
git commit -m "feat(frontend): group the timeline by submodule with a Before you start box"
```

---

### Task 5: Docs and end-to-end check

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md**

- Status line: `Status: Phase 1 done + UI redesign + submodules — CCC601–603 browsable locally, grouped by certification track with shared prerequisites; no accounts or ticking yet.`
- In "Stack and layout", change `- \`seed/\`: YAML content files, one per module, loaded by a CLI seed loader.` to `- \`seed/\`: YAML content files, one per module plus \`prerequisites.yaml\` (shared one-off setup steps), loaded by a CLI seed loader.`
- Change `Structure is **Module → Week → Task**, one tick per task.` to `Structure is **Module → Submodule (certification track) → Week → Task**, one tick per task. Submodules list shared prerequisites by key; prerequisites are never counted in progress.`
- Under the backend commands bullet list, add: `- Migration 0005 clears content tables; re-run the seed loader after upgrading an older database.`

- [ ] **Step 2: Full verification**

Run in `backend/`: `uv run pytest`, then `uv run alembic check`
Run in `frontend/`: `npm test`, then `npm run build`, then `npm run lint`
Expected: all PASS / clean.

- [ ] **Step 3: Try it in the browser**

Start the backend (`uv run uvicorn app.main:app --reload`) and the frontend (`npm run dev`). Don't kill anything on port 5173; use whatever port Vite prints. Check that:
1. CCC601 shows four groups (CLF-C02, SAA-C03, AZ-900, AZ-104), each with a week range and a "Before you start" box.
2. "Create an Azure free account" appears under both AZ-900 and AZ-104, with "Do it" and "Watch the guide" links that open in a new tab.
3. CCC603's Fortinet group shows weeks 19–24, including week 20 (Assessment 5).
4. Weeks still open one at a time across groups.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: submodules and prerequisites in CLAUDE.md"
```

---

## After this plan

Revise the Phase 2 plan (`docs/superpowers/plans/2026-10-16-phase-2-accounts-and-ticking.md`) before running it:
- Drop its Task 1 (done here) and the duplicate-week and column-length parts of its Task 2 (also done here).
- Renumber its migrations from `0006`.
- Add `prerequisite_completions` (user_id, prerequisite_id, completed_at; primary key on the pair), the `PUT`/`DELETE /api/prerequisites/{key}/complete` endpoints, a `completed` flag on each prerequisite in module detail, and tick boxes in `PrerequisiteBox`. These stay separate from task progress.
- Update its fixtures for `submodule_key`, `submodules` and `submodule_count`. `ExternalLink` already has `label`.
