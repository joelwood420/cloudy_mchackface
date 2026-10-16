# Phase 2: Accounts and Ticking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Students sign up with email and password, tick tasks and prerequisites off, pick their current week, and see real progress bars for each week, each module and the whole programme.

**Architecture:** FastAPI gains `users`, `sessions`, `task_completions`, `prerequisite_completions` and `user_settings` tables, an `app/auth` package (argon2 passwords, hashed session tokens in an HTTP-only cookie, an in-memory rate limiter) and new `/auth`, `/me`, `/tasks` and `/prerequisites` routes. The module routes now need a login and return each user's ticks and counts. Progress is worked out from task ticks on every request and never stored. Prerequisite ticks are kept separately and never count. The React app puts every page except log in and sign up behind a `RequireAuth` route. Ticks are applied to the cached module straight away and rolled back if the server says no. Ticked prerequisites disappear from every "Before you start" box that shares them. A Settings page sets the current week.

**Tech Stack:** FastAPI, SQLAlchemy 2, Alembic, argon2-cffi, pytest on a Neon test branch; React 19, TanStack Query 5, React Router 7, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-15-yoobee-study-guide-design.md` (phase 2), `docs/superpowers/specs/2026-10-16-submodules-prerequisites-handoff.md` (prerequisite ticking), UI per `docs/superpowers/specs/2026-10-15-ui-redesign-design.md`.

**Starting point (already on `main`):**
- Structure is Module → Submodule → Week → Task, with shared prerequisites. Migrations go up to `0005`.
- The metadata naming convention is in place: constraint names match Postgres defaults, and check constraints must be given a `name`.
- FK indexes exist, and `tests/test_migrations.py` compares migrations with models and checks every FK is indexed.
- Seed checks cover column lengths and duplicate week numbers.
- `ExternalLink` takes an optional `label`.
- `WeekTimeline({ weeks, submodules })` groups weeks under submodule headings, each with a `PrerequisiteBox`.

## Global Constraints

- Work on branch `phase-2` in the worktree `.claude/worktrees/phase-2`. It's already created from `main`, and `backend/.env` is already copied. Run `uv sync` and `npm install` there first. Merge or push only when the owner says so.
- Migrations: this plan adds only `0006` (`down_revision = "0005"`).
- Passwords hashed with argon2; minimum length 10 (we also cap it at 256 so huge inputs aren't hashed).
- Sessions: random token in an HTTP-only, SameSite=Lax cookie; only a SHA-256 hash of the token is stored; sessions expire after 30 days.
- Login and signup are rate-limited per IP and per email.
- Auth errors don't reveal whether an email is registered (login gives the same 401 for an unknown email and a wrong password). Signup with a taken email returns 409 with a generic message, as the spec says.
- Email is stored lowercased (and trimmed).
- API errors: 401 not logged in, 404 unknown key, 409 email taken on signup, 422 invalid input, 429 rate-limited.
- Every route needs a login except `/api/health`, `/api/auth/signup`, `/api/auth/login` and `/api/auth/logout`. Module reads need a login from now on.
- Progress is computed from task completions, never stored. An empty week or module shows 0%. Progress only reaches 100% when everything is done, so round down.
- Prerequisite ticks live in their own table and are **never** counted in any progress bar or count.
- `study_mode` stays a per-user setting (`FT` default, `PT` allowed) even though only FT content exists.
- The current week is chosen by hand. It is never worked out from dates.
- Never store or show lab training keys, tutor Teams/Calendly links or portal logins. No Yoobee-owned files.
- Tests wipe `TEST_DATABASE_URL` only. No test may touch `DATABASE_URL`.
- Every `Week` needs a `Submodule` (`weeks.submodule_id` is NOT NULL). Test fixtures that build weeks directly must attach one.
- Don't edit `seed/*.yaml` or `docs/portal-extras.md`; a separate session owns content. Always `git add` by path, never `git add -A` or `git add .`.
- Never kill whatever is on port 5173 (the owner's other project). Old main-checkout servers may hold 8000 and 5174–5176; leave them alone and use other ports. In Git Bash, `taskkill` needs `//PID`.
- Backend commands run in `backend/` with `uv run ...`. Frontend commands run in `frontend/`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Email typed in a different case or with spaces.** Someone who signs up as ` Joel@Example.com ` and logs in as `joel@example.com` gets in, and can't sign up a second time with the other spelling. Tested in Task 3.
2. **A garbage, expired or logged-out session cookie.** The API answers 401, never 500, and the frontend sends the user to the login page, including when a session runs out mid-visit. Tested in Tasks 2, 3 and 5.
3. **A ticked task or prerequisite removed from the seed files.** The tick disappears with it, and progress never counts a task that no longer exists. Tested in Task 1.
4. **Ticking twice, or unticking something that isn't ticked** (tasks and prerequisites). Both return 204 and leave exactly zero or one row. Clicking fast in the UI ends in the server's real state. Tested in Tasks 4 and 6.
5. **A prerequisite shared by several submodules.** Ticking it under one submodule hides it under all of them, and it never moves a progress bar. Another user's ticks never show up for you. Tested in Tasks 4 and 7.

---

## File Structure

Backend (`backend/`):

| File | Responsibility |
|---|---|
| `app/models.py` (modify) | `User`, `UserSession`, `TaskCompletion`, `PrerequisiteCompletion`, `UserSettings` |
| `app/config.py` (modify) | `cookie_secure` setting |
| `alembic/versions/0006_accounts.py` (create) | Account and completion tables |
| `app/auth/__init__.py` (create) | Empty package marker |
| `app/auth/passwords.py` (create) | argon2 hash and verify |
| `app/auth/sessions.py` (create) | Session token create, look up, end |
| `app/auth/ratelimit.py` (create) | Sliding-window rate limiter plus the two shared instances |
| `app/auth/deps.py` (create) | `current_user` FastAPI dependency |
| `app/api/auth.py` (create) | `/auth/*`, `/me`, `/me/settings` |
| `app/api/tasks.py` (create) | `/tasks/{key}/complete` and `/prerequisites/{key}/complete`, PUT and DELETE |
| `app/api/modules.py` (modify) | Login required; ticks and counts |
| `app/api/schemas.py` (modify) | New request and response models |
| `app/main.py` (modify) | Register the routers |
| `tests/conftest.py` (modify) | Reset the rate limiters; `user_client` fixture |
| `tests/test_accounts_models.py` (create) | Cascades for the account tables |
| `tests/test_auth_core.py` (create) | Password, session and limiter unit tests |
| `tests/test_auth_api.py` (create) | Auth and settings endpoints |
| `tests/test_tasks_api.py` (create) | Task and prerequisite ticking, progress counts |

Frontend (`frontend/src/`):

| File | Responsibility |
|---|---|
| `api.ts` (modify) | Typed client: methods, JSON bodies, network errors, new endpoints |
| `App.tsx` (modify) | Query client factory with 401 handling; routes |
| `progress.ts` (create) | Progress maths, optimistic tick helpers, week options |
| `usePageTitle.ts` (create) | Sets `document.title` |
| `hooks/useMe.ts` (create) | Current user query |
| `hooks/useTickTask.ts` (create) | Optimistic tick mutations for tasks and prerequisites |
| `components/RequireAuth.tsx` (create) | Sends logged-out users to `/login` |
| `pages/AuthPage.tsx` (create) | Log in and sign up form |
| `pages/SettingsPage.tsx` (create) | Current week picker |
| `components/Sidebar.tsx` (modify) | Settings link, current week, email, log out, real % |
| `components/module/PrerequisiteBox.tsx` (modify) | Tick boxes, hide done, "Show done", ready message |
| `components/module/*.tsx`, `pages/ModulePage.tsx`, `pages/ModulesPage.tsx`, `components/AssessmentsRail.tsx` (modify) | Real ticking and progress, a11y fixes |
| `index.css` (modify) | Form, button, auth, settings, prerequisite and current-week styles |
| `test/utils.tsx` (modify) | Method-aware `mockApi` with a default signed-in `/api/me` |

---

### Task 1: Account and completion tables

**Files:**
- Modify: `backend/app/models.py`
- Create: `backend/alembic/versions/0006_accounts.py`
- Test: `backend/tests/test_accounts_models.py`

**Interfaces:**
- Consumes: `Base` (naming convention), `Task`, `Prerequisite`, `apply_seed(session, seeds, prerequisites)` and `SeedFile` / `SeedPrerequisite`, all already on `main`.
- Produces:
  - `User(id, email, password_hash, created_at, settings: UserSettings)`
  - `UserSession(token_hash: str PK, user_id, created_at, expires_at, user: User)` (table `sessions`)
  - `TaskCompletion(user_id PK, task_id PK, completed_at)`
  - `PrerequisiteCompletion(user_id PK, prerequisite_id PK, completed_at)` (table `prerequisite_completions`)
  - `UserSettings(user_id PK, current_week: int | None, study_mode: str = "FT", user: User)`
  - `Task.completions` relationship (cascade + `passive_deletes=True`)

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_accounts_models.py`:

```python
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app.models import (
    Module, Prerequisite, PrerequisiteCompletion, Task, TaskCompletion, User, UserSession, UserSettings, Week,
)
from app.seed.loader import apply_seed
from app.seed.schema import SeedFile, SeedPrerequisite


def make_user(db, email="joel@example.com"):
    user = User(email=email, password_hash="x", settings=UserSettings())
    db.add(user)
    db.flush()
    return user


def seed(task_keys, prerequisite_keys=()):
    module = SeedFile.model_validate({
        "module": {"key": "ccc602", "code": "CCC602", "title": "DE", "order": 2},
        "submodules": [{
            "key": "dp900", "code": "DP-900", "title": "DP-900", "prerequisites": list(prerequisite_keys),
            "weeks": [{"key": "w9", "week_number": 9, "title": "W9", "tasks": [
                {"key": k, "title": k, "type": "lab", "external_url": "https://x.test/" + k} for k in task_keys
            ]}],
        }],
    })
    prerequisites = [
        SeedPrerequisite.model_validate({"key": k, "title": k, "external_url": "https://x.test/" + k})
        for k in prerequisite_keys
    ]
    return [module], prerequisites


def count(db, model):
    return db.scalar(select(func.count()).select_from(model))


def test_new_user_gets_default_settings(db):
    user = make_user(db)
    db.expire_all()
    settings = db.get(UserSettings, user.id)
    assert settings.study_mode == "FT"
    assert settings.current_week is None
    assert db.get(User, user.id).created_at is not None


def test_removing_a_ticked_task_from_seed_deletes_its_tick(db):
    apply_seed(db, *seed(["t1", "t2"]))
    user = make_user(db)
    for key in ("t1", "t2"):
        task_id = db.scalar(select(Task.id).where(Task.key == key))
        db.add(TaskCompletion(user_id=user.id, task_id=task_id))
    db.flush()

    apply_seed(db, *seed(["t2"]))
    remaining = db.scalars(select(Task.key).join(TaskCompletion, TaskCompletion.task_id == Task.id)).all()
    assert remaining == ["t2"]


def test_removing_a_ticked_prerequisite_from_seed_deletes_its_tick(db):
    apply_seed(db, *seed(["t1"], ["azure", "aws"]))
    user = make_user(db)
    for key in ("azure", "aws"):
        prereq_id = db.scalar(select(Prerequisite.id).where(Prerequisite.key == key))
        db.add(PrerequisiteCompletion(user_id=user.id, prerequisite_id=prereq_id))
    db.flush()

    apply_seed(db, *seed(["t1"], ["aws"]))
    remaining = db.scalars(
        select(Prerequisite.key).join(PrerequisiteCompletion, PrerequisiteCompletion.prerequisite_id == Prerequisite.id)
    ).all()
    assert remaining == ["aws"]


def test_reseeding_keeps_ticks_on_unchanged_content(db):
    apply_seed(db, *seed(["t1"], ["azure"]))
    user = make_user(db)
    db.add(TaskCompletion(user_id=user.id, task_id=db.scalar(select(Task.id))))
    db.add(PrerequisiteCompletion(user_id=user.id, prerequisite_id=db.scalar(select(Prerequisite.id))))
    db.flush()

    apply_seed(db, *seed(["t1"], ["azure"]))
    assert (count(db, TaskCompletion), count(db, PrerequisiteCompletion)) == (1, 1)


def test_deleting_a_module_deletes_ticks_on_its_tasks(db):
    apply_seed(db, *seed(["t1"]))
    user = make_user(db)
    db.add(TaskCompletion(user_id=user.id, task_id=db.scalar(select(Task.id))))
    db.flush()
    db.expire_all()

    db.delete(db.scalars(select(Module)).one())
    db.flush()
    assert (count(db, Week), count(db, Task), count(db, TaskCompletion)) == (0, 0, 0)


def test_deleting_a_user_deletes_their_sessions_ticks_and_settings(db):
    apply_seed(db, *seed(["t1"], ["azure"]))
    user = make_user(db)
    db.add(TaskCompletion(user_id=user.id, task_id=db.scalar(select(Task.id))))
    db.add(PrerequisiteCompletion(user_id=user.id, prerequisite_id=db.scalar(select(Prerequisite.id))))
    db.add(UserSession(token_hash="a" * 64, user_id=user.id, expires_at=datetime.now(UTC) + timedelta(days=1)))
    db.flush()
    db.expire_all()

    db.delete(db.get(User, user.id))
    db.flush()
    assert (count(db, UserSession), count(db, TaskCompletion), count(db, UserSettings)) == (0, 0, 0)
    assert count(db, PrerequisiteCompletion) == 0
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_accounts_models.py -v`
Expected: FAIL with `ImportError: cannot import name 'PrerequisiteCompletion'`.

- [ ] **Step 3: Add the models**

In `backend/app/models.py`, change the imports:

```python
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, String, func
```

Inside `class Task`, after `week: Mapped[Week] = ...`:

```python
    completions: Mapped[list["TaskCompletion"]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True
    )
```

Append to the end of the file:

```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    settings: Mapped["UserSettings"] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    sessions: Mapped[list["UserSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    completions: Mapped[list["TaskCompletion"]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True
    )
    prerequisite_completions: Mapped[list["PrerequisiteCompletion"]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True
    )


class UserSession(Base):
    __tablename__ = "sessions"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="sessions")


class TaskCompletion(Base):
    __tablename__ = "task_completions"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True, index=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PrerequisiteCompletion(Base):
    """A user's tick on a one-off setup step. Kept apart from TaskCompletion so progress never counts it."""

    __tablename__ = "prerequisite_completions"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    prerequisite_id: Mapped[int] = mapped_column(
        ForeignKey("prerequisites.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UserSettings(Base):
    __tablename__ = "user_settings"
    __table_args__ = (CheckConstraint("study_mode IN ('FT', 'PT')", name="study_mode"),)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    current_week: Mapped[int | None]
    study_mode: Mapped[str] = mapped_column(String(2), default="FT", server_default="FT")

    user: Mapped[User] = relationship(back_populates="settings")
```

(`apply_seed` deletes removed tasks and prerequisites with bulk SQL `DELETE`, so it's the database's `ON DELETE CASCADE` that removes their ticks. The ORM relationships only matter for ORM deletes.)

- [ ] **Step 4: Write migration 0006**

Create `backend/alembic/versions/0006_accounts.py`:

```python
"""accounts, sessions, completions, settings

Revision ID: 0006
Revises: 0005
"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "sessions",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"])
    op.create_table(
        "task_completions",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_task_completions_task_id", "task_completions", ["task_id"])
    op.create_table(
        "prerequisite_completions",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column(
            "prerequisite_id", sa.Integer(), sa.ForeignKey("prerequisites.id", ondelete="CASCADE"), primary_key=True
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_prerequisite_completions_prerequisite_id", "prerequisite_completions", ["prerequisite_id"]
    )
    op.create_table(
        "user_settings",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("current_week", sa.Integer(), nullable=True),
        sa.Column("study_mode", sa.String(2), nullable=False, server_default="FT"),
        sa.CheckConstraint("study_mode IN ('FT', 'PT')", name="user_settings_study_mode_check"),
    )


def downgrade() -> None:
    op.drop_table("user_settings")
    op.drop_index("ix_prerequisite_completions_prerequisite_id", table_name="prerequisite_completions")
    op.drop_table("prerequisite_completions")
    op.drop_index("ix_task_completions_task_id", table_name="task_completions")
    op.drop_table("task_completions")
    op.drop_index("ix_sessions_user_id", table_name="sessions")
    op.drop_table("sessions")
    op.drop_table("users")
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `uv run pytest tests/test_accounts_models.py tests/test_migrations.py -v`
Expected: all PASS. `test_migrations` proves that 0006 matches the models and that every new FK is indexed.

Then run: `uv run pytest`
Expected: all PASS.

- [ ] **Step 6: Apply to dev and confirm no drift**

Run: `uv run alembic upgrade head`, then `uv run alembic check`
Expected: `0005 -> 0006`; `No new upgrade operations detected.`

- [ ] **Step 7: Commit**

```bash
git add backend/app/models.py backend/alembic/versions/0006_accounts.py backend/tests/test_accounts_models.py
git commit -m "feat(db): users, sessions, task and prerequisite completions, settings"
```

---

### Task 2: Auth core — passwords, sessions, rate limiter

**Files:**
- Modify: `backend/pyproject.toml` (via `uv add`)
- Modify: `backend/app/config.py`
- Create: `backend/app/auth/__init__.py`, `backend/app/auth/passwords.py`, `backend/app/auth/sessions.py`, `backend/app/auth/ratelimit.py`, `backend/app/auth/deps.py`
- Modify: `backend/.env.example`
- Test: `backend/tests/test_auth_core.py`

**Interfaces:**
- Consumes: `User`, `UserSession` (Task 1).
- Produces:
  - `hash_password(password: str) -> str`
  - `verify_password(password_hash: str | None, password: str) -> bool` (with `None` it still does the hashing work and returns False)
  - `SESSION_COOKIE = "session"`, `SESSION_LIFETIME = timedelta(days=30)`
  - `hash_token(token: str) -> str`
  - `start_session(db, user, now=None) -> str` (adds the row and prunes that user's expired sessions; the caller commits)
  - `user_for_token(db, token: str | None, now=None) -> User | None`
  - `end_session(db, token: str | None) -> None` (the caller commits)
  - `RateLimiter(limit, window, clock=time.monotonic)` with `.hit(key) -> bool` and `.reset()`; instances `ip_limiter` (30 per 15 min) and `email_limiter` (10 per 15 min)
  - `current_user(request, db) -> User` dependency (401 `"Not logged in"`)
  - `Settings.cookie_secure: bool = False`

- [ ] **Step 1: Add the dependency**

Run: `uv add argon2-cffi`
Expected: `pyproject.toml` and `uv.lock` updated.

- [ ] **Step 2: Write the failing tests**

Create `backend/tests/test_auth_core.py`:

```python
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app.auth.passwords import hash_password, verify_password
from app.auth.ratelimit import RateLimiter
from app.auth.sessions import SESSION_LIFETIME, end_session, hash_token, start_session, user_for_token
from app.models import User, UserSession, UserSettings


def make_user(db):
    user = User(email="joel@example.com", password_hash=hash_password("correct horse"), settings=UserSettings())
    db.add(user)
    db.flush()
    return user


def test_password_round_trip():
    stored = hash_password("correct horse")
    assert stored.startswith("$argon2")
    assert verify_password(stored, "correct horse")
    assert not verify_password(stored, "wrong horse!")


def test_verify_without_a_hash_is_false():
    assert verify_password(None, "anything at all") is False


def test_verify_with_a_corrupt_hash_is_false():
    assert verify_password("not-a-hash", "anything at all") is False


def test_session_token_is_stored_only_as_a_hash(db):
    user = make_user(db)
    token = start_session(db, user)
    db.flush()
    stored = db.scalars(select(UserSession.token_hash)).one()
    assert stored == hash_token(token)
    assert token not in stored
    assert len(token) >= 40


def test_user_for_token_finds_the_user(db):
    user = make_user(db)
    token = start_session(db, user)
    db.flush()
    assert user_for_token(db, token).id == user.id


def test_garbage_missing_and_expired_tokens_find_nobody(db):
    user = make_user(db)
    now = datetime.now(UTC)
    token = start_session(db, user, now=now - SESSION_LIFETIME - timedelta(seconds=1))
    db.flush()
    assert user_for_token(db, token) is None
    assert user_for_token(db, "garbage") is None
    assert user_for_token(db, "") is None
    assert user_for_token(db, None) is None


def test_starting_a_session_prunes_that_users_expired_sessions(db):
    user = make_user(db)
    now = datetime.now(UTC)
    start_session(db, user, now=now - SESSION_LIFETIME - timedelta(days=1))
    db.flush()
    start_session(db, user, now=now)
    db.flush()
    assert db.scalar(select(func.count()).select_from(UserSession)) == 1


def test_end_session_removes_it(db):
    user = make_user(db)
    token = start_session(db, user)
    db.flush()
    end_session(db, token)
    db.flush()
    assert user_for_token(db, token) is None
    end_session(db, None)  # no cookie: nothing to do, no error


def test_rate_limiter_allows_up_to_the_limit_then_blocks():
    now = [0.0]
    limiter = RateLimiter(limit=3, window=60, clock=lambda: now[0])
    assert [limiter.hit("k") for _ in range(4)] == [True, True, True, False]
    assert limiter.hit("other") is True


def test_rate_limiter_forgets_old_hits():
    now = [0.0]
    limiter = RateLimiter(limit=2, window=60, clock=lambda: now[0])
    limiter.hit("k")
    limiter.hit("k")
    assert limiter.hit("k") is False
    now[0] = 60.0
    assert limiter.hit("k") is True


def test_rate_limiter_reset_clears_everything():
    limiter = RateLimiter(limit=1, window=60)
    limiter.hit("k")
    limiter.reset()
    assert limiter.hit("k") is True
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `uv run pytest tests/test_auth_core.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.auth'`.

- [ ] **Step 4: Implement**

`backend/app/auth/__init__.py`: empty file.

`backend/app/auth/passwords.py`:

```python
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

_hasher = PasswordHasher()
# Verified against when the email is unknown, so a miss takes as long as a wrong password.
_DUMMY_HASH = _hasher.hash("dummy password for timing")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str | None, password: str) -> bool:
    try:
        ok = _hasher.verify(password_hash or _DUMMY_HASH, password)
    except (VerificationError, InvalidHashError):
        return False
    return ok and password_hash is not None
```

`backend/app/auth/sessions.py`:

```python
import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models import User, UserSession

SESSION_COOKIE = "session"
SESSION_LIFETIME = timedelta(days=30)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def start_session(db: Session, user: User, now: datetime | None = None) -> str:
    """Create a session for `user` and return the raw token for the cookie. The caller commits."""
    now = now or datetime.now(UTC)
    db.execute(delete(UserSession).where(UserSession.user_id == user.id, UserSession.expires_at <= now))
    token = secrets.token_urlsafe(32)
    db.add(UserSession(token_hash=hash_token(token), user_id=user.id, expires_at=now + SESSION_LIFETIME))
    return token


def user_for_token(db: Session, token: str | None, now: datetime | None = None) -> User | None:
    if not token:
        return None
    session = db.get(UserSession, hash_token(token))
    if session is None or session.expires_at <= (now or datetime.now(UTC)):
        return None
    return session.user


def end_session(db: Session, token: str | None) -> None:
    """Delete the session for `token`, if any. The caller commits."""
    if token:
        db.execute(delete(UserSession).where(UserSession.token_hash == hash_token(token)))
```

`backend/app/auth/ratelimit.py`:

```python
import time
from collections import defaultdict, deque
from collections.abc import Callable


class RateLimiter:
    """At most `limit` hits per key in any `window` seconds. In memory, so per process; fine for one instance."""

    def __init__(self, limit: int, window: float, clock: Callable[[], float] = time.monotonic):
        self.limit, self.window, self.clock = limit, window, clock
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def hit(self, key: str) -> bool:
        """Record an attempt for `key`. Returns False (and records nothing) when the key is over the limit."""
        now = self.clock()
        hits = self._hits[key]
        while hits and hits[0] <= now - self.window:
            hits.popleft()
        if len(hits) >= self.limit:
            return False
        hits.append(now)
        return True

    def reset(self) -> None:
        self._hits.clear()


ip_limiter = RateLimiter(limit=30, window=15 * 60)
email_limiter = RateLimiter(limit=10, window=15 * 60)
```

`backend/app/auth/deps.py`:

```python
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
```

In `backend/app/config.py` add to `Settings`:

```python
    # Send the session cookie over HTTPS only. Off for local http://localhost; turn on when deployed.
    cookie_secure: bool = False
```

Append to `backend/.env.example`:

```
# Set to true once served over HTTPS (deployment)
COOKIE_SECURE=false
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `uv run pytest tests/test_auth_core.py -v`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/pyproject.toml backend/uv.lock backend/app/config.py backend/.env.example backend/app/auth backend/tests/test_auth_core.py
git commit -m "feat(auth): argon2 passwords, hashed session tokens, rate limiter"
```

---

### Task 3: Auth and settings API

**Files:**
- Create: `backend/app/api/auth.py`
- Modify: `backend/app/api/schemas.py`
- Modify: `backend/app/main.py`
- Modify: `backend/tests/conftest.py`
- Test: `backend/tests/test_auth_api.py`

**Interfaces:**
- Consumes: everything Task 2 produces.
- Produces (all under `/api`):
  - `POST /auth/signup` body `{email, password}` → 201 `MeOut` plus cookie; 409 `EMAIL_TAKEN`; 422; 429
  - `POST /auth/login` body `{email, password}` → 200 `MeOut` plus cookie; 401 `"Email or password is incorrect."`; 429
  - `POST /auth/logout` → 204, clears the cookie (works without a session)
  - `GET /me` → `MeOut` `{email, current_week, study_mode}`; 401
  - `PATCH /me/settings` body `{current_week: int | null}` (required key) → `MeOut`; 422 `"No such week"` when no week has that number
  - Test fixtures: `user_client` (a `client` signed up as `joel@example.com` / `correct horse`) and an autouse limiter reset

- [ ] **Step 1: Update conftest**

Add to the imports and the end of `backend/tests/conftest.py`:

```python
from app.auth.ratelimit import email_limiter, ip_limiter

PASSWORD = "correct horse"


@pytest.fixture(autouse=True)
def reset_rate_limits():
    ip_limiter.reset()
    email_limiter.reset()


@pytest.fixture
def user_client(client):
    response = client.post("/api/auth/signup", json={"email": "joel@example.com", "password": PASSWORD})
    assert response.status_code == 201
    return client
```

- [ ] **Step 2: Write the failing tests**

Create `backend/tests/test_auth_api.py`:

```python
from app.auth.ratelimit import email_limiter
from app.models import Module, Submodule, Week
from tests.conftest import PASSWORD


def signup(client, email="joel@example.com", password=PASSWORD):
    return client.post("/api/auth/signup", json={"email": email, "password": password})


def login(client, email="joel@example.com", password=PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def test_signup_starts_a_session_with_a_safe_cookie(client):
    response = signup(client)
    assert response.status_code == 201
    assert response.json() == {"email": "joel@example.com", "current_week": None, "study_mode": "FT"}
    cookie = response.headers["set-cookie"].lower()
    assert "session=" in cookie and "httponly" in cookie and "samesite=lax" in cookie
    assert "max-age=2592000" in cookie
    assert client.get("/api/me").json()["email"] == "joel@example.com"


def test_email_is_trimmed_and_lowercased(client):
    assert signup(client, email="  Joel@Example.COM ").json()["email"] == "joel@example.com"
    client.post("/api/auth/logout")
    assert login(client, email="JOEL@example.com").status_code == 200
    assert signup(client, email="joel@EXAMPLE.com").status_code == 409


def test_taken_email_gives_a_generic_409(client):
    signup(client)
    response = signup(client)
    assert response.status_code == 409
    assert "joel@example.com" not in response.json()["detail"]


def test_signup_rejects_bad_input(client):
    assert signup(client, password="short").status_code == 422
    assert signup(client, password="x" * 257).status_code == 422
    assert signup(client, email="not-an-email").status_code == 422
    assert client.post("/api/auth/signup", json={"email": "a@b.co"}).status_code == 422


def test_wrong_password_and_unknown_email_look_the_same(client):
    signup(client)
    client.post("/api/auth/logout")
    wrong = login(client, password="wrong password")
    unknown = login(client, email="nobody@example.com")
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json() == {"detail": "Email or password is incorrect."}


def test_logout_ends_the_session(client):
    signup(client)
    old_cookie = client.cookies.get("session")
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/me").status_code == 401
    client.cookies.set("session", old_cookie)
    assert client.get("/api/me").status_code == 401


def test_logout_without_a_session_is_fine(client):
    assert client.post("/api/auth/logout").status_code == 204


def test_me_needs_a_session_and_ignores_garbage_cookies(client):
    assert client.get("/api/me").status_code == 401
    client.cookies.set("session", "garbage")
    response = client.get("/api/me")
    assert response.status_code == 401
    assert response.json() == {"detail": "Not logged in"}


def test_login_is_rate_limited_per_email(client):
    signup(client)
    client.post("/api/auth/logout")
    for _ in range(email_limiter.limit - 1):
        assert login(client, password="wrong password").status_code == 401
    response = login(client)
    assert response.status_code == 429
    assert response.json() == {"detail": "Too many attempts. Wait a few minutes and try again."}


def add_weeks(db):
    sub = Submodule(key="s", code="S", title="S", position=0)
    db.add(Module(key="m", code="M", title="M", position=1, submodules=[sub], weeks=[
        Week(key="w9", week_number=9, title="W9", position=0, submodule=sub),
    ]))
    db.flush()


def test_set_and_clear_current_week(user_client, db):
    add_weeks(db)
    response = user_client.patch("/api/me/settings", json={"current_week": 9})
    assert response.status_code == 200
    assert response.json()["current_week"] == 9
    assert user_client.get("/api/me").json()["current_week"] == 9

    assert user_client.patch("/api/me/settings", json={"current_week": None}).json()["current_week"] is None


def test_unknown_week_is_rejected(user_client, db):
    add_weeks(db)
    response = user_client.patch("/api/me/settings", json={"current_week": 99})
    assert response.status_code == 422
    assert response.json() == {"detail": "No such week"}
    assert user_client.patch("/api/me/settings", json={}).status_code == 422


def test_settings_need_a_session(client):
    assert client.patch("/api/me/settings", json={"current_week": None}).status_code == 401
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `uv run pytest tests/test_auth_api.py -v`
Expected: FAIL with 404s (the routes don't exist).

- [ ] **Step 4: Add the schemas**

Append to `backend/app/api/schemas.py` (and add `Annotated` and `StringConstraints` to its imports: `from typing import Annotated` and `from pydantic import BaseModel, ConfigDict, StringConstraints`):

```python
Email = Annotated[
    str,
    StringConstraints(strip_whitespace=True, to_lower=True, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$"),
]


class SignupIn(BaseModel):
    email: Email
    password: Annotated[str, StringConstraints(min_length=10, max_length=256)]


class LoginIn(BaseModel):
    email: Email
    password: Annotated[str, StringConstraints(min_length=1, max_length=256)]


class MeOut(BaseModel):
    email: str
    current_week: int | None
    study_mode: str


class SettingsIn(BaseModel):
    current_week: int | None
```

- [ ] **Step 5: Add the routes**

Create `backend/app/api/auth.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.schemas import LoginIn, MeOut, SettingsIn, SignupIn
from app.auth.deps import current_user
from app.auth.passwords import hash_password, verify_password
from app.auth.ratelimit import email_limiter, ip_limiter
from app.auth.sessions import SESSION_COOKIE, SESSION_LIFETIME, end_session, start_session
from app.config import get_settings
from app.db import get_db
from app.models import User, UserSettings, Week

router = APIRouter(tags=["auth"])

EMAIL_TAKEN = "Couldn't create an account with that email. Try logging in instead."
BAD_LOGIN = "Email or password is incorrect."


def _limit(request: Request, email: str) -> None:
    ip = request.client.host if request.client else "unknown"
    if not ip_limiter.hit(f"ip:{ip}") or not email_limiter.hit(f"email:{email}"):
        raise HTTPException(status_code=429, detail="Too many attempts. Wait a few minutes and try again.")


def _cookie_args() -> dict:
    return {"path": "/", "httponly": True, "samesite": "lax", "secure": get_settings().cookie_secure}


def _set_cookie(response: Response, token: str) -> None:
    response.set_cookie(SESSION_COOKIE, token, max_age=int(SESSION_LIFETIME.total_seconds()), **_cookie_args())


def _me(user: User) -> MeOut:
    return MeOut(email=user.email, current_week=user.settings.current_week, study_mode=user.settings.study_mode)


@router.post("/auth/signup", response_model=MeOut, status_code=201)
def signup(body: SignupIn, request: Request, response: Response, db: Session = Depends(get_db)) -> MeOut:
    _limit(request, body.email)
    if db.scalar(select(User.id).where(User.email == body.email)) is not None:
        raise HTTPException(status_code=409, detail=EMAIL_TAKEN)
    user = User(email=body.email, password_hash=hash_password(body.password), settings=UserSettings())
    db.add(user)
    try:
        db.flush()
    except IntegrityError:  # someone signed up with the same email a moment ago
        db.rollback()
        raise HTTPException(status_code=409, detail=EMAIL_TAKEN)
    token = start_session(db, user)
    db.commit()
    _set_cookie(response, token)
    return _me(user)


@router.post("/auth/login", response_model=MeOut)
def login(body: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)) -> MeOut:
    _limit(request, body.email)
    user = db.scalars(select(User).where(User.email == body.email)).one_or_none()
    if not verify_password(user.password_hash if user else None, body.password):
        raise HTTPException(status_code=401, detail=BAD_LOGIN)
    token = start_session(db, user)
    db.commit()
    _set_cookie(response, token)
    return _me(user)


@router.post("/auth/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> None:
    end_session(db, request.cookies.get(SESSION_COOKIE))
    db.commit()
    response.delete_cookie(SESSION_COOKIE, **_cookie_args())


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(current_user)) -> MeOut:
    return _me(user)


@router.patch("/me/settings", response_model=MeOut)
def update_settings(body: SettingsIn, user: User = Depends(current_user), db: Session = Depends(get_db)) -> MeOut:
    if body.current_week is not None:
        exists = db.scalar(select(Week.id).where(Week.week_number == body.current_week).limit(1))
        if exists is None:
            raise HTTPException(status_code=422, detail="No such week")
    user.settings.current_week = body.current_week
    db.commit()
    return _me(user)
```

In `backend/app/main.py` import and register it:

```python
from app.api import auth, modules
...
api.include_router(auth.router)
api.include_router(modules.router)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `uv run pytest tests/test_auth_api.py -v`
Expected: all PASS.

Then run: `uv run pytest`
Expected: all PASS (the module routes don't need a login yet).

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/auth.py backend/app/api/schemas.py backend/app/main.py backend/tests/conftest.py backend/tests/test_auth_api.py
git commit -m "feat(api): signup, login, logout, me and current week setting"
```

---

### Task 4: Ticking and progress API

**Files:**
- Create: `backend/app/api/tasks.py`
- Modify: `backend/app/api/modules.py`, `backend/app/api/schemas.py`, `backend/app/main.py`
- Modify: `backend/tests/test_modules_api.py`
- Test: `backend/tests/test_tasks_api.py`

**Interfaces:**
- Consumes: `current_user` (Task 2), `TaskCompletion` and `PrerequisiteCompletion` (Task 1), the `user_client` fixture (Task 3). The current `app/api/modules.py` on `main` already builds `ModuleDetail` explicitly with `_submodule_out`.
- Produces:
  - `PUT /api/tasks/{key}/complete` → 204 (idempotent); 404 `"Task not found"`; 401
  - `DELETE /api/tasks/{key}/complete` → 204 (idempotent); 404; 401
  - `PUT /api/prerequisites/{key}/complete` → 204 (idempotent); 404 `"Prerequisite not found"`; 401
  - `DELETE /api/prerequisites/{key}/complete` → 204 (idempotent); 404; 401
  - `GET /api/modules` now needs a login; each item adds `completed_count: int` (tasks only) and `week_numbers: list[int]` (in week order)
  - `GET /api/modules/{key}` now needs a login; each task adds `done: bool`; each prerequisite in `submodules[].prerequisites` adds `completed: bool`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_tasks_api.py`:

```python
from sqlalchemy import func, select

from app.models import (
    Module, Prerequisite, PrerequisiteCompletion, Submodule, SubmodulePrerequisite, Task, TaskCompletion, Week,
)
from tests.conftest import PASSWORD


def add_content(db):
    dp900 = Submodule(key="dp900", code="DP-900", title="DP-900", position=0)
    dp203 = Submodule(key="dp203", code="DP-203", title="DP-203", position=1)
    db.add(Module(key="ccc602", code="CCC602", title="DE", position=2, submodules=[dp900, dp203], weeks=[
        Week(key="w9", week_number=9, title="W9", position=0, submodule=dp900, tasks=[
            Task(key="t1", title="T1", type="lab", external_url="https://x.test/1", position=0),
            Task(key="t2", title="T2", type="lab", external_url="https://x.test/2", position=1),
        ]),
        Week(key="w10", week_number=10, title="W10", position=1, submodule=dp203, tasks=[
            Task(key="t3", title="T3", type="lab", external_url="https://x.test/3", position=0),
        ]),
    ]))
    azure = Prerequisite(key="azure-account", title="Azure", external_url="https://azure.test")
    db.add(azure)
    db.flush()
    db.add_all([  # shared by both submodules
        SubmodulePrerequisite(submodule_id=dp900.id, prerequisite_id=azure.id, position=0),
        SubmodulePrerequisite(submodule_id=dp203.id, prerequisite_id=azure.id, position=0),
    ])
    db.flush()


def count(db, model):
    return db.scalar(select(func.count()).select_from(model))


def prerequisite_flags(client):
    detail = client.get("/api/modules/ccc602").json()
    return [[p["completed"] for p in s["prerequisites"]] for s in detail["submodules"]]


def test_tick_and_untick_are_idempotent(user_client, db):
    add_content(db)
    assert user_client.put("/api/tasks/t1/complete").status_code == 204
    assert user_client.put("/api/tasks/t1/complete").status_code == 204
    assert count(db, TaskCompletion) == 1
    assert user_client.delete("/api/tasks/t1/complete").status_code == 204
    assert user_client.delete("/api/tasks/t1/complete").status_code == 204
    assert count(db, TaskCompletion) == 0


def test_unknown_task_or_prerequisite_is_404(user_client, db):
    add_content(db)
    for method in (user_client.put, user_client.delete):
        assert method("/api/tasks/nope/complete").json() == {"detail": "Task not found"}
        response = method("/api/prerequisites/nope/complete")
        assert response.status_code == 404
        assert response.json() == {"detail": "Prerequisite not found"}


def test_ticking_needs_a_session(client, db):
    add_content(db)
    for path in ("/api/tasks/t1/complete", "/api/prerequisites/azure-account/complete"):
        assert client.put(path).status_code == 401
        assert client.delete(path).status_code == 401


def test_module_reads_need_a_session(client, db):
    add_content(db)
    assert client.get("/api/modules").status_code == 401
    assert client.get("/api/modules/ccc602").status_code == 401


def test_progress_counts_and_done_flags(user_client, db):
    add_content(db)
    user_client.put("/api/tasks/t1/complete")
    user_client.put("/api/tasks/t3/complete")

    [summary] = user_client.get("/api/modules").json()
    assert summary["completed_count"] == 2
    assert summary["task_count"] == 3
    assert summary["week_numbers"] == [9, 10]

    detail = user_client.get("/api/modules/ccc602").json()
    assert [[t["done"] for t in w["tasks"]] for w in detail["weeks"]] == [[True, False], [True]]


def test_shared_prerequisite_tick_shows_everywhere_and_never_counts(user_client, db):
    add_content(db)
    assert prerequisite_flags(user_client) == [[False], [False]]

    assert user_client.put("/api/prerequisites/azure-account/complete").status_code == 204
    assert user_client.put("/api/prerequisites/azure-account/complete").status_code == 204
    assert count(db, PrerequisiteCompletion) == 1
    assert prerequisite_flags(user_client) == [[True], [True]]
    assert user_client.get("/api/modules").json()[0]["completed_count"] == 0

    assert user_client.delete("/api/prerequisites/azure-account/complete").status_code == 204
    assert user_client.delete("/api/prerequisites/azure-account/complete").status_code == 204
    assert prerequisite_flags(user_client) == [[False], [False]]


def test_one_users_ticks_never_show_for_another(user_client, db):
    add_content(db)
    user_client.put("/api/tasks/t1/complete")
    user_client.put("/api/prerequisites/azure-account/complete")
    user_client.post("/api/auth/logout")

    other = user_client.post("/api/auth/signup", json={"email": "other@example.com", "password": PASSWORD})
    assert other.status_code == 201
    assert user_client.get("/api/modules").json()[0]["completed_count"] == 0
    detail = user_client.get("/api/modules/ccc602").json()
    assert not any(t["done"] for w in detail["weeks"] for t in w["tasks"])
    assert prerequisite_flags(user_client) == [[False], [False]]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_tasks_api.py -v`
Expected: FAIL (404 on `/api/tasks/...`, 200 instead of 401 on module reads, missing keys).

- [ ] **Step 3: Implement the tick routes**

Create `backend/app/api/tasks.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.auth.deps import current_user
from app.db import get_db
from app.models import Prerequisite, PrerequisiteCompletion, Task, TaskCompletion, User

router = APIRouter(tags=["ticks"])


def _id(db: Session, model, key: str, label: str) -> int:
    row_id = db.scalar(select(model.id).where(model.key == key))
    if row_id is None:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return row_id


@router.put("/tasks/{key}/complete", status_code=204)
def complete_task(key: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> None:
    task_id = _id(db, Task, key, "Task")
    db.execute(insert(TaskCompletion).values(user_id=user.id, task_id=task_id).on_conflict_do_nothing())
    db.commit()


@router.delete("/tasks/{key}/complete", status_code=204)
def uncomplete_task(key: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> None:
    task_id = _id(db, Task, key, "Task")
    db.execute(delete(TaskCompletion).where(TaskCompletion.user_id == user.id, TaskCompletion.task_id == task_id))
    db.commit()


@router.put("/prerequisites/{key}/complete", status_code=204)
def complete_prerequisite(key: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> None:
    prereq_id = _id(db, Prerequisite, key, "Prerequisite")
    db.execute(
        insert(PrerequisiteCompletion).values(user_id=user.id, prerequisite_id=prereq_id).on_conflict_do_nothing()
    )
    db.commit()


@router.delete("/prerequisites/{key}/complete", status_code=204)
def uncomplete_prerequisite(key: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> None:
    prereq_id = _id(db, Prerequisite, key, "Prerequisite")
    db.execute(
        delete(PrerequisiteCompletion).where(
            PrerequisiteCompletion.user_id == user.id, PrerequisiteCompletion.prerequisite_id == prereq_id
        )
    )
    db.commit()
```

Register it in `backend/app/main.py`: `from app.api import auth, modules, tasks` and `api.include_router(tasks.router)`.

- [ ] **Step 4: Add progress fields and the login check to the module routes**

In `backend/app/api/schemas.py`:
- `ModuleSummary`: add `completed_count: int` and `week_numbers: list[int]`
- `TaskOut`: add `done: bool = False`
- `PrerequisiteOut`: add `completed: bool = False`

In `backend/app/api/modules.py` (keep everything else as it is on `main`):
- Imports: add `from app.auth.deps import current_user` and add `PrerequisiteCompletion, TaskCompletion, User` to the `app.models` import.
- Add helpers below `router = ...`:

```python
def _done_task_ids(db: Session, user: User) -> set[int]:
    return set(db.scalars(select(TaskCompletion.task_id).where(TaskCompletion.user_id == user.id)))


def _done_prerequisite_ids(db: Session, user: User) -> set[int]:
    return set(
        db.scalars(select(PrerequisiteCompletion.prerequisite_id).where(PrerequisiteCompletion.user_id == user.id))
    )
```

- `list_modules(user: User = Depends(current_user), db: Session = Depends(get_db))`: compute `done = _done_task_ids(db, user)` first, and add to each `ModuleSummary(...)`:

```python
            completed_count=sum(1 for w in m.weeks for t in w.tasks if t.id in done),
            week_numbers=[w.week_number for w in m.weeks],
```

- `_submodule_out(sub: Submodule, done_prereqs: set[int])`: the prerequisites list becomes:

```python
        prerequisites=[
            PrerequisiteOut.model_validate(link.prerequisite).model_copy(
                update={"completed": link.prerequisite_id in done_prereqs}
            )
            for link in sub.prerequisite_links
        ],
```

- `get_module(key: str, user: User = Depends(current_user), db: Session = Depends(get_db))`: after the 404 check, compute both sets and build the weeks with `done` flags:

```python
    done_tasks = _done_task_ids(db, user)
    done_prereqs = _done_prerequisite_ids(db, user)
    weeks = []
    for week in module.weeks:
        week_out = WeekOut.model_validate(week)
        for task, task_out in zip(week.tasks, week_out.tasks):
            task_out.done = task.id in done_tasks
        weeks.append(week_out)
```

  Then pass `submodules=[_submodule_out(s, done_prereqs) for s in module.submodules]` and `weeks=weeks` to `ModuleDetail(...)`.

- [ ] **Step 5: Update the existing module API tests**

In `backend/tests/test_modules_api.py`:
- Replace the `client` parameter with `user_client` in every test, and the `client.get` calls inside them with `user_client.get`.
- In `test_list_modules_in_order_with_counts`, add `"completed_count": 0, "week_numbers": []` to the `ccc601` dict and `"completed_count": 0, "week_numbers": [9, 10]` to the `ccc602` dict.
- In `test_module_detail`, the first task dict gains `"done": False`.
- In `test_module_detail_lists_submodules_with_prerequisites`, the `azure-account` prerequisite dict gains `"completed": False`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `uv run pytest`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/tasks.py backend/app/api/modules.py backend/app/api/schemas.py backend/app/main.py backend/tests/test_modules_api.py backend/tests/test_tasks_api.py
git commit -m "feat(api): tick tasks and prerequisites, per-user progress, login for module reads"
```

---

### Task 5: Frontend sign-in flow

**Files:**
- Modify: `frontend/src/api.ts`
- Modify: `frontend/src/App.tsx`, `frontend/src/App.test.tsx`
- Create: `frontend/src/hooks/useMe.ts`, `frontend/src/components/RequireAuth.tsx`, `frontend/src/pages/AuthPage.tsx`, `frontend/src/usePageTitle.ts`
- Modify: `frontend/src/components/Sidebar.tsx` (email and Log out only)
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/test/utils.tsx`
- Modify: `frontend/src/pages/ModulesPage.test.tsx`, `frontend/src/components/Sidebar.test.tsx`, `frontend/src/pages/ModulePage.test.tsx` (fixtures only)
- Test: `frontend/src/pages/AuthPage.test.tsx`

**Interfaces:**
- Consumes: the backend API from Tasks 3 and 4.
- Produces (`api.ts`):
  - `interface Me { email: string; current_week: number | null; study_mode: 'FT' | 'PT' }`
  - `ModuleSummary` gains `completed_count: number; week_numbers: number[]`; `Task` gains `done: boolean`; `Prerequisite` gains `completed: boolean`
  - `ApiError` (status `0` = network error, message `"Can't reach the server. Check your connection and try again."`), `isUnauthorized(error: unknown): boolean`
  - `fetchMe()`, `signup(email, password)`, `login(email, password)` (all `Promise<Me>`), `logout(): Promise<void>`, `updateSettings(body: { current_week: number | null }): Promise<Me>`, `setTaskDone(key: string, done: boolean): Promise<void>`, `setPrerequisiteDone(key: string, done: boolean): Promise<void>`, `fetchModules`, `fetchModule`
- Produces (other files):
  - `useMe()` (query key `['me']`, `staleTime: Infinity`)
  - `makeQueryClient(retry?)` from `App.tsx`; a 401 on any query or mutation re-checks `['me']`
  - `usePageTitle(title: string)` sets `"<title> · Cloudy McHackface"`
  - Routes: `/login` and `/signup` outside the shell; everything else inside `RequireAuth`
  - `test/utils.tsx`: `ME` fixture; `mockApi` matches `"METHOD /url"` keys first, then plain-URL keys for GET only; `/api/me` defaults to `ME`; function routes get `init`

- [ ] **Step 1: Update the test helpers**

Replace `frontend/src/test/utils.tsx`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes, makeQueryClient } from '../App'

export const ME = { email: 'joel@example.com', current_week: null, study_mode: 'FT' }

export function renderAt(path: string) {
  const client = makeQueryClient(false)
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

type Handler = (init?: RequestInit) => Response | Promise<Response>
type Route = unknown | Handler

/**
 * Stub fetch. Keys are "METHOD /api/path" or a bare "/api/path" (GET only). Plain values become 200 JSON;
 * functions get the request init and build their own Response (or throw). `/api/me` answers ME unless
 * overridden. Anything else is a 404.
 */
export function mockApi(routes: Record<string, Route>) {
  const all: Record<string, Route> = { '/api/me': ME, ...routes }
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    const method = (init?.method ?? 'GET').toUpperCase()
    const key = `${method} ${url}` in all ? `${method} ${url}` : method === 'GET' && url in all ? url : null
    if (key === null) return jsonResponse({ detail: 'Not found' }, 404)
    const route = all[key]
    return typeof route === 'function' ? (route as Handler)(init) : jsonResponse(route)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
```

- [ ] **Step 2: Write the failing tests**

Create `frontend/src/pages/AuthPage.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ME, jsonResponse, mockApi, renderAt } from '../test/utils'

const unauthorized = () => jsonResponse({ detail: 'Not logged in' }, 401)
const modules = [
  { key: 'ccc602', code: 'CCC602', title: 'Data Engineering in the Public Cloud', week_count: 1, task_count: 2, completed_count: 0, week_numbers: [9], uplearn_url: null },
]

describe('sign-in flow', () => {
  it('sends a logged-out visitor to the login page', async () => {
    mockApi({ '/api/me': unauthorized })
    renderAt('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument()
    expect(document.title).toBe('Log in · Cloudy McHackface')
  })

  it('logs in and returns to the page they asked for', async () => {
    let loggedIn = false
    const fetchMock = mockApi({
      '/api/me': () => (loggedIn ? jsonResponse(ME) : unauthorized()),
      'POST /api/auth/login': (init) => {
        expect(JSON.parse(String(init?.body))).toEqual({ email: 'joel@example.com', password: 'correct horse' })
        loggedIn = true
        return jsonResponse(ME)
      },
      '/api/modules': modules,
      '/api/modules/ccc602': { key: 'ccc602', code: 'CCC602', title: 'Data Engineering in the Public Cloud', uplearn_url: null, weeks: [], assessments: [] },
    })
    renderAt('/modules/ccc602')
    await screen.findByRole('heading', { name: 'Log in' })
    await userEvent.type(screen.getByLabelText('Email'), 'joel@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Data Engineering in the Public Cloud' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ method: 'POST' }))
  })

  it('shows the server message when login fails', async () => {
    mockApi({
      '/api/me': unauthorized,
      'POST /api/auth/login': () => jsonResponse({ detail: 'Email or password is incorrect.' }, 401),
    })
    renderAt('/login')
    await userEvent.type(await screen.findByLabelText('Email'), 'joel@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong password')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.')
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('signs up, checking password length before sending', async () => {
    let loggedIn = false
    const fetchMock = mockApi({
      '/api/me': () => (loggedIn ? jsonResponse(ME) : unauthorized()),
      'POST /api/auth/signup': () => {
        loggedIn = true
        return jsonResponse(ME, 201)
      },
      '/api/modules': modules,
    })
    renderAt('/signup')
    await userEvent.type(await screen.findByLabelText('Email'), 'joel@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'short')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Use a password of at least 10 characters.')
    expect(fetchMock).not.toHaveBeenCalledWith('/api/auth/signup', expect.anything())

    await userEvent.type(screen.getByLabelText('Password'), ' and more')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Modules' })).toBeInTheDocument()
  })

  it('links between log in and sign up', async () => {
    mockApi({ '/api/me': unauthorized })
    renderAt('/login')
    await userEvent.click(await screen.findByRole('link', { name: 'Create an account' }))
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Log in' }))
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('goes to the login page when the session runs out mid-visit', async () => {
    let meCalls = 0
    mockApi({
      '/api/me': () => (++meCalls === 1 ? jsonResponse(ME) : unauthorized()),
      '/api/modules': unauthorized,
    })
    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('logs out from the sidebar', async () => {
    let loggedIn = true
    mockApi({
      '/api/me': () => (loggedIn ? jsonResponse(ME) : unauthorized()),
      'POST /api/auth/logout': () => {
        loggedIn = false
        return new Response(null, { status: 204 })
      },
      '/api/modules': modules,
    })
    renderAt('/')
    const nav = await screen.findByRole('navigation', { name: 'Main' })
    expect(within(nav).getByText('joel@example.com')).toBeInTheDocument()
    await userEvent.click(within(nav).getByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('shows a friendly message when the server is unreachable', async () => {
    mockApi({
      '/api/me': () => {
        throw new TypeError('Failed to fetch')
      },
    })
    renderAt('/')
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server. Check your connection and try again.")
  })
})
```

Update `frontend/src/App.test.tsx`: add these cases and keep the existing ones:

```tsx
  it('does not retry a 401', () => {
    expect(shouldRetry(0, new ApiError(401, 'Not logged in'))).toBe(false)
  })

  it('retries a network error (status 0) once', () => {
    expect(shouldRetry(0, new ApiError(0, "Can't reach the server."))).toBe(true)
  })
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/pages/AuthPage.test.tsx src/App.test.tsx`
Expected: FAIL (`makeQueryClient` isn't exported; there's no login page).

- [ ] **Step 4: Rewrite the API client**

Replace `frontend/src/api.ts`:

```ts
export type TaskType = 'learning_path' | 'lab' | 'assessment_step'

export interface ModuleSummary {
  key: string
  code: string
  title: string
  submodule_count: number
  week_count: number
  task_count: number
  completed_count: number
  week_numbers: number[]
  uplearn_url: string | null
}

export interface Task {
  key: string
  title: string
  type: TaskType
  external_url: string | null
  uplearn_url: string | null
  note: string | null
  done: boolean
}

export interface Week {
  key: string
  submodule_key: string
  week_number: number
  title: string
  tasks: Task[]
}

export interface Prerequisite {
  key: string
  title: string
  note: string | null
  external_url: string | null
  uplearn_url: string | null
  completed: boolean
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
  uplearn_url: string | null
  submodules: Submodule[]
  weeks: Week[]
  assessments: Assessment[]
}

export interface Me {
  email: string
  current_week: number | null
  study_mode: 'FT' | 'PT'
}

export class ApiError extends Error {
  /** HTTP status, or 0 when the server couldn't be reached. */
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const isUnauthorized = (error: unknown) => error instanceof ApiError && error.status === 401

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.")
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (typeof data?.detail === 'string') message = data.detail
      else if (res.status === 422) message = 'Check the details you entered and try again.'
    } catch {
      // non-JSON error body; keep the generic message
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const fetchModules = () => request<ModuleSummary[]>('GET', '/modules')
export const fetchModule = (key: string) => request<ModuleDetail>('GET', `/modules/${encodeURIComponent(key)}`)
export const fetchMe = () => request<Me>('GET', '/me')
export const signup = (email: string, password: string) => request<Me>('POST', '/auth/signup', { email, password })
export const login = (email: string, password: string) => request<Me>('POST', '/auth/login', { email, password })
export const logout = () => request<void>('POST', '/auth/logout')
export const updateSettings = (body: { current_week: number | null }) => request<Me>('PATCH', '/me/settings', body)
export const setTaskDone = (key: string, done: boolean) =>
  request<void>(done ? 'PUT' : 'DELETE', `/tasks/${encodeURIComponent(key)}/complete`)
export const setPrerequisiteDone = (key: string, done: boolean) =>
  request<void>(done ? 'PUT' : 'DELETE', `/prerequisites/${encodeURIComponent(key)}/complete`)
```

- [ ] **Step 5: Add the hooks, guard and page**

`frontend/src/usePageTitle.ts`:

```ts
import { useEffect } from 'react'

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Cloudy McHackface`
  }, [title])
}
```

`frontend/src/hooks/useMe.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { fetchMe } from '../api'

/** The signed-in user. Fetched once; refreshed by setQueryData after changes, or invalidated on a 401. */
export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: fetchMe, staleTime: Infinity })
}
```

`frontend/src/components/RequireAuth.tsx`:

```tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isUnauthorized } from '../api'
import { useMe } from '../hooks/useMe'
import { ErrorMessage } from './ErrorMessage'

export function RequireAuth() {
  const me = useMe()
  const location = useLocation()
  if (me.isError) {
    if (isUnauthorized(me.error)) return <Navigate to="/login" replace state={{ from: location.pathname }} />
    return (
      <main className="page">
        <ErrorMessage error={me.error} onRetry={() => me.refetch()} />
      </main>
    )
  }
  if (me.isPending) {
    return (
      <main className="page">
        <p className="muted">Loading…</p>
      </main>
    )
  }
  return <Outlet />
}
```

(Check `isError` before `isPending`. After a 401 on a refetch, the query has old data and an error, and we want the redirect.)

`frontend/src/pages/AuthPage.tsx`:

```tsx
import { useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { login, signup } from '../api'
import { usePageTitle } from '../usePageTitle'

const COPY = {
  login: { title: 'Log in', submit: 'Log in', prompt: 'New here?', link: 'Create an account', to: '/signup' },
  signup: { title: 'Create your account', submit: 'Create account', prompt: 'Already have an account?', link: 'Log in', to: '/login' },
} as const

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const copy = COPY[mode]
  usePageTitle(copy.title)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (mode === 'signup' && password.length < 10) {
      setError('Use a password of at least 10 characters.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const me = await (mode === 'login' ? login : signup)(email, password)
      queryClient.setQueryData(['me'], me)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' && from !== '/signup' ? from : '/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="card auth-card">
        <p className="brand-name">Cloudy McHackface</p>
        <h1>{copy.title}</h1>
        <form className="form" onSubmit={onSubmit} noValidate>
          <label className="field">
            <span>Email</span>
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={mode === 'signup' ? 'password-hint' : undefined}
            />
          </label>
          {mode === 'signup' && (
            <p id="password-hint" className="muted small">
              At least 10 characters.
            </p>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button type="submit" className="button-primary" disabled={busy}>
            {copy.submit}
          </button>
        </form>
        <p className="muted small">
          {copy.prompt}{' '}
          <Link to={copy.to} state={location.state}>
            {copy.link}
          </Link>
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Wire up App.tsx**

Replace `frontend/src/App.tsx`:

```tsx
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ApiError, isUnauthorized } from './api'
import { AppShell } from './components/AppShell'
import { RequireAuth } from './components/RequireAuth'
import { AuthPage } from './pages/AuthPage'
import { ModulePage } from './pages/ModulePage'
import { ModulesPage } from './pages/ModulesPage'
import { NotFoundPage } from './pages/NotFoundPage'

/** Never retry client errors (4xx); retry everything else (5xx, network) once. */
export function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
  return failureCount < 1
}

/** A 401 anywhere means the session ended: re-check who is signed in, which sends them to /login. */
export function makeQueryClient(retry: typeof shouldRetry | false = shouldRetry): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isUnauthorized(error) && query.queryKey[0] !== 'me') void client.invalidateQueries({ queryKey: ['me'] })
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (isUnauthorized(error)) void client.invalidateQueries({ queryKey: ['me'] })
      },
    }),
    defaultOptions: { queries: { retry } },
  })
  return client
}

const queryClient = makeQueryClient()

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage key="login" mode="login" />} />
      <Route path="/signup" element={<AuthPage key="signup" mode="signup" />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<ModulesPage />} />
          <Route path="/modules/:key" element={<ModulePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
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

(The `key` on each `AuthPage` resets the form when switching between `/login` and `/signup`.)

- [ ] **Step 7: Add email and Log out to the sidebar**

In `frontend/src/components/Sidebar.tsx`, add imports:

```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { fetchModules, logout } from '../api'
import { useMe } from '../hooks/useMe'
```

Inside `Sidebar()`:

```tsx
  const me = useMe()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const signOut = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      navigate('/login', { replace: true })
      queryClient.clear()
    },
  })
```

As the last child of `<nav>`, after the modules section:

```tsx
      <div className="sidebar-foot">
        {me.data && <p className="small muted sidebar-email">{me.data.email}</p>}
        {signOut.isError && (
          <p role="alert" className="error small">
            Couldn't log out. Try again.
          </p>
        )}
        <button type="button" className="button-secondary" onClick={() => signOut.mutate()} disabled={signOut.isPending}>
          Log out
        </button>
      </div>
```

- [ ] **Step 8: Add the styles**

Append to `frontend/src/index.css`:

```css
/* Forms and auth */
.button-primary { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 18px; border-radius: 8px; border: 1px solid var(--accent); background: var(--accent); color: var(--surface); font-weight: 600; cursor: pointer; }
.button-primary:hover { background: var(--accent-strong); border-color: var(--accent-strong); }
.button-primary:disabled, .button-secondary:disabled { opacity: 0.6; cursor: default; }
.form { display: flex; flex-direction: column; gap: 14px; }
.form p { margin: 0; }
.field { display: flex; flex-direction: column; gap: 6px; font-weight: 500; }
.field input, .field select { font: inherit; min-height: 44px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--dot-border); background: var(--surface); color: var(--text); }
.field input:focus-visible, .field select:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 16px; }
.auth-card { width: 100%; max-width: 400px; padding: 28px; display: flex; flex-direction: column; gap: 18px; }
.auth-card > p { margin: 0; }
.sidebar-foot { margin-top: auto; display: flex; flex-direction: column; gap: 10px; }
.sidebar-foot p { margin: 0; }
.sidebar-email { overflow-wrap: anywhere; }
```

- [ ] **Step 9: Update existing test fixtures**

- `frontend/src/pages/ModulesPage.test.tsx`: add `completed_count: 0, week_numbers: []` to every module summary fixture (in the `modules` array and the inline `ccc603` one). Give `ccc602` `week_numbers: [9, 10, 11, 12, 13, 14, 15, 16]`. Change the "backend is unreachable" expectation from `'Failed to fetch'` to `"Can't reach the server. Check your connection and try again."`.
- `frontend/src/components/Sidebar.test.tsx`: add `completed_count: 0, week_numbers: []` to each module summary.
- `frontend/src/pages/ModulePage.test.tsx`: add `completed_count: 0, week_numbers: [9, 10]` to the summary, `done: false` to each task in `detail`, and `completed: false` to each prerequisite (the shared `azure` object and the Skillable one).

- [ ] **Step 10: Run all frontend checks**

Run: `npm test`, then `npm run build`, then `npm run lint`
Expected: all tests PASS; the build type-checks; lint is clean.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/api.ts frontend/src/App.tsx frontend/src/App.test.tsx frontend/src/hooks/useMe.ts frontend/src/components/RequireAuth.tsx frontend/src/pages/AuthPage.tsx frontend/src/pages/AuthPage.test.tsx frontend/src/usePageTitle.ts frontend/src/components/Sidebar.tsx frontend/src/index.css frontend/src/test/utils.tsx frontend/src/pages/ModulesPage.test.tsx frontend/src/components/Sidebar.test.tsx frontend/src/pages/ModulePage.test.tsx
git commit -m "feat(frontend): log in, sign up, log out and session handling"
```

---

### Task 6: Frontend ticking and real progress

**Files:**
- Create: `frontend/src/progress.ts`, `frontend/src/progress.test.ts`, `frontend/src/hooks/useTickTask.ts`
- Modify: `frontend/src/components/module/WeekTimeline.tsx`, `frontend/src/components/module/ProgressCard.tsx`, `frontend/src/pages/ModulePage.tsx`, `frontend/src/pages/ModulesPage.tsx`, `frontend/src/components/Sidebar.tsx`, `frontend/src/components/AssessmentsRail.tsx`, `frontend/src/index.css`
- Test: `frontend/src/pages/ModulePage.test.tsx`, `frontend/src/pages/ModulesPage.test.tsx`, `frontend/src/components/Sidebar.test.tsx`, `frontend/src/components/AssessmentsRail.test.tsx`

**Interfaces:**
- Consumes: `setTaskDone`, `ModuleDetail`, `ModuleSummary` (Task 5).
- Produces (`progress.ts`):
  - `percent(done: number, total: number): number`, which rounds down so 100 means all done, and gives 0 when the total is 0
  - `weekDone(week: Week): number`
  - `moduleProgress(mod: ModuleDetail): { done: number; total: number; pct: number; weeksComplete: number; weeksWithTasks: number }`
  - `programmeProgress(modules: ModuleSummary[]): { done: number; total: number; pct: number }`
  - `withTaskDone(mod: ModuleDetail, taskKey: string, done: boolean): ModuleDetail` (doesn't change its input)
- Produces: `useTickTask(moduleKey: string)`, a mutation taking `{ taskKey, done }`. It updates `['module', key]` straight away, rolls back on error, and refetches the module and `['modules']` once the last tick in flight has finished.
- `ExternalLink` already takes an optional `label` (on `main`).
- `WeekTimeline` props: `{ weeks, submodules, onToggleTask: (taskKey: string, done: boolean) => void }`. Task 7 adds `onTogglePrerequisite`; Task 8 adds `currentWeek`.

- [ ] **Step 1: Write the failing progress tests**

Create `frontend/src/progress.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { ModuleDetail, ModuleSummary } from './api'
import { moduleProgress, percent, programmeProgress, withTaskDone } from './progress'

const task = (key: string, done: boolean) => ({ key, title: key, type: 'lab' as const, external_url: null, uplearn_url: 'https://up.test', note: null, done })

const mod: ModuleDetail = {
  key: 'm', code: 'M', title: 'M', uplearn_url: null, assessments: [], submodules: [],
  weeks: [
    { key: 'w1', submodule_key: 's', week_number: 1, title: 'W1', tasks: [task('a', true), task('b', true)] },
    { key: 'w2', submodule_key: 's', week_number: 2, title: 'W2', tasks: [task('c', true), task('d', false)] },
    { key: 'w3', submodule_key: 's', week_number: 3, title: 'W3', tasks: [] },
  ],
}

describe('percent', () => {
  it('is 0 for an empty total', () => expect(percent(0, 0)).toBe(0))
  it('rounds down so 100 means everything is done', () => {
    expect(percent(199, 200)).toBe(99)
    expect(percent(1, 3)).toBe(33)
    expect(percent(3, 3)).toBe(100)
  })
})

describe('moduleProgress', () => {
  it('counts tasks and fully done weeks, ignoring empty weeks', () => {
    expect(moduleProgress(mod)).toEqual({ done: 3, total: 4, pct: 75, weeksComplete: 1, weeksWithTasks: 2 })
  })
})

describe('programmeProgress', () => {
  it('sums every module', () => {
    const summaries = [
      { task_count: 10, completed_count: 5 },
      { task_count: 0, completed_count: 0 },
      { task_count: 10, completed_count: 0 },
    ] as ModuleSummary[]
    expect(programmeProgress(summaries)).toEqual({ done: 5, total: 20, pct: 25 })
  })
})

describe('withTaskDone', () => {
  it('returns a copy with one task changed', () => {
    const next = withTaskDone(mod, 'd', true)
    expect(next.weeks[1].tasks[1].done).toBe(true)
    expect(mod.weeks[1].tasks[1].done).toBe(false)
    expect(next.weeks[0]).toBe(mod.weeks[0])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/progress.test.ts`
Expected: FAIL (the module isn't found).

- [ ] **Step 3: Implement progress.ts**

Create `frontend/src/progress.ts`:

```ts
import type { ModuleDetail, ModuleSummary, Week } from './api'

/** Whole percent, rounded down so 100 only shows when everything is done. 0 when there is nothing to do. */
export function percent(done: number, total: number): number {
  return total === 0 ? 0 : Math.floor((done / total) * 100)
}

export function weekDone(week: Week): number {
  return week.tasks.filter((t) => t.done).length
}

export function moduleProgress(mod: ModuleDetail) {
  let done = 0
  let total = 0
  let weeksComplete = 0
  let weeksWithTasks = 0
  for (const week of mod.weeks) {
    const d = weekDone(week)
    done += d
    total += week.tasks.length
    if (week.tasks.length > 0) {
      weeksWithTasks += 1
      if (d === week.tasks.length) weeksComplete += 1
    }
  }
  return { done, total, pct: percent(done, total), weeksComplete, weeksWithTasks }
}

export function programmeProgress(modules: ModuleSummary[]) {
  const done = modules.reduce((sum, m) => sum + m.completed_count, 0)
  const total = modules.reduce((sum, m) => sum + m.task_count, 0)
  return { done, total, pct: percent(done, total) }
}

export function withTaskDone(mod: ModuleDetail, taskKey: string, done: boolean): ModuleDetail {
  return {
    ...mod,
    weeks: mod.weeks.map((week) =>
      week.tasks.some((t) => t.key === taskKey)
        ? { ...week, tasks: week.tasks.map((t) => (t.key === taskKey ? { ...t, done } : t)) }
        : week,
    ),
  }
}
```

Run: `npx vitest run src/progress.test.ts`
Expected: PASS.

- [ ] **Step 4: Write the failing UI tests**

In `frontend/src/pages/ModulePage.test.tsx`:
- Set `done: true` on task `t1` in `detail` and keep `t2` as `done: false`.
- Replace the test `'shows the progress card at zero with the sign-in note'` with:

```tsx
  it('shows real module progress', async () => {
    const main = await open()
    expect(within(main).getByRole('progressbar', { name: 'Module progress' })).toHaveAttribute('aria-valuenow', '50')
    expect(within(main).getByText('50%')).toBeInTheDocument()
    expect(within(main).getByText('Tasks done').nextElementSibling).toHaveTextContent('1/2')
    expect(within(main).getByText('Weeks complete').nextElementSibling).toHaveTextContent('0/1')
    expect(within(main).getByRole('button', { name: /Week 9/ })).toHaveTextContent('1/2 done')
  })
```

- Replace `'shows task rows with disabled tick boxes, type tags and safe links'` with:

```tsx
  it('shows task rows with tick boxes, type tags and named links', async () => {
    const main = await open()
    await userEvent.click(within(main).getByRole('button', { name: /Week 9/ }))

    const lp1 = within(main).getByText('DP-900 LP1').closest('li')!
    const box = within(lp1).getByRole('checkbox', { name: 'DP-900 LP1' })
    expect(box).toBeEnabled()
    expect(box).toBeChecked()
    expect(within(lp1).getByText('Learning path')).toBeInTheDocument()
    const openLink = within(lp1).getByRole('link', { name: 'Open DP-900 LP1' })
    expect(openLink).toHaveAttribute('href', 'https://learn.test/lp1')
    expect(openLink).toHaveAttribute('target', '_blank')
    expect(openLink).toHaveAttribute('rel', 'noopener noreferrer')

    const brief = within(main).getByText('Read the A3 brief').closest('li')!
    expect(within(brief).getByRole('checkbox', { name: 'Read the A3 brief' })).not.toBeChecked()
    expect(within(brief).getByText('Assessment')).toBeInTheDocument()
    expect(within(brief).queryByRole('link', { name: /^Open/ })).toBeNull()
    expect(within(brief).getByRole('link', { name: 'Read the A3 brief on UPLearn' })).toHaveAttribute('href', 'https://up.test/a3')
  })

  it('ticks a task and progress follows', async () => {
    // The server remembers the tick, so the refetch after saving agrees with the optimistic update.
    let t2Done = false
    const fetchMock = mockApi({
      '/api/modules': summary,
      '/api/modules/ccc602': () =>
        jsonResponse(withTaskDone(detail as ModuleDetail, 't2', t2Done)),
      'PUT /api/tasks/t2/complete': () => {
        t2Done = true
        return new Response(null, { status: 204 })
      },
    })
    renderAt('/modules/ccc602')
    const main = await screen.findByRole('main')
    await userEvent.click(await within(main).findByRole('button', { name: /Week 9/ }))
    await userEvent.click(within(main).getByRole('checkbox', { name: 'Read the A3 brief' }))
    expect(await within(main).findByRole('checkbox', { name: 'Read the A3 brief', checked: true })).toBeInTheDocument()
    await waitFor(() =>
      expect(within(main).getByRole('progressbar', { name: 'Module progress' })).toHaveAttribute('aria-valuenow', '100'),
    )
    expect(fetchMock).toHaveBeenCalledWith('/api/tasks/t2/complete', expect.objectContaining({ method: 'PUT' }))
  })

  it('unticks a task and rolls back when saving fails', async () => {
    mockApi({
      '/api/modules': summary,
      '/api/modules/ccc602': detail,
      'DELETE /api/tasks/t1/complete': () => jsonResponse({ detail: 'Boom' }, 500),
    })
    renderAt('/modules/ccc602')
    const main = await screen.findByRole('main')
    await userEvent.click(await within(main).findByRole('button', { name: /Week 9/ }))
    await userEvent.click(within(main).getByRole('checkbox', { name: 'DP-900 LP1' }))
    expect(await within(main).findByRole('alert')).toHaveTextContent("Couldn't save that tick. Try again.")
    expect(within(main).getByRole('checkbox', { name: 'DP-900 LP1' })).toBeChecked()
  })

  it('uses headings for assessment titles', async () => {
    const main = await open()
    const rail = within(main).getByRole('complementary', { name: 'Assessments' })
    expect(within(rail).getByRole('heading', { level: 3, name: 'Assessment 3' })).toBeInTheDocument()
  })
```

- Update the imports at the top of `ModulePage.test.tsx`: `import { screen, waitFor, within } from '@testing-library/react'`, `import type { ModuleDetail } from '../api'` and `import { withTaskDone } from '../progress'`.
- `'shows the assessments rail and the portal button'` doesn't change.
- In `frontend/src/components/AssessmentsRail.test.tsx`, change `getByRole('link', { name: 'UPLearn' })` to `getByRole('link', { name: 'Assessment 3 on UPLearn' })`.
- In `frontend/src/pages/ModulesPage.test.tsx`, set `ccc602`'s `completed_count: 15` and replace the progress assertion in the first test with:

```tsx
    expect(within(main).getByRole('progressbar', { name: 'CCC602 progress' })).toHaveAttribute('aria-valuenow', '50')
    expect(within(main).getByRole('progressbar', { name: 'Programme progress' })).toHaveAttribute('aria-valuenow', '50')
    expect(within(main).getByText('15 of 30 tasks done')).toBeInTheDocument()
```

- In `frontend/src/components/Sidebar.test.tsx`, set `ccc602`'s `completed_count: 10` and add to the first test:

```tsx
    expect(link).toHaveTextContent('25%')
```

- [ ] **Step 5: Run to verify they fail**

Run: `npm test`
Expected: the new and changed tests FAIL (checkboxes are disabled, progress shows 0, links are named "Open").

- [ ] **Step 6: Implement the tick hook**

Create `frontend/src/hooks/useTickTask.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ModuleDetail, setTaskDone } from '../api'
import { withTaskDone } from '../progress'

/** Tick or untick a task: show it straight away, undo on error, then sync with the server once quiet. */
export function useTickTask(moduleKey: string) {
  const queryClient = useQueryClient()
  const moduleQuery = ['module', moduleKey]
  const mutationKey = ['tick', moduleKey]
  return useMutation({
    mutationKey,
    mutationFn: ({ taskKey, done }: { taskKey: string; done: boolean }) => setTaskDone(taskKey, done),
    onMutate: async ({ taskKey, done }) => {
      await queryClient.cancelQueries({ queryKey: moduleQuery })
      const previous = queryClient.getQueryData<ModuleDetail>(moduleQuery)
      if (previous) queryClient.setQueryData(moduleQuery, withTaskDone(previous, taskKey, done))
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(moduleQuery, context.previous)
    },
    onSettled: () => {
      // Only the last tick in flight refetches, so earlier answers don't overwrite later clicks.
      if (queryClient.isMutating({ mutationKey }) === 1) {
        void queryClient.invalidateQueries({ queryKey: moduleQuery })
        void queryClient.invalidateQueries({ queryKey: ['modules'] })
      }
    },
  })
}
```

- [ ] **Step 7: Update the components**

`frontend/src/components/module/WeekTimeline.tsx`. Changes:
- import `weekDone` from `../../progress`
- `TaskRow` takes `onToggle: (taskKey: string, done: boolean) => void`; the checkbox becomes:

```tsx
      <input
        type="checkbox"
        id={id}
        checked={task.done}
        onChange={() => onToggle(task.key, !task.done)}
        aria-describedby={task.note ? `${id}-note` : undefined}
      />
```

- the links become:

```tsx
        {task.external_url && <ExternalLink href={task.external_url} label={`Open ${task.title}`}>Open</ExternalLink>}
        {task.uplearn_url && <ExternalLink href={task.uplearn_url} label={`${task.title} on UPLearn`}>UPLearn</ExternalLink>}
```

- `WeekCard` takes `onToggleTask`. The week meta becomes:

```tsx
            <span className="week-meta">
              <span className="small muted">
                {week.tasks.length === 0 ? 'No tasks' : `${weekDone(week)}/${week.tasks.length} done`}
              </span>
              <ProgressBar value={percent(weekDone(week), week.tasks.length)} label={`Week ${week.week_number} progress`} size="sm" decorative />
            </span>
```

  Pass `onToggle={onToggleTask}` to each `TaskRow`. Import `percent` too.
- `WeekTimeline` signature:

```tsx
export function WeekTimeline({
  weeks,
  submodules,
  onToggleTask,
}: {
  weeks: Week[]
  submodules: Submodule[]
  onToggleTask: (taskKey: string, done: boolean) => void
}) {
```

  Keep the existing grouping (`groupWeeks`, `SubmoduleHead`, `PrerequisiteBox`) and pass `onToggleTask` to each `WeekCard` inside the groups.

`frontend/src/components/module/ProgressCard.tsx`:

```tsx
import { ProgressBar } from '../ProgressBar'

export function ProgressCard({
  done,
  total,
  pct,
  weeksComplete,
  weeksWithTasks,
}: {
  done: number
  total: number
  pct: number
  weeksComplete: number
  weeksWithTasks: number
}) {
  return (
    <section className="card progress-card" aria-labelledby="progress-heading">
      <div className="progress-main">
        <div className="progress-head">
          <h2 id="progress-heading">Module progress</h2>
          <span className="big-number">{pct}%</span>
        </div>
        <ProgressBar value={pct} label="Module progress" size="lg" />
      </div>
      <dl className="stats">
        <div>
          <dt>Tasks done</dt>
          <dd>
            {done}
            <span className="of">/{total}</span>
          </dd>
        </div>
        <div>
          <dt>Weeks complete</dt>
          <dd>
            {weeksComplete}
            <span className="of">/{weeksWithTasks}</span>
          </dd>
        </div>
      </dl>
    </section>
  )
}
```

`frontend/src/pages/ModulePage.tsx`: call the hooks at the top, before any early return:

```tsx
  const { key = '' } = useParams()
  const query = useQuery({ queryKey: ['module', key], queryFn: () => fetchModule(key) })
  const tick = useTickTask(key)
  usePageTitle(query.data ? `${query.data.code} ${query.data.title}` : 'Module')
```

The success render:

```tsx
  const mod = query.data
  return (
    <main className="page">
      <ModuleHeader code={mod.code} title={mod.title} weeks={mod.weeks} />
      <ProgressCard {...moduleProgress(mod)} />
      {tick.isError && (
        <p role="alert" className="error">
          Couldn't save that tick. Try again.
        </p>
      )}
      <div className="module-columns">
        <WeekTimeline
          key={mod.key}
          weeks={mod.weeks}
          submodules={mod.submodules}
          onToggleTask={(taskKey, done) => tick.mutate({ taskKey, done })}
        />
        <AssessmentsRail code={mod.code} assessments={mod.assessments} portalUrl={mod.uplearn_url} />
      </div>
    </main>
  )
```

(Remove the old `taskCount` local. Add the imports `useTickTask`, `moduleProgress` and `usePageTitle`.)

`frontend/src/pages/ModulesPage.tsx`: import `type ModuleSummary`, `percent`, `programmeProgress` and `usePageTitle`, then add `usePageTitle('Modules')` as the first line of the component. Add this between the header and the grid when there are modules:

```tsx
      {query.data.length > 0 && <ProgrammeProgress modules={query.data} />}
```

with, in the same file:

```tsx
function ProgrammeProgress({ modules }: { modules: ModuleSummary[] }) {
  const { done, total, pct } = programmeProgress(modules)
  return (
    <section className="card progress-card" aria-labelledby="programme-heading">
      <div className="progress-main">
        <div className="progress-head">
          <h2 id="programme-heading">Programme progress</h2>
          <span className="big-number">{pct}%</span>
        </div>
        <ProgressBar value={pct} label="Programme progress" size="lg" />
        <p className="muted small">
          {done} of {plural(total, 'task')} done
        </p>
      </div>
    </section>
  )
}
```

The module card bar becomes `<ProgressBar value={percent(m.completed_count, m.task_count)} label={`${m.code} progress`} />`.

`frontend/src/components/Sidebar.tsx`: in the module list:

```tsx
            {modules.data.map((m) => {
              const pct = percent(m.completed_count, m.task_count)
              return (
                <li key={m.key}>
                  <Link ...same props...>
                    <span className="side-module-top">
                      <span>{m.code}</span>
                      <span aria-hidden="true">{pct}%</span>
                    </span>
                    <span className="side-module-title">{m.title}</span>
                    <ProgressBar value={pct} label={`${m.code} progress`} size="sm" decorative />
                  </Link>
                </li>
              )
            })}
```

`frontend/src/components/AssessmentsRail.tsx`: the title becomes `<h3 className="assessment-title">{a.title}</h3>`, and the link becomes `<ExternalLink href={a.uplearn_url} label={`${a.title} on UPLearn`}>UPLearn</ExternalLink>`.

`frontend/src/index.css`: change the `.assessment-title` rule to:

```css
.assessment-title { margin: 0; font-family: var(--font-body); font-size: 15px; font-weight: 600; line-height: 1.35; }
```

- [ ] **Step 8: Run all frontend checks**

Run: `npm test`, then `npm run build`, then `npm run lint`
Expected: all PASS, clean.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/progress.ts frontend/src/progress.test.ts frontend/src/hooks/useTickTask.ts frontend/src/components/module/WeekTimeline.tsx frontend/src/components/module/ProgressCard.tsx frontend/src/pages/ModulePage.tsx frontend/src/pages/ModulesPage.tsx frontend/src/components/Sidebar.tsx frontend/src/components/AssessmentsRail.tsx frontend/src/index.css frontend/src/pages/ModulePage.test.tsx frontend/src/pages/ModulesPage.test.tsx frontend/src/components/Sidebar.test.tsx frontend/src/components/AssessmentsRail.test.tsx
git commit -m "feat(frontend): tick tasks and show real progress everywhere"
```

---

### Task 7: Frontend prerequisite ticks

The owner wants it to work like this:
- Each item in "Before you start" gets a tick box.
- A ticked item disappears, and because prerequisites are shared, it disappears everywhere the same prerequisite appears, including other modules.
- A small "Show done (n)" button brings done items back so a mistake can be unticked.
- When every item in a box is done, the list is replaced by "You're ready to start learning."
- Prerequisite ticks never move a progress bar.

**Files:**
- Modify: `frontend/src/progress.ts`, `frontend/src/progress.test.ts`, `frontend/src/hooks/useTickTask.ts`, `frontend/src/components/module/PrerequisiteBox.tsx`, `frontend/src/components/module/WeekTimeline.tsx`, `frontend/src/pages/ModulePage.tsx`, `frontend/src/index.css`
- Test: `frontend/src/pages/ModulePage.test.tsx`

**Interfaces:**
- Consumes: `setPrerequisiteDone` and `Prerequisite.completed` (Task 5); `useTickTask` and its `['tick', moduleKey]` mutation key (Task 6); `WeekTimeline({ weeks, submodules, onToggleTask })` (Task 6).
- Produces:
  - `withPrerequisiteDone(mod: ModuleDetail, prerequisiteKey: string, completed: boolean): ModuleDetail`. It updates every submodule listing that key and doesn't change its input.
  - `useTickPrerequisite(moduleKey: string)`, a mutation taking `{ prerequisiteKey, completed }`. It updates the open module straight away, rolls back on error, and when the last tick settles it refetches **every** cached module (`['module']` prefix), because the same prerequisite can appear in other modules.
  - `PrerequisiteBox({ submodule, onToggle: (prerequisiteKey: string, completed: boolean) => void })`
  - `WeekTimeline` gains `onTogglePrerequisite: (prerequisiteKey: string, completed: boolean) => void`

- [ ] **Step 1: Write the failing tests**

Append to `frontend/src/progress.test.ts` (merge `withPrerequisiteDone` into the existing `./progress` import, and add `Submodule` to the type import from `./api`):

```ts
describe('withPrerequisiteDone', () => {
  const prereq = (key: string) => ({ key, title: key, note: null, external_url: 'https://x.test', uplearn_url: null, completed: false })
  const sub = (key: string, keys: string[]): Submodule => ({
    key, code: key, title: key, uplearn_url: null, first_week: 1, last_week: 1, prerequisites: keys.map(prereq),
  })
  const withSubs: ModuleDetail = { ...mod, submodules: [sub('a', ['azure', 'skillable']), sub('b', ['azure']), sub('c', ['aws'])] }

  it('ticks a shared prerequisite in every submodule and leaves others alone', () => {
    const next = withPrerequisiteDone(withSubs, 'azure', true)
    expect(next.submodules[0].prerequisites.map((p) => p.completed)).toEqual([true, false])
    expect(next.submodules[1].prerequisites[0].completed).toBe(true)
    expect(next.submodules[2]).toBe(withSubs.submodules[2])
    expect(withSubs.submodules[0].prerequisites[0].completed).toBe(false)
  })
})
```

In `frontend/src/pages/ModulePage.test.tsx`, import `withPrerequisiteDone` from `../progress` and append inside the `describe`:

```tsx
  it('ticks a prerequisite and hides it everywhere it is shared, without moving progress', async () => {
    let azureDone = false
    const fetchMock = mockApi({
      '/api/modules': summary,
      '/api/modules/ccc602': () => jsonResponse(withPrerequisiteDone(detail as ModuleDetail, 'azure-account', azureDone)),
      'PUT /api/prerequisites/azure-account/complete': () => {
        azureDone = true
        return new Response(null, { status: 204 })
      },
    })
    renderAt('/modules/ccc602')
    const main = await screen.findByRole('main')
    const progressBefore = (await within(main).findByRole('progressbar', { name: 'Module progress' })).getAttribute('aria-valuenow')
    const dp900 = within(main).getByRole('region', { name: 'DP-900 · Azure Data Fundamentals' })

    await userEvent.click(within(dp900).getByRole('checkbox', { name: 'Create an Azure account' }))

    await waitFor(() => expect(within(main).queryByText('Create an Azure account')).toBeNull())
    expect(within(dp900).getByRole('checkbox', { name: 'Register for the DP-900 Skillable class' })).not.toBeChecked()
    const dp203 = within(main).getByRole('region', { name: 'DP-203 · Azure Data Engineer' })
    expect(within(dp203).getByText("You're ready to start learning.")).toBeInTheDocument()
    expect(within(main).getByRole('progressbar', { name: 'Module progress' })).toHaveAttribute('aria-valuenow', progressBefore!)
    expect(fetchMock).toHaveBeenCalledWith('/api/prerequisites/azure-account/complete', expect.objectContaining({ method: 'PUT' }))
  })

  it('shows done prerequisites on request so they can be unticked', async () => {
    const ticked = withPrerequisiteDone(detail as ModuleDetail, 'azure-account', true)
    const fetchMock = mockApi({
      '/api/modules': summary,
      '/api/modules/ccc602': ticked,
      'DELETE /api/prerequisites/azure-account/complete': () => new Response(null, { status: 204 }),
    })
    renderAt('/modules/ccc602')
    const main = await screen.findByRole('main')
    const dp203 = await within(main).findByRole('region', { name: 'DP-203 · Azure Data Engineer' })
    expect(within(dp203).queryByRole('checkbox')).toBeNull()

    await userEvent.click(within(dp203).getByRole('button', { name: 'Show done (1)' }))
    const box = within(dp203).getByRole('checkbox', { name: 'Create an Azure account' })
    expect(box).toBeChecked()
    await userEvent.click(box)
    expect(fetchMock).toHaveBeenCalledWith('/api/prerequisites/azure-account/complete', expect.objectContaining({ method: 'DELETE' }))
  })

  it('brings a prerequisite back when saving the tick fails', async () => {
    mockApi({
      '/api/modules': summary,
      '/api/modules/ccc602': detail,
      'PUT /api/prerequisites/azure-account/complete': () => jsonResponse({ detail: 'Boom' }, 500),
    })
    renderAt('/modules/ccc602')
    const main = await screen.findByRole('main')
    const dp900 = await within(main).findByRole('region', { name: 'DP-900 · Azure Data Fundamentals' })
    await userEvent.click(within(dp900).getByRole('checkbox', { name: 'Create an Azure account' }))
    expect(await within(main).findByRole('alert')).toHaveTextContent("Couldn't save that tick. Try again.")
    expect(within(dp900).getByRole('checkbox', { name: 'Create an Azure account' })).not.toBeChecked()
  })
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test`
Expected: the new tests FAIL (no `withPrerequisiteDone`, no prerequisite checkboxes).

- [ ] **Step 3: Implement the helper and the hook**

Append to `frontend/src/progress.ts`:

```ts
/** Copy of `mod` with one prerequisite ticked or unticked in every submodule that lists it. */
export function withPrerequisiteDone(mod: ModuleDetail, prerequisiteKey: string, completed: boolean): ModuleDetail {
  return {
    ...mod,
    submodules: mod.submodules.map((sub) =>
      sub.prerequisites.some((p) => p.key === prerequisiteKey)
        ? { ...sub, prerequisites: sub.prerequisites.map((p) => (p.key === prerequisiteKey ? { ...p, completed } : p)) }
        : sub,
    ),
  }
}
```

Append to `frontend/src/hooks/useTickTask.ts` (add `setPrerequisiteDone` to the `../api` import and `withPrerequisiteDone` to the `../progress` import):

```ts
/** Like useTickTask, for prerequisites. Shares the same mutation key so task and prerequisite ticks settle together. */
export function useTickPrerequisite(moduleKey: string) {
  const queryClient = useQueryClient()
  const moduleQuery = ['module', moduleKey]
  const mutationKey = ['tick', moduleKey]
  return useMutation({
    mutationKey,
    mutationFn: ({ prerequisiteKey, completed }: { prerequisiteKey: string; completed: boolean }) =>
      setPrerequisiteDone(prerequisiteKey, completed),
    onMutate: async ({ prerequisiteKey, completed }) => {
      await queryClient.cancelQueries({ queryKey: moduleQuery })
      const previous = queryClient.getQueryData<ModuleDetail>(moduleQuery)
      if (previous) queryClient.setQueryData(moduleQuery, withPrerequisiteDone(previous, prerequisiteKey, completed))
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(moduleQuery, context.previous)
    },
    onSettled: () => {
      // Shared prerequisites appear in other modules too, so refresh every cached module.
      if (queryClient.isMutating({ mutationKey }) === 1) void queryClient.invalidateQueries({ queryKey: ['module'] })
    },
  })
}
```

- [ ] **Step 4: Tick boxes in the box**

Replace `frontend/src/components/module/PrerequisiteBox.tsx`:

```tsx
import { useState } from 'react'
import type { Prerequisite, Submodule } from '../../api'
import { ExternalLink } from '../ExternalLink'

type Toggle = (prerequisiteKey: string, completed: boolean) => void

function PrerequisiteRow({ submoduleKey, prerequisite: p, onToggle }: { submoduleKey: string; prerequisite: Prerequisite; onToggle: Toggle }) {
  // The same prerequisite can show under several submodules on one page, so the id includes the submodule.
  const id = `prereq-${submoduleKey}-${p.key}`
  return (
    <li className="prereq-item">
      <input
        type="checkbox"
        id={id}
        checked={p.completed}
        onChange={() => onToggle(p.key, !p.completed)}
        aria-describedby={p.note ? `${id}-note` : undefined}
      />
      <span className="task-main">
        <label htmlFor={id} className="prereq-title">
          {p.title}
        </label>
        {p.note && (
          <span id={`${id}-note`} className="task-note">
            {p.note}
          </span>
        )}
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
  )
}

/** One-off setup steps for a submodule. Done ones are hidden (tickable again via "Show done"); never part of progress. */
export function PrerequisiteBox({ submodule, onToggle }: { submodule: Submodule; onToggle: Toggle }) {
  const [showDone, setShowDone] = useState(false)
  if (submodule.prerequisites.length === 0) return null
  const todo = submodule.prerequisites.filter((p) => !p.completed)
  const done = submodule.prerequisites.filter((p) => p.completed)
  const row = (p: Prerequisite) => <PrerequisiteRow key={p.key} submoduleKey={submodule.key} prerequisite={p} onToggle={onToggle} />
  return (
    <div className={`prereq-box${todo.length === 0 ? ' is-ready' : ''}`}>
      <h4>Before you start</h4>
      {todo.length === 0 ? <p className="prereq-ready">You're ready to start learning.</p> : <ul className="prereq-list">{todo.map(row)}</ul>}
      {done.length > 0 && (
        <>
          <button type="button" className="link-button" aria-expanded={showDone} onClick={() => setShowDone(!showDone)}>
            {showDone ? 'Hide done' : `Show done (${done.length})`}
          </button>
          {showDone && <ul className="prereq-list is-done">{done.map(row)}</ul>}
        </>
      )}
    </div>
  )
}
```

In `frontend/src/components/module/WeekTimeline.tsx`, add `onTogglePrerequisite: (prerequisiteKey: string, completed: boolean) => void` to `WeekTimeline`'s props and render `<PrerequisiteBox submodule={group.submodule} onToggle={onTogglePrerequisite} />`.

In `frontend/src/pages/ModulePage.tsx`:
- Add `const prereqTick = useTickPrerequisite(key)` next to `const tick = useTickTask(key)`.
- The alert condition becomes `(tick.isError || prereqTick.isError)`.
- Pass `onTogglePrerequisite={(prerequisiteKey, completed) => prereqTick.mutate({ prerequisiteKey, completed })}` to `WeekTimeline`.

Append to `frontend/src/index.css`:

```css
.prereq-item input { width: 20px; height: 20px; margin: 0; accent-color: var(--accent); }
.prereq-list.is-done .prereq-title { color: var(--muted); text-decoration: line-through; }
.prereq-ready { margin: 0; font-weight: 600; color: var(--accent-strong); }
.link-button { align-self: flex-start; min-height: 44px; padding: 0; border: 0; background: none; color: var(--accent-strong); font-size: 13px; font-weight: 500; text-decoration: underline; cursor: pointer; }
```

- [ ] **Step 5: Run all frontend checks**

Run: `npm test`, then `npm run build`, then `npm run lint`
Expected: all PASS, clean (apart from the 2 lint warnings already on `main` in `AssessmentsRail.tsx` and `App.tsx`).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/progress.ts frontend/src/progress.test.ts frontend/src/hooks/useTickTask.ts frontend/src/components/module/PrerequisiteBox.tsx frontend/src/components/module/WeekTimeline.tsx frontend/src/pages/ModulePage.tsx frontend/src/pages/ModulePage.test.tsx frontend/src/index.css
git commit -m "feat(frontend): tick prerequisites, hide done ones everywhere, ready message"
```

---

### Task 8: Settings page and current week

**Files:**
- Create: `frontend/src/pages/SettingsPage.tsx`, `frontend/src/pages/SettingsPage.test.tsx`
- Modify: `frontend/src/progress.ts`, `frontend/src/progress.test.ts` (add `weekOptions`)
- Modify: `frontend/src/App.tsx` (route), `frontend/src/components/Sidebar.tsx`, `frontend/src/components/Sidebar.test.tsx`, `frontend/src/components/module/WeekTimeline.tsx`, `frontend/src/pages/ModulePage.tsx`, `frontend/src/pages/ModulePage.test.tsx`, `frontend/src/pages/NotFoundPage.tsx`, `frontend/src/index.css`

**Interfaces:**
- Consumes: `useMe`, `updateSettings`, `fetchModules` (Task 5); `WeekTimeline({ weeks, submodules, onToggleTask, onTogglePrerequisite })` (Tasks 6–7). This task adds its `currentWeek` prop.
- Produces:
  - `weekOptions(modules: ModuleSummary[]): { week: number; label: string }[]`, sorted by week, labelled `"Week 9 · CCC602"`, with modules joined by `", "` when they share a week
  - a `/settings` route
  - the current week card is open on load and shows a "Current week" badge

- [ ] **Step 1: Write the failing tests**

Append to `frontend/src/progress.test.ts`:

```ts
import { weekOptions } from './progress'

describe('weekOptions', () => {
  it('lists each week once, in order, with its modules', () => {
    const modules = [
      { code: 'CCC602', week_numbers: [9, 10] },
      { code: 'CCC601', week_numbers: [1, 2] },
      { code: 'CCC603', week_numbers: [10] },
    ] as ModuleSummary[]
    expect(weekOptions(modules)).toEqual([
      { week: 1, label: 'Week 1 · CCC601' },
      { week: 2, label: 'Week 2 · CCC601' },
      { week: 9, label: 'Week 9 · CCC602' },
      { week: 10, label: 'Week 10 · CCC602, CCC603' },
    ])
  })
})
```

(Merge the import into the existing import line from `./progress`.)

Create `frontend/src/pages/SettingsPage.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ME, jsonResponse, mockApi, renderAt } from '../test/utils'

const modules = [
  { key: 'ccc601', code: 'CCC601', title: 'Admin', week_count: 2, task_count: 2, completed_count: 0, week_numbers: [1, 2], uplearn_url: null },
  { key: 'ccc602', code: 'CCC602', title: 'Data', week_count: 1, task_count: 1, completed_count: 0, week_numbers: [9], uplearn_url: null },
]

describe('SettingsPage', () => {
  it('picks a current week and saves it', async () => {
    const fetchMock = mockApi({
      '/api/modules': modules,
      'PATCH /api/me/settings': (init) => {
        expect(JSON.parse(String(init?.body))).toEqual({ current_week: 9 })
        return jsonResponse({ ...ME, current_week: 9 })
      },
    })
    renderAt('/settings')
    const select = await screen.findByLabelText('Current week')
    expect(select).toHaveValue('')
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Not set', 'Week 1 · CCC601', 'Week 2 · CCC601', 'Week 9 · CCC602',
    ])
    await userEvent.selectOptions(select, 'Week 9 · CCC602')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Saved.')).toHaveAttribute('role', 'status')
    expect(fetchMock).toHaveBeenCalledWith('/api/me/settings', expect.objectContaining({ method: 'PATCH' }))
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByText('Week 9')).toBeInTheDocument()
    expect(document.title).toBe('Settings · Cloudy McHackface')
  })

  it('starts from the saved week and can clear it', async () => {
    mockApi({
      '/api/me': { ...ME, current_week: 2 },
      '/api/modules': modules,
      'PATCH /api/me/settings': (init) => {
        expect(JSON.parse(String(init?.body))).toEqual({ current_week: null })
        return jsonResponse(ME)
      },
    })
    renderAt('/settings')
    const select = await screen.findByLabelText('Current week')
    expect(select).toHaveValue('2')
    await userEvent.selectOptions(select, 'Not set')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Saved.')).toHaveAttribute('role', 'status')
  })

  it('shows the error when saving fails', async () => {
    mockApi({
      '/api/modules': modules,
      'PATCH /api/me/settings': () => jsonResponse({ detail: 'No such week' }, 422),
    })
    renderAt('/settings')
    await userEvent.selectOptions(await screen.findByLabelText('Current week'), 'Week 1 · CCC601')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No such week')
  })
})
```

In `frontend/src/components/Sidebar.test.tsx`, replace the test `'marks Modules as current and shows This week and Assessments as coming soon'` with:

```tsx
  it('marks Modules as current and shows This week and Assessments as coming soon', async () => {
    mockApi({ '/api/modules': modules })
    renderAt('/')
    expect(within(nav()).getByRole('link', { name: 'Modules' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav()).queryByRole('link', { name: /This week/ })).toBeNull()
    expect(within(nav()).queryByRole('link', { name: /^Assessments/ })).toBeNull()
    expect(within(nav()).getByText('This week').closest('.is-disabled')).not.toBeNull()
    expect(within(nav()).getByText('This week').closest('[aria-disabled]')).toBeNull()
    expect(within(nav()).getAllByText('Soon')).toHaveLength(2)
    expect(within(nav()).getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings')
  })

  it('prompts to set a current week, or shows it', async () => {
    mockApi({ '/api/modules': modules })
    renderAt('/')
    expect(await within(nav()).findByRole('link', { name: 'Set your week' })).toHaveAttribute('href', '/settings')
  })

  it('shows the current week with a link to change it', async () => {
    mockApi({ '/api/me': { ...ME, current_week: 9 }, '/api/modules': modules })
    renderAt('/')
    expect(await within(nav()).findByText('Week 9')).toBeInTheDocument()
    expect(within(nav()).getByRole('link', { name: 'Change week' })).toHaveAttribute('href', '/settings')
  })
```

(Add `ME` to the import from `../test/utils`.)

In `frontend/src/pages/ModulePage.test.tsx` add:

```tsx
  it('opens the current week and marks it', async () => {
    mockApi({ '/api/me': { ...ME, current_week: 10 }, '/api/modules': summary, '/api/modules/ccc602': detail })
    renderAt('/modules/ccc602')
    const main = await screen.findByRole('main')
    const week10 = await within(main).findByRole('button', { name: /Week 10/ })
    expect(week10).toHaveAttribute('aria-expanded', 'true')
    expect(within(week10).getByText('Current week')).toBeInTheDocument()
    expect(within(main).getByRole('button', { name: /Week 9/ })).toHaveAttribute('aria-expanded', 'false')
  })
```

(Add `ME` to the import from `../test/utils`.)

- [ ] **Step 2: Run to verify they fail**

Run: `npm test`
Expected: the new tests FAIL.

- [ ] **Step 3: Implement weekOptions**

Append to `frontend/src/progress.ts`:

```ts
export function weekOptions(modules: ModuleSummary[]): { week: number; label: string }[] {
  const byWeek = new Map<number, string[]>()
  for (const m of modules) {
    for (const week of m.week_numbers) byWeek.set(week, [...(byWeek.get(week) ?? []), m.code])
  }
  return [...byWeek.entries()]
    .sort(([a], [b]) => a - b)
    .map(([week, codes]) => ({ week, label: `Week ${week} · ${codes.join(', ')}` }))
}
```

- [ ] **Step 4: Implement the Settings page**

Create `frontend/src/pages/SettingsPage.tsx`:

```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { fetchModules, updateSettings } from '../api'
import { ErrorMessage } from '../components/ErrorMessage'
import { useMe } from '../hooks/useMe'
import { weekOptions } from '../progress'
import { usePageTitle } from '../usePageTitle'

export function SettingsPage() {
  usePageTitle('Settings')
  const me = useMe()
  const modules = useQuery({ queryKey: ['modules'], queryFn: fetchModules })
  const queryClient = useQueryClient()
  const [choice, setChoice] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: (week: number | null) => updateSettings({ current_week: week }),
    onSuccess: (updated) => queryClient.setQueryData(['me'], updated),
  })

  if (modules.isPending || !me.data) {
    return (
      <main className="page">
        <p className="muted">Loading…</p>
      </main>
    )
  }
  if (modules.isError) {
    return (
      <main className="page">
        <ErrorMessage error={modules.error} onRetry={() => modules.refetch()} />
      </main>
    )
  }

  const value = choice ?? (me.data.current_week === null ? '' : String(me.data.current_week))
  function onSubmit(event: FormEvent) {
    event.preventDefault()
    save.mutate(value === '' ? null : Number(value))
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1>Settings</h1>
        <p className="muted">Pick the programme week you're working on. You can change it any time.</p>
      </header>
      <form className="card settings-card form" onSubmit={onSubmit}>
        <label className="field">
          <span>Current week</span>
          <select
            value={value}
            onChange={(e) => {
              setChoice(e.target.value)
              save.reset()
            }}
          >
            <option value="">Not set</option>
            {weekOptions(modules.data).map((o) => (
              <option key={o.week} value={o.week}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="settings-actions">
          <button type="submit" className="button-primary" disabled={save.isPending}>
            Save
          </button>
          <p role="status" className="small muted">
            {save.isSuccess ? 'Saved.' : ''}
          </p>
        </div>
        {save.isError && (
          <p role="alert" className="error">
            {save.error.message}
          </p>
        )}
      </form>
    </main>
  )
}
```

Add the route in `frontend/src/App.tsx`, inside the `AppShell` route before the `*` route: `<Route path="/settings" element={<SettingsPage />} />` (and import it).

- [ ] **Step 5: Sidebar — Settings link, current week, a11y fix**

In `frontend/src/components/Sidebar.tsx`:
- Remove `aria-disabled="true"` from both disabled `span.nav-item` elements. Keep `className="nav-item is-disabled"`.
- Add a Settings item to `.nav-list` after Assessments:

```tsx
        <li>
          <Link to="/settings" className="nav-item" aria-current={pathname === '/settings' ? 'page' : undefined}>
            <Icon>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </Icon>
            Settings
          </Link>
        </li>
```

- At the top of `.sidebar-foot`, before the email:

```tsx
        {me.data && (
          <p className="small">
            {me.data.current_week === null ? (
              <>
                No current week yet. <Link to="/settings">Set your week</Link>
              </>
            ) : (
              <>
                You're on <strong>Week {me.data.current_week}</strong>. <Link to="/settings">Change week</Link>
              </>
            )}
          </p>
        )}
```

- [ ] **Step 6: Current week on the module page**

In `frontend/src/components/module/WeekTimeline.tsx`:
- `WeekTimeline` gains a `currentWeek: number | null` prop and passes `isCurrent={week.week_number === currentWeek}` to each `WeekCard`; `WeekCard` gains `isCurrent: boolean`.
- `WeekTimeline` starts with the current week open:

```tsx
  const [openKey, setOpenKey] = useState<string | null>(
    () => weeks.find((w) => w.week_number === currentWeek)?.key ?? null,
  )
```

- In `WeekCard`, the dot becomes `<span className={`timeline-dot${isCurrent ? ' is-current' : ''}`}>`, and inside `.week-label` after the "Week N" span:

```tsx
              {isCurrent && <span className="current-badge">Current week</span>}
```

In `frontend/src/pages/ModulePage.tsx`, call `const me = useMe()` with the other hooks at the top and pass `currentWeek={me.data?.current_week ?? null}` to `WeekTimeline`.

In `frontend/src/pages/NotFoundPage.tsx`, add `usePageTitle('Page not found')`.

Append to `frontend/src/index.css`:

```css
/* Settings and current week */
.settings-card { padding: 24px; max-width: 480px; }
.settings-actions { display: flex; align-items: center; gap: 14px; }
.current-badge { align-self: flex-start; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; background: var(--accent-soft); color: var(--accent-strong); }
.timeline-dot.is-current { border-color: var(--accent); background: var(--accent); color: var(--surface); }
```

- [ ] **Step 7: Run all frontend checks**

Run: `npm test`, then `npm run build`, then `npm run lint`
Expected: all PASS, clean.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/SettingsPage.tsx frontend/src/pages/SettingsPage.test.tsx frontend/src/progress.ts frontend/src/progress.test.ts frontend/src/App.tsx frontend/src/components/Sidebar.tsx frontend/src/components/Sidebar.test.tsx frontend/src/components/module/WeekTimeline.tsx frontend/src/pages/ModulePage.tsx frontend/src/pages/ModulePage.test.tsx frontend/src/pages/NotFoundPage.tsx frontend/src/index.css
git commit -m "feat(frontend): settings page and current week"
```

---

### Task 9: Docs and end-to-end check

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md**

- Status line: `Status: Phase 2 done — accounts, task and prerequisite ticking, real progress bars and a current-week setting; CCC601–603 seeded with submodules.`
- In "MVP scope", replace the sentence `tick boxes are disabled and progress shows 0% until accounts land.` with `module pages need a login; progress comes from each user's ticks.`
- Under the backend commands, add: `- Set COOKIE_SECURE=true in backend/.env once the app is served over HTTPS.`

- [ ] **Step 2: Full verification**

Run in `backend/`: `uv run pytest`, then `uv run alembic check`
Run in `frontend/`: `npm test`, then `npm run build`, then `npm run lint`
Expected: all PASS / clean.

- [ ] **Step 3: Try it in the browser**

Start the backend and the frontend. Don't kill anything on 5173, or the old main-checkout servers that often sit on 8000 and 5174–5176. If 8000 is taken, run the backend on a free port (e.g. `uv run uvicorn app.main:app --port 8001`) and the frontend with an untracked config that points `/api` there. Copy `frontend/vite.local.config.ts` from `.claude/worktrees/submodules`, then run `npx vite --config vite.local.config.ts --port <free port> --strictPort`. Then check that you can:
1. Open the app and land on Log in.
2. Create an account and land on Modules with 0% programme progress.
3. Open CCC602, tick two tasks, and see the week, module, sidebar and programme bars move.
4. Reload the page and see the ticks still there.
5. In Settings, set Week 10. CCC602 then opens with Week 10 expanded and badged.
6. In CCC601, tick "Create an AWS console account" under CLF-C02. It disappears there and under SAA-C03, it's gone from CCC602's DEA-C01 box too, and no progress bar moves. "Show done" brings it back.
7. Tick every item in one box and see "You're ready to start learning."
8. Log out, land on Log in, and confirm `/modules/ccc602` sends you back to Log in.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: Phase 2 status"
```
