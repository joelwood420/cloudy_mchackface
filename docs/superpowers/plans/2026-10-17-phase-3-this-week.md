# Phase 3: This Week, Deadlines and Breaks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "This week" home screen that works out the student's current week from their intake's dates, shows that week's tasks, unfinished earlier tasks ("malware"), break and holiday notices, and upcoming or overdue assessments with a per-user "submitted" tick, and pre-ticks past work for students who join mid-programme.

**Architecture:** A new `seed/schedule.yaml` loads intakes (week start dates and holidays) into the database, and every user is put on one intake. A pure `app/schedule.py` turns (weeks, today) into a position: before start, teaching week N, break, or finished. `GET /this-week` builds the page from that position. The frontend gets a new home page at `/`, an Assessments page, and "Coming soon" handling for the CCC604 shell. The manual week picker and the Settings page are removed.

**Tech Stack:** FastAPI, SQLAlchemy 2, Alembic, pytest, Neon Postgres (backend); React 19, TypeScript, TanStack Query 5, React Router 7, Vitest + Testing Library (frontend).

**Spec:** `docs/superpowers/specs/2026-10-17-phase-3-this-week-design.md`

## Global Constraints

- Work in the worktree `C:\Users\joelw\cloudy_mchackface\.claude\worktrees\phase-3` on branch `phase-3`. Backend commands run in `backend/`, frontend commands in `frontend/`.
- "Today" is always the date in `Pacific/Auckland`. Every endpoint that needs it takes the `today` dependency from `app/clock.py` so tests can pin it.
- The default intake key is `2607-online-ccc-ft` (config `default_intake_key`).
- A teaching week runs Monday to Sunday (`starts_on` + 6 days). Breaks are only ever derived from gaps between week start dates.
- Upcoming-break warning: shown in the last **two** teaching weeks before a break.
- Assessments on This week: due in today..today+28 days (submitted or not), plus due before today and not submitted. Assessments with no due date are left out.
- Prerequisites never count toward progress or "lurking".
- Portal data rules (CLAUDE.md): store structure, dates and public links only. Never copy Yoobee text, keys, Teams/Calendly links or other students' data.
- The full backend suite takes about 5 minutes (Neon test branch). Run the task's own test files while iterating, and the full suite once at the end of each backend task.
- Never kill whatever is on port 5173 (it belongs to the owner's other project). In Git Bash, `taskkill` needs `//PID`.
- Copy used verbatim in the UI: "MALWARE DETECTED", "Quarantine them", "You're ahead of schedule 🎉", "You're on break 🌴", "Coming soon", "Mark submitted", "Content for this week isn't in the app yet.", "We've marked weeks 1–N as done. Untick anything you haven't finished."
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **NZ midnight rollover:** at 00:30 Monday NZ time (still Sunday in UTC), the student must see the new week. Pinned by `test_nz_today_uses_auckland_time` (Task 2).
2. **Re-seeding with users on an intake:** running the seed loader again must replace weeks and holidays without a primary-key clash or FK error, and keep users on their intake. Pinned by `test_reapplying_schedule_keeps_users_and_replaces_weeks` (Task 3).
3. **Two modules in the same week number:** groups must come out in module order and not mix up tasks. Pinned by `test_groups_cover_every_module_in_the_week_in_module_order` (Task 5).
4. **Due today at sign-up:** an assessment due today is not "past", so catch-up must not mark it submitted. Pinned by `test_catch_up_leaves_assessments_due_today_alone` (Task 6).
5. **Ticking on This week updates progress everywhere:** a tick on the home page must refresh the module page, the module list and the sidebar. Pinned by `"refreshes this week, modules and module pages after a tick"` (Task 9).

---

## File map

Backend (new):
- `backend/app/clock.py`: `nz_today()`, `today()` dependency
- `backend/app/schedule.py`: pure calendar logic
- `backend/app/catchup.py`: pre-ticking at sign-up
- `backend/app/api/assessments.py`: assessment status, list and submit routes
- `backend/app/api/this_week.py`: `GET /this-week`
- `backend/alembic/versions/0008_intakes_and_submissions.py`
- Tests: `tests/test_clock.py`, `tests/test_schedule.py`, `tests/test_schedule_seed.py`, `tests/test_assessments_api.py`, `tests/test_this_week_api.py`, `tests/test_catchup.py`

Backend (modified): `app/models.py`, `app/config.py`, `app/api/schemas.py`, `app/api/auth.py`, `app/api/modules.py`, `app/main.py`, `app/seed/schema.py`, `app/seed/loader.py`, `app/seed/__main__.py`, `pyproject.toml`, and tests `conftest.py`, `test_accounts_models.py`, `test_auth_api.py`, `test_migrations.py`, `test_modules_api.py`, `test_seed_validation.py`, `test_seed_apply.py`, `test_seed_files.py`

Seed: `seed/schedule.yaml` (new), `seed/ccc604.yaml` (new)

Frontend (new):
- `src/hooks/useThisWeek.ts`: `useThisWeek`, `useTickThisWeekTask`, `useTickThisWeekPrerequisite`
- `src/hooks/useSubmitAssessment.ts`
- `src/pages/ThisWeekPage.tsx` (+ test)
- `src/pages/AssessmentsPage.tsx` (+ test)
- `src/components/thisweek/WeekGroups.tsx`, `MalwareBanner.tsx`, `Notices.tsx`

Frontend (modified): `src/api.ts`, `src/App.tsx`, `src/format.ts`, `src/progress.ts`, `src/hooks/useTickTask.ts`, `src/components/Sidebar.tsx`, `src/components/AssessmentsRail.tsx`, `src/components/module/ModuleHeader.tsx`, `src/pages/ModulePage.tsx`, `src/pages/ModulesPage.tsx`, `src/pages/NotFoundPage.tsx`, `src/pages/AuthPage.tsx`, `src/index.css`, `src/test/utils.tsx`, and their tests. Deleted: `src/pages/SettingsPage.tsx`, `src/pages/SettingsPage.test.tsx`.

Docs: `CLAUDE.md`, `docs/superpowers/specs/2026-10-15-yoobee-study-guide-design.md`

---

### Task 1: Calendar logic (`app/schedule.py`)

Pure functions, no database. Everything else builds on this.

**Files:**
- Create: `backend/app/schedule.py`
- Create: `backend/tests/test_schedule.py`
- Modify: `backend/tests/conftest.py` (add `FT_WEEKS` only)

**Interfaces:**
- Produces:
  - `TeachingWeek(week_number: int, starts_on: date)` frozen dataclass with property `ends_on: date`
  - `Break(starts_on: date, ends_on: date, length_weeks: int, resumes_week: int, resumes_on: date)` frozen dataclass
  - `Position(status: Literal["before_start","teaching","break","finished"], cutoff_week: int | None, week: TeachingWeek | None = None, brk: Break | None = None, week_of_break: int | None = None, next_week: TeachingWeek | None = None)` frozen dataclass
  - `breaks(weeks: Sequence[TeachingWeek]) -> list[Break]`
  - `locate(weeks: Sequence[TeachingWeek], today: date) -> Position`
  - `upcoming_break(weeks: Sequence[TeachingWeek], today: date) -> Break | None`
  - `tests.conftest.FT_WEEKS: list[tuple[int, date]]`, the real 2607 FT week starts

`cutoff_week` meaning: weeks numbered **below** it are in the past. Teaching → the current week's number. Break → the next week's number. Finished → last week number + 1. Before start (or no weeks) → `None`.

- [ ] **Step 1: Add `FT_WEEKS` to conftest**

Add near the top of `backend/tests/conftest.py` (after the imports; add `from datetime import date, timedelta`):

```python
def _run(first: int, start: date, count: int) -> list[tuple[int, date]]:
    return [(first + i, start + timedelta(weeks=i)) for i in range(count)]


# The 2607 FT intake's week start dates (docs/portal-extras.md). Breaks: 14–27 Sep 2026, 21 Dec–10 Jan, 8–28 Feb 2027.
FT_WEEKS = (
    _run(1, date(2026, 7, 20), 8)
    + _run(9, date(2026, 9, 28), 12)
    + _run(21, date(2027, 1, 11), 4)
    + _run(25, date(2027, 3, 1), 8)
)
```

- [ ] **Step 2: Write the failing tests**

`backend/tests/test_schedule.py`:

```python
from datetime import date

from app.schedule import Break, TeachingWeek, breaks, locate, upcoming_break
from tests.conftest import FT_WEEKS

WEEKS = [TeachingWeek(n, d) for n, d in FT_WEEKS]
SEP_BREAK = Break(date(2026, 9, 14), date(2026, 9, 27), 2, 9, date(2026, 9, 28))
DEC_BREAK = Break(date(2026, 12, 21), date(2027, 1, 10), 3, 21, date(2027, 1, 11))
FEB_BREAK = Break(date(2027, 2, 8), date(2027, 2, 28), 3, 25, date(2027, 3, 1))


def test_week_runs_monday_to_sunday():
    assert TeachingWeek(11, date(2026, 10, 12)).ends_on == date(2026, 10, 18)


def test_breaks_come_from_gaps_between_weeks():
    assert breaks(WEEKS) == [SEP_BREAK, DEC_BREAK, FEB_BREAK]


def test_before_the_first_monday():
    pos = locate(WEEKS, date(2026, 7, 19))
    assert pos.status == "before_start"
    assert pos.next_week == TeachingWeek(1, date(2026, 7, 20))
    assert pos.cutoff_week is None


def test_first_monday_is_week_one():
    pos = locate(WEEKS, date(2026, 7, 20))
    assert (pos.status, pos.week.week_number, pos.cutoff_week) == ("teaching", 1, 1)


def test_sunday_is_still_the_same_week_and_monday_rolls_over():
    assert locate(WEEKS, date(2026, 10, 18)).week.week_number == 11
    assert locate(WEEKS, date(2026, 10, 19)).week.week_number == 12


def test_inside_a_break():
    pos = locate(WEEKS, date(2026, 9, 14))
    assert pos.status == "break"
    assert pos.brk == SEP_BREAK
    assert pos.week_of_break == 1
    assert pos.next_week == TeachingWeek(9, date(2026, 9, 28))
    assert pos.cutoff_week == 9
    assert pos.week is None
    assert locate(WEEKS, date(2026, 9, 27)).week_of_break == 2


def test_christmas_break_counts_its_weeks():
    assert locate(WEEKS, date(2026, 12, 25)).week_of_break == 1
    assert locate(WEEKS, date(2027, 1, 10)).week_of_break == 3
    assert locate(WEEKS, date(2027, 1, 11)).week.week_number == 21


def test_after_the_last_sunday():
    assert locate(WEEKS, date(2027, 4, 25)).week.week_number == 32
    pos = locate(WEEKS, date(2027, 4, 26))
    assert (pos.status, pos.cutoff_week, pos.week) == ("finished", 33, None)


def test_no_weeks_means_before_start_with_nothing_next():
    pos = locate([], date(2026, 10, 17))
    assert (pos.status, pos.next_week, pos.cutoff_week) == ("before_start", None, None)


def test_upcoming_break_in_the_last_two_weeks_before_it():
    assert upcoming_break(WEEKS, date(2026, 9, 2)) == SEP_BREAK  # week 7
    assert upcoming_break(WEEKS, date(2026, 9, 13)) == SEP_BREAK  # week 8, Sunday
    assert upcoming_break(WEEKS, date(2026, 8, 30)) is None  # week 6
    assert upcoming_break(WEEKS, date(2026, 12, 7)) == DEC_BREAK  # week 19
    assert upcoming_break(WEEKS, date(2027, 2, 1)) == FEB_BREAK  # week 24


def test_no_upcoming_break_at_the_end_or_during_a_break():
    assert upcoming_break(WEEKS, date(2027, 4, 19)) is None  # week 32: the programme just ends
    assert upcoming_break(WEEKS, date(2026, 9, 20)) is None  # already on break
    assert upcoming_break(WEEKS, date(2026, 7, 1)) is None  # before start
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `uv run pytest tests/test_schedule.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.schedule'`

- [ ] **Step 4: Implement**

`backend/app/schedule.py`:

```python
"""Where a date falls in an intake's teaching calendar. Pure functions; the database never comes in here.

Weeks must be sorted by start date and start on Mondays (the seed loader checks both)."""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Literal

Status = Literal["before_start", "teaching", "break", "finished"]
ONE_WEEK = timedelta(days=7)


@dataclass(frozen=True)
class TeachingWeek:
    week_number: int
    starts_on: date

    @property
    def ends_on(self) -> date:
        return self.starts_on + timedelta(days=6)


@dataclass(frozen=True)
class Break:
    starts_on: date
    ends_on: date
    length_weeks: int
    resumes_week: int
    resumes_on: date


@dataclass(frozen=True)
class Position:
    status: Status
    # Weeks numbered below this are in the past. None when nothing is past yet.
    cutoff_week: int | None
    week: TeachingWeek | None = None
    brk: Break | None = None
    week_of_break: int | None = None
    next_week: TeachingWeek | None = None


def breaks(weeks: Sequence[TeachingWeek]) -> list[Break]:
    out = []
    for prev, nxt in zip(weeks, weeks[1:]):
        if nxt.starts_on > prev.starts_on + ONE_WEEK:
            starts = prev.ends_on + timedelta(days=1)
            out.append(Break(starts, nxt.starts_on - timedelta(days=1), (nxt.starts_on - starts).days // 7, nxt.week_number, nxt.starts_on))
    return out


def locate(weeks: Sequence[TeachingWeek], today: date) -> Position:
    if not weeks or today < weeks[0].starts_on:
        return Position("before_start", None, next_week=weeks[0] if weeks else None)
    if today > weeks[-1].ends_on:
        return Position("finished", weeks[-1].week_number + 1)
    for week in weeks:
        if week.starts_on <= today <= week.ends_on:
            return Position("teaching", week.week_number, week=week)
    brk = next(b for b in breaks(weeks) if b.starts_on <= today <= b.ends_on)
    resumes = next(w for w in weeks if w.week_number == brk.resumes_week)
    return Position(
        "break", resumes.week_number, brk=brk, week_of_break=(today - brk.starts_on).days // 7 + 1, next_week=resumes
    )


def upcoming_break(weeks: Sequence[TeachingWeek], today: date) -> Break | None:
    """The break straight after this week or next week, while teaching. None otherwise."""
    pos = locate(weeks, today)
    if pos.week is None:
        return None
    i = list(weeks).index(pos.week)
    starts = {b.starts_on: b for b in breaks(weeks)}
    for week in weeks[i : i + 2]:
        found = starts.get(week.ends_on + timedelta(days=1))
        if found:
            return found
    return None
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `uv run pytest tests/test_schedule.py -v`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/schedule.py backend/tests/test_schedule.py backend/tests/conftest.py
git commit -m "feat(schedule): work out the current week, breaks and upcoming breaks from week start dates"
```

---

### Task 2: Intakes, submissions and the NZ clock in the database

**Files:**
- Create: `backend/app/clock.py`, `backend/tests/test_clock.py`
- Create: `backend/alembic/versions/0008_intakes_and_submissions.py`
- Modify: `backend/app/models.py`, `backend/app/config.py`, `backend/app/api/schemas.py`, `backend/app/api/auth.py`, `backend/pyproject.toml`
- Modify tests: `backend/tests/conftest.py`, `backend/tests/test_accounts_models.py`, `backend/tests/test_auth_api.py`, `backend/tests/test_migrations.py`

**Interfaces:**
- Consumes: `FT_WEEKS` (Task 1)
- Produces:
  - Models `Intake(id, key, title, study_mode, weeks: list[IntakeWeek] ordered by starts_on, holidays: list[IntakeHoliday] ordered by day)`, `IntakeWeek(intake_id, week_number, starts_on)`, `IntakeHoliday(intake_id, day, name)`, `AssessmentSubmission(user_id, assessment_id, submitted_at)`
  - `UserSettings.intake_id`, `UserSettings.intake` (`current_week` and `study_mode` removed)
  - `app.clock.today() -> date` (FastAPI dependency), `app.clock.nz_today(now: datetime | None = None) -> date`
  - `Settings.default_intake_key: str = "2607-online-ccc-ft"`
  - Schemas `IntakeOut(key, title)`, `MeOut(email, study_mode, intake: IntakeOut)`; `SettingsIn` removed
  - conftest fixtures: `intake` (the default intake row, no weeks), `today_is` (returns `set(d: date)` that pins `today`), and helper `add_schedule(db, intake, weeks=FT_WEEKS, holidays=())`
  - `POST /auth/signup` returns 503 `"The course schedule isn't loaded yet. Try again later."` when the default intake is missing
  - `PATCH /me/settings` removed

- [ ] **Step 1: Add tzdata (Windows has no system time zone database)**

Run: `uv add tzdata`
Expected: `pyproject.toml` lists `tzdata`.

- [ ] **Step 2: Write the failing clock test**

`backend/tests/test_clock.py`:

```python
from datetime import UTC, datetime

from app.clock import nz_today


def test_nz_today_uses_auckland_time():
    # 11:30 UTC on Sunday 18 Oct 2026 is 00:30 Monday 19 Oct in NZ (daylight time, UTC+13).
    assert nz_today(datetime(2026, 10, 18, 11, 30, tzinfo=UTC)).isoformat() == "2026-10-19"
    assert nz_today(datetime(2026, 10, 18, 10, 59, tzinfo=UTC)).isoformat() == "2026-10-18"
```

Run: `uv run pytest tests/test_clock.py -v` → FAIL (`No module named 'app.clock'`).

- [ ] **Step 3: Implement the clock**

`backend/app/clock.py`:

```python
from datetime import date, datetime
from zoneinfo import ZoneInfo

NZ = ZoneInfo("Pacific/Auckland")


def nz_today(now: datetime | None = None) -> date:
    return (now or datetime.now(NZ)).astimezone(NZ).date()


def today() -> date:
    """FastAPI dependency for today's date in NZ. Tests override it to pin a date."""
    return nz_today()
```

Run: `uv run pytest tests/test_clock.py -v` → PASS.

- [ ] **Step 4: Models**

In `backend/app/models.py`:

1. Add after `Assessment` (and give `Assessment` a `submissions` relationship like `Task.completions`):

```python
class Intake(Base):
    """One cohort's teaching calendar (e.g. July 2026 full-time). Loaded from seed/schedule.yaml."""

    __tablename__ = "intakes"
    __table_args__ = (CheckConstraint("study_mode IN ('FT', 'PT')", name="study_mode"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(100), unique=True)
    title: Mapped[str] = mapped_column(String(200))
    study_mode: Mapped[str] = mapped_column(String(2))

    weeks: Mapped[list["IntakeWeek"]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True, order_by="IntakeWeek.starts_on"
    )
    holidays: Mapped[list["IntakeHoliday"]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True, order_by="IntakeHoliday.day"
    )


class IntakeWeek(Base):
    __tablename__ = "intake_weeks"

    intake_id: Mapped[int] = mapped_column(ForeignKey("intakes.id", ondelete="CASCADE"), primary_key=True)
    week_number: Mapped[int] = mapped_column(primary_key=True)
    starts_on: Mapped[date] = mapped_column(Date)


class IntakeHoliday(Base):
    __tablename__ = "intake_holidays"

    intake_id: Mapped[int] = mapped_column(ForeignKey("intakes.id", ondelete="CASCADE"), primary_key=True)
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))


class AssessmentSubmission(Base):
    """A user's "I've submitted this" tick on an assessment."""

    __tablename__ = "assessment_submissions"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    assessment_id: Mapped[int] = mapped_column(
        ForeignKey("assessments.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

`Assessment` gains:

```python
    submissions: Mapped[list["AssessmentSubmission"]] = relationship(cascade="all, delete-orphan", passive_deletes=True)
```

`User` gains (next to `prerequisite_completions`):

```python
    assessment_submissions: Mapped[list["AssessmentSubmission"]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True
    )
```

2. Replace `UserSettings` with:

```python
class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    # No cascade: the seed loader refuses to delete an intake that anyone is on.
    intake_id: Mapped[int] = mapped_column(ForeignKey("intakes.id"), index=True)

    user: Mapped[User] = relationship(back_populates="settings")
    intake: Mapped[Intake] = relationship()
```

`Intake` must be defined above `UserSettings` (move the new classes above `User` if needed; string relationship targets also work).

- [ ] **Step 5: Config and schemas**

`backend/app/config.py`, in `Settings`:

```python
    # Intake new accounts are put on (seed/schedule.yaml).
    default_intake_key: str = "2607-online-ccc-ft"
```

`backend/app/api/schemas.py`: delete `SettingsIn`; replace `MeOut` with:

```python
class IntakeOut(_Out):
    key: str
    title: str


class MeOut(BaseModel):
    email: str
    study_mode: str
    intake: IntakeOut
```

- [ ] **Step 6: Auth routes**

In `backend/app/api/auth.py`:
- imports: drop `SettingsIn`, `Week`; add `Intake`.
- add `NO_SCHEDULE = "The course schedule isn't loaded yet. Try again later."`
- `_me`:

```python
def _me(user: User) -> MeOut:
    intake = user.settings.intake
    return MeOut(email=user.email, study_mode=intake.study_mode, intake=IntakeOut.model_validate(intake))
```

- in `signup`, after the email-taken check:

```python
    intake = db.scalars(select(Intake).where(Intake.key == get_settings().default_intake_key)).one_or_none()
    if intake is None:
        raise HTTPException(status_code=503, detail=NO_SCHEDULE)
```

and build the user with `settings=UserSettings(intake=intake)`.
- delete the `update_settings` route.

- [ ] **Step 7: Migration 0008**

`backend/alembic/versions/0008_intakes_and_submissions.py`:

```python
"""intakes with week dates and holidays, assessment submissions; users move onto an intake

Revision ID: 0008
Revises: 0007
"""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None

DEFAULT_KEY = "2607-online-ccc-ft"


def upgrade() -> None:
    op.create_table(
        "intakes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(100), nullable=False, unique=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("study_mode", sa.String(2), nullable=False),
        sa.CheckConstraint("study_mode IN ('FT', 'PT')", name="study_mode"),
    )
    op.create_table(
        "intake_weeks",
        sa.Column("intake_id", sa.Integer(), sa.ForeignKey("intakes.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("week_number", sa.Integer(), primary_key=True),
        sa.Column("starts_on", sa.Date(), nullable=False),
    )
    op.create_table(
        "intake_holidays",
        sa.Column("intake_id", sa.Integer(), sa.ForeignKey("intakes.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("day", sa.Date(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
    )
    op.create_table(
        "assessment_submissions",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column(
            "assessment_id", sa.Integer(), sa.ForeignKey("assessments.id", ondelete="CASCADE"), primary_key=True
        ),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_assessment_submissions_assessment_id", "assessment_submissions", ["assessment_id"])

    # Existing accounts go on the one intake there is. The seed loader fills in its weeks and holidays.
    op.execute(
        f"INSERT INTO intakes (key, title, study_mode) "
        f"VALUES ('{DEFAULT_KEY}', 'July 2026 intake, full-time (NZ4129)', 'FT')"
    )
    op.add_column("user_settings", sa.Column("intake_id", sa.Integer(), nullable=True))
    op.execute(f"UPDATE user_settings SET intake_id = (SELECT id FROM intakes WHERE key = '{DEFAULT_KEY}')")
    op.alter_column("user_settings", "intake_id", nullable=False)
    op.create_foreign_key("user_settings_intake_id_fkey", "user_settings", "intakes", ["intake_id"], ["id"])
    op.create_index("ix_user_settings_intake_id", "user_settings", ["intake_id"])
    op.drop_column("user_settings", "current_week")
    op.drop_column("user_settings", "study_mode")  # its check constraint goes with it


def downgrade() -> None:
    op.add_column("user_settings", sa.Column("study_mode", sa.String(2), nullable=False, server_default="FT"))
    op.create_check_constraint("study_mode", "user_settings", "study_mode IN ('FT', 'PT')")
    op.add_column("user_settings", sa.Column("current_week", sa.Integer(), nullable=True))
    op.drop_index("ix_user_settings_intake_id", table_name="user_settings")
    op.drop_constraint("user_settings_intake_id_fkey", "user_settings", type_="foreignkey")
    op.drop_column("user_settings", "intake_id")
    op.drop_index("ix_assessment_submissions_assessment_id", table_name="assessment_submissions")
    op.drop_table("assessment_submissions")
    op.drop_table("intake_holidays")
    op.drop_table("intake_weeks")
    op.drop_table("intakes")
```

Constraint names: 0006 shows that a `name="study_mode"` check gets the naming convention applied (it becomes `<table>_study_mode_check`). If `op.create_check_constraint` in the downgrade produces a doubled name, use the full name `user_settings_study_mode_check` wrapped in `sa.sql.elements.conv(...)`. The migration test below catches either mistake.

- [ ] **Step 8: Test fixtures**

In `backend/tests/conftest.py` (imports: `from app.clock import today`, `from app.models import Intake, IntakeHoliday, IntakeWeek`):

```python
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
```

(Replace the existing `client` fixture; it now depends on `intake`.)

- [ ] **Step 9: Update existing tests**

`backend/tests/test_accounts_models.py`:
- `make_user(db, intake, email="joel@example.com")` builds `UserSettings(intake=intake)`; every caller passes the `intake` fixture (add `intake` to those tests' parameters).
- Replace `test_new_user_gets_default_settings`:

```python
def test_new_user_is_on_an_intake(db, intake):
    user = make_user(db, intake)
    db.expire_all()
    settings = db.get(UserSettings, user.id)
    assert settings.intake.key == "2607-online-ccc-ft"
    assert settings.intake.study_mode == "FT"
    assert db.get(User, user.id).created_at is not None
```

- In `test_deleting_a_user_deletes_their_sessions_ticks_and_settings`, also add an `AssessmentSubmission` for the user (create an `Assessment` on the module first) and assert it is gone after the delete.

`backend/tests/test_auth_api.py`:
- The signup body expected in `test_signup_starts_a_session_with_a_safe_cookie` becomes `{"email": "joel@example.com", "study_mode": "FT", "intake": {"key": "2607-online-ccc-ft", "title": "Test intake"}}`.
- Delete `test_set_and_clear_current_week`, `test_unknown_week_is_rejected`, `test_settings_need_a_session`. Add:

```python
def test_signup_needs_the_schedule_loaded(client, db, intake):
    db.delete(intake)
    db.flush()
    response = client.post("/api/auth/signup", json=signup_body("joel@example.com"))
    assert response.status_code == 503
    assert response.json() == {"detail": "The course schedule isn't loaded yet. Try again later."}


def test_week_setting_is_gone(user_client):
    assert user_client.patch("/api/me/settings", json={"current_week": 9}).status_code == 404
```

`backend/tests/test_migrations.py`:
- Change the check-constraint assertion to `assert "intakes_study_mode_check" in checks, checks`.
- Add a test that existing users are moved onto the intake:

```python
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
```

- [ ] **Step 10: Run the affected tests**

Run: `uv run pytest tests/test_clock.py tests/test_accounts_models.py tests/test_auth_api.py tests/test_migrations.py -v`
Expected: all PASS. Then `uv run alembic check` against the dev DB is **not** run yet (the dev DB is still at 0007). Leave the dev upgrade to Task 3.

- [ ] **Step 11: Run the full suite**

Run: `uv run pytest`
Expected: all PASS. If a module or ticks test fails on a missing `intake`, it's using `client`/`user_client`, which now brings the intake. Any test that builds `UserSettings()` by hand needs `intake=`.

- [ ] **Step 12: Commit**

```bash
git add backend
git commit -m "feat(db): intakes with week dates and holidays, assessment submissions, NZ clock; drop the week picker"
```

---

### Task 3: `seed/schedule.yaml`, the CCC604 shell and the loader

**Files:**
- Create: `seed/schedule.yaml`, `seed/ccc604.yaml`, `backend/tests/test_schedule_seed.py`
- Modify: `backend/app/seed/schema.py`, `backend/app/seed/loader.py`, `backend/app/seed/__main__.py`
- Modify tests: `backend/tests/conftest.py` (add `schedule_yaml`), `backend/tests/test_seed_validation.py`, `backend/tests/test_seed_apply.py`, `backend/tests/test_seed_files.py`

**Interfaces:**
- Consumes: `Intake`, `IntakeWeek`, `IntakeHoliday`, `UserSettings` models (Task 2)
- Produces:
  - Seed schema `SeedIntakeWeek(week_number, starts_on)`, `SeedHoliday(day, name)`, `SeedIntake(key, title, study_mode, weeks, holidays)`, `SeedScheduleFile(intakes)`
  - `SeedBundle.intakes: list[SeedIntake]`
  - `loader.SCHEDULE_FILE = "schedule.yaml"`
  - `apply_schedule(session: Session, intakes: Sequence[SeedIntake]) -> None` (raises `SeedError` before writing if an intake that users are on is missing)
  - `run()` prints `Seeded {m} module(s), {p} prerequisite(s) and {i} intake(s) from {dir}`
  - `tests.conftest.schedule_yaml(numbers=range(1, 33)) -> str`

- [ ] **Step 1: Write the failing schema and loader tests**

Add to `backend/tests/conftest.py`:

```python
def schedule_yaml(numbers=range(1, 33)) -> str:
    """A valid schedule.yaml with one intake whose weeks run Mondays from 20 Jul 2026, no gaps."""
    weeks = "".join(
        f"      - {{week_number: {n}, starts_on: {date(2026, 7, 20) + timedelta(weeks=n - 1)}}}\n" for n in numbers
    )
    return f"intakes:\n  - key: test-ft\n    title: Test FT\n    study_mode: FT\n    weeks:\n{weeks}"
```

`backend/tests/test_schedule_seed.py`:

```python
from datetime import date

import pytest
from sqlalchemy import select

from app.models import Intake, IntakeWeek, User, UserSettings
from app.seed.loader import SeedError, apply_schedule, load_seed_dir
from app.seed.schema import SeedIntake
from tests.conftest import schedule_yaml
from tests.test_seed_validation import PREREQS, VALID, write


def problems(dir):
    with pytest.raises(SeedError) as exc:
        load_seed_dir(dir)
    return exc.value.problems


def write_all(dir, schedule=None):
    write(dir, "ccc602.yaml", VALID)
    write(dir, "prerequisites.yaml", PREREQS)
    if schedule is not None:
        write(dir, "schedule.yaml", schedule)


def seed_intake(**over) -> SeedIntake:
    data = {
        "key": "test-ft", "title": "Test", "study_mode": "FT",
        "weeks": [{"week_number": 1, "starts_on": "2026-07-20"}, {"week_number": 2, "starts_on": "2026-07-27"}],
        "holidays": [{"day": "2026-07-22", "name": "Holiday"}],
    }
    return SeedIntake.model_validate({**data, **over})


def test_schedule_loads(tmp_path):
    write_all(tmp_path, schedule_yaml())
    [one] = load_seed_dir(tmp_path).intakes
    assert one.key == "test-ft" and len(one.weeks) == 32
    assert one.weeks[0].starts_on == date(2026, 7, 20)


def test_schedule_file_is_required(tmp_path):
    write_all(tmp_path)
    assert problems(tmp_path) == [f"schedule.yaml: file not found in {tmp_path}"]


def test_week_must_start_on_a_monday(tmp_path):
    write_all(tmp_path, schedule_yaml().replace("starts_on: 2026-07-20", "starts_on: 2026-07-21"))
    assert any("not a Monday" in p for p in problems(tmp_path))


def test_weeks_must_be_unique_and_in_order(tmp_path):
    write_all(tmp_path, schedule_yaml(numbers=[1, 3, 2]))
    assert any("unique and ascending" in p for p in problems(tmp_path))


def test_weeks_must_be_at_least_a_week_apart():
    with pytest.raises(ValueError, match="less than 7 days"):
        seed_intake(weeks=[{"week_number": 1, "starts_on": "2026-07-20"}, {"week_number": 2, "starts_on": "2026-07-20"}])


def test_holiday_listed_twice_is_rejected():
    with pytest.raises(ValueError, match="more than once"):
        seed_intake(holidays=[{"day": "2026-07-22", "name": "A"}, {"day": "2026-07-22", "name": "B"}])


def test_module_week_without_dates_is_reported(tmp_path):
    write_all(tmp_path, schedule_yaml(numbers=range(1, 10)))  # VALID uses weeks 9 and 10
    assert any("week 10" in p and "test-ft" in p for p in problems(tmp_path))


def test_apply_schedule_inserts_weeks_and_holidays(db):
    apply_schedule(db, [seed_intake()])
    row = db.scalars(select(Intake)).one()
    assert [(w.week_number, w.starts_on) for w in row.weeks] == [(1, date(2026, 7, 20)), (2, date(2026, 7, 27))]
    assert [(h.day, h.name) for h in row.holidays] == [(date(2026, 7, 22), "Holiday")]


def test_reapplying_schedule_keeps_users_and_replaces_weeks(db):
    apply_schedule(db, [seed_intake()])
    row = db.scalars(select(Intake)).one()
    db.add(User(email="a@example.com", password_hash="x", settings=UserSettings(intake=row)))
    db.flush()
    apply_schedule(db, [seed_intake(title="Renamed", weeks=[{"week_number": 1, "starts_on": "2026-08-03"}])])
    again = db.scalars(select(Intake)).one()
    assert again.id == row.id and again.title == "Renamed"
    assert [(w.week_number, w.starts_on) for w in again.weeks] == [(1, date(2026, 8, 3))]
    assert db.scalars(select(UserSettings.intake_id)).one() == row.id


def test_removing_an_intake_nobody_is_on_deletes_it(db):
    apply_schedule(db, [seed_intake(), seed_intake(key="other-ft")])
    apply_schedule(db, [seed_intake()])
    assert db.scalars(select(Intake.key)).all() == ["test-ft"]
    assert {w.intake_id for w in db.scalars(select(IntakeWeek))} == {db.scalars(select(Intake.id)).one()}


def test_removing_an_intake_someone_is_on_is_refused(db):
    apply_schedule(db, [seed_intake(), seed_intake(key="other-ft")])
    other = db.scalars(select(Intake).where(Intake.key == "other-ft")).one()
    db.add(User(email="a@example.com", password_hash="x", settings=UserSettings(intake=other)))
    db.flush()
    with pytest.raises(SeedError) as exc:
        apply_schedule(db, [seed_intake()])
    assert exc.value.problems == ["schedule.yaml: intake 'other-ft' is missing but users are on it; keep it in the file"]
```

Run: `uv run pytest tests/test_schedule_seed.py -v` → FAIL (import errors).

- [ ] **Step 2: Schema**

Add to `backend/app/seed/schema.py`:

```python
class SeedIntakeWeek(_Strict):
    week_number: int = Field(ge=1)
    starts_on: date


class SeedHoliday(_Strict):
    day: date
    name: ShortTitle


class SeedIntake(_Strict):
    key: Key
    title: ShortTitle
    study_mode: Literal["FT", "PT"]
    weeks: list[SeedIntakeWeek] = Field(min_length=1)
    holidays: list[SeedHoliday] = []

    @model_validator(mode="after")
    def check_calendar(self) -> "SeedIntake":
        for w in self.weeks:
            if w.starts_on.weekday() != 0:
                raise ValueError(f"week {w.week_number} starts on {w.starts_on}, which is not a Monday")
        numbers = [w.week_number for w in self.weeks]
        if numbers != sorted(set(numbers)):
            raise ValueError(f"week numbers must be unique and ascending (got {numbers})")
        for a, b in zip(self.weeks, self.weeks[1:]):
            if (b.starts_on - a.starts_on).days < 7:
                raise ValueError(f"week {b.week_number} starts less than 7 days after week {a.week_number}")
        days = [h.day for h in self.holidays]
        if len(set(days)) != len(days):
            raise ValueError("a holiday date is listed more than once")
        return self


class SeedScheduleFile(_Strict):
    """seed/schedule.yaml: each intake's week start dates and public holidays."""

    intakes: list[SeedIntake] = Field(min_length=1)

    @model_validator(mode="after")
    def unique_keys(self) -> "SeedScheduleFile":
        keys = [i.key for i in self.intakes]
        if len(set(keys)) != len(keys):
            raise ValueError("an intake key is used more than once")
        return self
```

- [ ] **Step 3: Loader**

In `backend/app/seed/loader.py`:
- `SCHEDULE_FILE = "schedule.yaml"`; `SeedBundle` gains `intakes: list[SeedIntake]`.
- `module_files = [f for f in files if f.name not in (PREREQUISITES_FILE, SCHEDULE_FILE)]`; update the "no module files" message to `f"no module files in {path}"`.
- After the prerequisites-file check, the same for the schedule:

```python
    schedule_path = path / SCHEDULE_FILE
    if not schedule_path.exists():
        raise SeedError([f"{SCHEDULE_FILE}: file not found in {path}"])
```

(Keep the prerequisites check first, so `test_missing_prerequisites_file_is_an_error` still sees only its own message.)
- Parse it: `schedule = _parse(schedule_path, SeedScheduleFile, problems)`.
- After the prerequisite reference checks:

```python
    if schedule is not None:
        for name, seed in modules:
            for week in seed.all_weeks():
                for si in schedule.intakes:
                    if week.week_number not in {w.week_number for w in si.weeks}:
                        problems.append(
                            f"{name}: week {week.week_number} ({week.key}) has no dates in intake {si.key} ({SCHEDULE_FILE})"
                        )
```

- Return `SeedBundle([...], prereq_file.prerequisites if prereq_file else [], schedule.intakes if schedule else [])`.
- New function:

```python
def apply_schedule(session: Session, intakes: Sequence[SeedIntake]) -> None:
    """Upsert intakes by key and rewrite their weeks and holidays. Refuses, before writing anything,
    to drop an intake that users are on."""
    wanted = {si.key for si in intakes}
    in_use = session.scalars(
        select(Intake.key).join(UserSettings, UserSettings.intake_id == Intake.id).where(Intake.key.not_in(wanted)).distinct()
    ).all()
    if in_use:
        raise SeedError(
            [f"{SCHEDULE_FILE}: intake '{key}' is missing but users are on it; keep it in the file" for key in sorted(in_use)]
        )

    existing = {row.key: row for row in session.scalars(select(Intake))}
    rows = []
    for si in intakes:
        row = existing.get(si.key)
        if row is None:
            row = Intake(key=si.key)
            session.add(row)
        row.title, row.study_mode = si.title, si.study_mode
        rows.append((row, si))
    session.flush()

    # Weeks and holidays carry no per-user data: delete and re-insert, so the same primary key never clashes.
    ids = [row.id for row, _ in rows]
    session.execute(delete(IntakeWeek).where(IntakeWeek.intake_id.in_(ids)))
    session.execute(delete(IntakeHoliday).where(IntakeHoliday.intake_id.in_(ids)))
    weeks = [{"intake_id": row.id, "week_number": w.week_number, "starts_on": w.starts_on} for row, si in rows for w in si.weeks]
    holidays = [{"intake_id": row.id, "day": h.day, "name": h.name} for row, si in rows for h in si.holidays]
    if weeks:
        session.execute(insert(IntakeWeek), weeks)
    if holidays:
        session.execute(insert(IntakeHoliday), holidays)
    session.execute(delete(Intake).where(Intake.key.not_in(list(wanted))).execution_options(synchronize_session=False))
    session.flush()
    session.expire_all()
```

`backend/app/seed/__main__.py` `run()`:

```python
    try:
        bundle = load_seed_dir(seed_dir)
        apply_schedule(session, bundle.intakes)
    except SeedError as e:
        ...same printing, return 1
    apply_seed(session, bundle.modules, bundle.prerequisites)
    print(
        f"Seeded {len(bundle.modules)} module(s), {len(bundle.prerequisites)} prerequisite(s) "
        f"and {len(bundle.intakes)} intake(s) from {seed_dir}"
    )
```

- [ ] **Step 4: Update the existing seed tests**

- `tests/test_seed_validation.py`: `write_valid(dir, module=VALID, prereqs=PREREQS, schedule=schedule_yaml())` also writes `schedule.yaml` when `schedule is not None` (import `schedule_yaml` from `tests.conftest`). `test_prerequisites_file_alone_is_an_error` expects `"no module files"` still.
- `tests/test_seed_apply.py`: `test_run_with_invalid_files_writes_nothing` and `test_run_with_valid_files_succeeds` also write `schedule.yaml` with `schedule_yaml()`. The success test expects `"Seeded 1 module(s), 1 prerequisite(s) and 1 intake(s)"` and `count(db, Intake) == 1`.

- [ ] **Step 5: Real seed files**

`seed/schedule.yaml` (dates from `docs/portal-extras.md`; holidays are the weekday ones inside the programme):

```yaml
# Source: Programme Guide FT 2607 (docs/portal-extras.md, "Week dates" and "Public holidays"). Collected 2026-10-16.
# Each week starts on a Monday and runs to Sunday. Breaks are the gaps between weeks.
intakes:
  - key: 2607-online-ccc-ft
    title: "July 2026 intake, full-time (NZ4129)"
    study_mode: FT
    weeks:
      - { week_number: 1, starts_on: 2026-07-20 }
      - { week_number: 2, starts_on: 2026-07-27 }
      - { week_number: 3, starts_on: 2026-08-03 }
      - { week_number: 4, starts_on: 2026-08-10 }
      - { week_number: 5, starts_on: 2026-08-17 }
      - { week_number: 6, starts_on: 2026-08-24 }
      - { week_number: 7, starts_on: 2026-08-31 }
      - { week_number: 8, starts_on: 2026-09-07 }
      - { week_number: 9, starts_on: 2026-09-28 }
      - { week_number: 10, starts_on: 2026-10-05 }
      - { week_number: 11, starts_on: 2026-10-12 }
      - { week_number: 12, starts_on: 2026-10-19 }
      - { week_number: 13, starts_on: 2026-10-26 }
      - { week_number: 14, starts_on: 2026-11-02 }
      - { week_number: 15, starts_on: 2026-11-09 }
      - { week_number: 16, starts_on: 2026-11-16 }
      - { week_number: 17, starts_on: 2026-11-23 }
      - { week_number: 18, starts_on: 2026-11-30 }
      - { week_number: 19, starts_on: 2026-12-07 }
      - { week_number: 20, starts_on: 2026-12-14 }
      - { week_number: 21, starts_on: 2027-01-11 }
      - { week_number: 22, starts_on: 2027-01-18 }
      - { week_number: 23, starts_on: 2027-01-25 }
      - { week_number: 24, starts_on: 2027-02-01 }
      - { week_number: 25, starts_on: 2027-03-01 }
      - { week_number: 26, starts_on: 2027-03-08 }
      - { week_number: 27, starts_on: 2027-03-15 }
      - { week_number: 28, starts_on: 2027-03-22 }
      - { week_number: 29, starts_on: 2027-03-29 }
      - { week_number: 30, starts_on: 2027-04-05 }
      - { week_number: 31, starts_on: 2027-04-12 }
      - { week_number: 32, starts_on: 2027-04-19 }
    holidays:
      - { day: 2026-10-26, name: "Labour Day" }
      - { day: 2026-12-25, name: "Christmas Day" }
      - { day: 2026-12-28, name: "Boxing Day (observed)" }
      - { day: 2027-01-01, name: "New Year's Day" }
      - { day: 2027-01-25, name: "Auckland Anniversary Day" }
      - { day: 2027-02-08, name: "Waitangi Day (observed)" }
      - { day: 2027-03-26, name: "Good Friday" }
      - { day: 2027-03-29, name: "Easter Monday" }
```

`seed/ccc604.yaml`:

```yaml
# Source: docs/portal-extras.md (Programme Guide dates). Course 04 is still locked on UPLearn
# ("complete 02 - Data Engineering first"), so it has no weeks yet; the app shows it as "Coming soon".
# Weeks 25–32 (1 Mar – 25 Apr 2027) get added here once the FT schedule posts are visible.
module:
  key: ccc604
  code: CCC604
  title: "Multi-Cloud Security Integration and Project Management"
  order: 4
assessments:
  - key: ccc604-a7
    title: "Assessment 7: Multi-Cloud Security Integration Project (group)"
    due_date: 2027-04-18
  - key: ccc604-a8
    title: "Assessment 8: Project Presentation (group)"
    due_date: 2027-04-23
```

`tests/test_seed_files.py`:
- `test_every_module_has_submodules` → `assert all(s.submodules for s in bundle().modules if s.module.key != "ccc604")`
- Add:

```python
def test_schedule_is_the_2607_full_time_intake():
    [intake] = bundle().intakes
    assert intake.key == "2607-online-ccc-ft"
    assert [w.week_number for w in intake.weeks] == list(range(1, 33))
    assert str(intake.weeks[0].starts_on) == "2026-07-20" and str(intake.weeks[-1].starts_on) == "2027-04-19"


def test_ccc604_is_a_shell_with_its_two_deadlines():
    ccc604 = modules()["ccc604"]
    assert ccc604.submodules == []
    assert [(a.key, str(a.due_date)) for a in ccc604.assessments] == [("ccc604-a7", "2027-04-18"), ("ccc604-a8", "2027-04-23")]
```

- [ ] **Step 6: Run the seed tests**

Run: `uv run pytest tests/test_schedule_seed.py tests/test_seed_validation.py tests/test_seed_apply.py tests/test_seed_files.py -v`
Expected: all PASS.

- [ ] **Step 7: Upgrade and seed the dev database**

Run: `uv run alembic upgrade head` then `uv run python -m app.seed` then `uv run alembic check`
Expected: upgrade to 0008; `Seeded 4 module(s), N prerequisite(s) and 1 intake(s)`; `No new upgrade operations detected.`

- [ ] **Step 8: Full suite and commit**

Run: `uv run pytest` → all PASS.

```bash
git add seed backend
git commit -m "feat(seed): schedule.yaml with the 2607 FT week dates and holidays, CCC604 shell"
```

---

### Task 4: Assessment status and the submitted tick

**Files:**
- Create: `backend/app/api/assessments.py`, `backend/tests/test_assessments_api.py`
- Modify: `backend/app/api/schemas.py`, `backend/app/api/modules.py`, `backend/app/main.py`, `backend/tests/test_modules_api.py`

**Interfaces:**
- Consumes: `AssessmentSubmission`, `today` dependency, `today_is` fixture (Task 2)
- Produces:
  - `assessment_status(due: date | None, submitted: bool, today: date) -> tuple[str, int | None]` returning (status, days_until)
  - `submitted_ids(db: Session, user: User) -> set[int]`
  - `assessment_out(a: Assessment, submitted: set[int], today: date) -> AssessmentOut`
  - `AssessmentOut` gains `submitted: bool = False`, `status: str = "no_date"`, `days_until: int | None = None`
  - `AssessmentStatusOut(AssessmentOut)` adds `module_key: str`, `module_code: str`
  - `GET /assessments -> list[AssessmentStatusOut]` (module order, then due date with no-date last, then title)
  - `PUT /assessments/{key}/submitted`, `DELETE /assessments/{key}/submitted` → 204; 404 `{"detail": "Assessment not found"}`
  - Module detail `assessments` use `assessment_out`

- [ ] **Step 1: Write the failing tests**

`backend/tests/test_assessments_api.py`:

```python
from datetime import date

import pytest

from app.api.assessments import assessment_status
from app.models import Assessment, Module

TODAY = date(2026, 10, 17)


@pytest.mark.parametrize(
    ("due", "submitted", "expected"),
    [
        (None, False, ("no_date", None)),
        (None, True, ("submitted", None)),
        (date(2026, 10, 25), False, ("upcoming", 8)),
        (date(2026, 10, 17), False, ("due_today", 0)),
        (date(2026, 10, 16), False, ("overdue", -1)),
        (date(2026, 10, 16), True, ("submitted", -1)),
    ],
)
def test_assessment_status(due, submitted, expected):
    assert assessment_status(due, submitted, TODAY) == expected


def add_assessments(db):
    db.add_all([
        Module(key="ccc602", code="CCC602", title="DE", position=2, assessments=[
            Assessment(key="a4", title="A4", due_date=date(2026, 11, 22)),
            Assessment(key="a3", title="A3", due_date=date(2026, 10, 25), uplearn_url="https://up.test/a3"),
        ]),
        Module(key="ccc601", code="CCC601", title="Admin", position=1, assessments=[
            Assessment(key="a1", title="A1", due_date=date(2026, 8, 16)),
        ]),
    ])
    db.flush()


def test_list_assessments_in_module_then_date_order(user_client, db, today_is):
    add_assessments(db)
    today_is(TODAY)
    body = user_client.get("/api/assessments").json()
    assert [a["key"] for a in body] == ["a1", "a3", "a4"]
    assert body[1] == {
        "key": "a3", "title": "A3", "due_date": "2026-10-25", "uplearn_url": "https://up.test/a3",
        "submitted": False, "status": "upcoming", "days_until": 8, "module_key": "ccc602", "module_code": "CCC602",
    }
    assert body[0]["status"] == "overdue"


def test_submit_and_unsubmit_are_idempotent(user_client, db, today_is):
    add_assessments(db)
    today_is(TODAY)
    for _ in range(2):
        assert user_client.put("/api/assessments/a1/submitted").status_code == 204
    a1 = user_client.get("/api/assessments").json()[0]
    assert (a1["submitted"], a1["status"]) == (True, "submitted")
    for _ in range(2):
        assert user_client.delete("/api/assessments/a1/submitted").status_code == 204
    assert user_client.get("/api/assessments").json()[0]["status"] == "overdue"


def test_unknown_assessment_is_404(user_client):
    response = user_client.put("/api/assessments/nope/submitted")
    assert response.status_code == 404
    assert response.json() == {"detail": "Assessment not found"}


def test_submissions_are_per_user(user_client, client, db, today_is):
    add_assessments(db)
    today_is(TODAY)
    user_client.put("/api/assessments/a1/submitted")
    client.post("/api/auth/logout")
    client.post("/api/auth/signup", json={"email": "other@example.com", "password": "correct horse", "accepted_disclaimer_version": 1})
    assert client.get("/api/assessments").json()[0]["submitted"] is False


def test_assessments_need_a_session(client):
    assert client.get("/api/assessments").status_code == 401
    assert client.put("/api/assessments/a1/submitted").status_code == 401
```

(Use `signup_body("other@example.com")` from `tests.conftest` instead of the literal body.)

In `tests/test_modules_api.py` `test_module_detail`, call `today_is(date(2026, 10, 17))` first (add the fixture to the test's parameters) and expect:

```python
    assert body["assessments"] == [
        {"key": "a3", "title": "Assessment 3", "due_date": "2026-10-25", "uplearn_url": "https://up.test",
         "submitted": False, "status": "upcoming", "days_until": 8},
        {"key": "a4", "title": "Assessment 4", "due_date": None, "uplearn_url": None,
         "submitted": False, "status": "no_date", "days_until": None},
    ]
```

Run: `uv run pytest tests/test_assessments_api.py tests/test_modules_api.py -v` → FAIL.

- [ ] **Step 2: Implement**

Schemas (`backend/app/api/schemas.py`):

```python
class AssessmentOut(_Out):
    key: str
    title: str
    due_date: date | None
    uplearn_url: str | None
    submitted: bool = False
    status: str = "no_date"
    days_until: int | None = None


class AssessmentStatusOut(AssessmentOut):
    module_key: str
    module_code: str
```

`backend/app/api/assessments.py`:

```python
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session, selectinload

from app.api.schemas import AssessmentOut, AssessmentStatusOut
from app.auth.deps import current_user
from app.clock import today
from app.db import get_db
from app.models import Assessment, AssessmentSubmission, Module, User

router = APIRouter(tags=["assessments"])


def assessment_status(due: date | None, submitted: bool, today: date) -> tuple[str, int | None]:
    days = None if due is None else (due - today).days
    if submitted:
        return "submitted", days
    if days is None:
        return "no_date", None
    if days < 0:
        return "overdue", days
    return ("due_today" if days == 0 else "upcoming"), days


def submitted_ids(db: Session, user: User) -> set[int]:
    return set(db.scalars(select(AssessmentSubmission.assessment_id).where(AssessmentSubmission.user_id == user.id)))


def assessment_out(a: Assessment, submitted: set[int], today: date) -> AssessmentOut:
    status, days = assessment_status(a.due_date, a.id in submitted, today)
    return AssessmentOut.model_validate(a).model_copy(
        update={"submitted": a.id in submitted, "status": status, "days_until": days}
    )


def _sort_key(a: Assessment):
    return (a.due_date is None, a.due_date or date.max, a.title)


@router.get("/assessments", response_model=list[AssessmentStatusOut])
def list_assessments(
    user: User = Depends(current_user), db: Session = Depends(get_db), today_: date = Depends(today)
) -> list[AssessmentStatusOut]:
    done = submitted_ids(db, user)
    modules = db.scalars(select(Module).options(selectinload(Module.assessments)).order_by(Module.position)).all()
    return [
        AssessmentStatusOut(**assessment_out(a, done, today_).model_dump(), module_key=m.key, module_code=m.code)
        for m in modules
        for a in sorted(m.assessments, key=_sort_key)
    ]


def _assessment_id(db: Session, key: str) -> int:
    row_id = db.scalar(select(Assessment.id).where(Assessment.key == key))
    if row_id is None:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return row_id


@router.put("/assessments/{key}/submitted", status_code=204)
def submit(key: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> None:
    assessment_id = _assessment_id(db, key)
    db.execute(insert(AssessmentSubmission).values(user_id=user.id, assessment_id=assessment_id).on_conflict_do_nothing())
    db.commit()


@router.delete("/assessments/{key}/submitted", status_code=204)
def unsubmit(key: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> None:
    assessment_id = _assessment_id(db, key)
    db.execute(
        delete(AssessmentSubmission).where(
            AssessmentSubmission.user_id == user.id, AssessmentSubmission.assessment_id == assessment_id
        )
    )
    db.commit()
```

`backend/app/main.py`: `from app.api import assessments, auth, modules, tasks` and `api.include_router(assessments.router)`.

`backend/app/api/modules.py` `get_module`: add `today_: date = Depends(today)`; replace the assessments block with:

```python
    done_assessments = submitted_ids(db, user)
    assessments = [assessment_out(a, done_assessments, today_) for a in sorted(module.assessments, key=_sort_key)]
```

(import `assessment_out`, `submitted_ids`, `_sort_key` from `app.api.assessments`; `AssessmentOut` import no longer needed in modules.py.)

- [ ] **Step 3: Run tests, full suite, commit**

Run: `uv run pytest tests/test_assessments_api.py tests/test_modules_api.py -v` → PASS, then `uv run pytest` → PASS.

```bash
git add backend
git commit -m "feat(api): assessment status, list and a per-user submitted tick"
```

---

### Task 5: `GET /this-week`

**Files:**
- Create: `backend/app/api/this_week.py`, `backend/tests/test_this_week_api.py`
- Modify: `backend/app/api/schemas.py`, `backend/app/main.py`

**Interfaces:**
- Consumes: `locate`, `upcoming_break`, `TeachingWeek` (Task 1); `today`, intake models, `add_schedule`, `today_is` (Task 2); `assessment_out`, `submitted_ids`, `AssessmentStatusOut` (Task 4); `_done_task_ids`, `_done_prerequisite_ids` from `app.api.modules`
- Produces the response (all dates ISO strings in JSON):

```
ThisWeekOut {
  today: date
  status: "before_start" | "teaching" | "break" | "finished"
  week: {week_number, starts_on, ends_on} | null
  current_break: {starts_on, ends_on, week_of_break, length_weeks} | null
  next_week: {week_number, starts_on} | null
  upcoming_break: {starts_on, ends_on, length_weeks, resumes_week, resumes_on} | null
  holidays: [{day, name}]
  groups: [ThisWeekGroup]
  ahead: {week_number, groups: [ThisWeekGroup]} | null
  lurking: [{week_number, tasks: [TaskOut + module_code]}]
  assessments: [AssessmentStatusOut]
  stats: {done, total, next_deadline_days}
}
ThisWeekGroup { module_key, module_code, module_title, module_uplearn_url, submodule: {key, code, title, uplearn_url}, week: WeekOut, prerequisites: [PrerequisiteOut] (unfinished only) }
```

- [ ] **Step 1: Write the failing tests**

`backend/tests/test_this_week_api.py`:

```python
from datetime import date

import pytest

from app.models import Assessment, Module, Prerequisite, Submodule, SubmodulePrerequisite, Task, Week
from tests.conftest import add_schedule


def t(key, pos=0):
    return Task(key=key, title=key.upper(), type="lab", external_url=f"https://x.test/{key}", position=pos)


@pytest.fixture
def content(db, intake):
    add_schedule(db, intake, holidays=[(date(2026, 10, 26), "Labour Day")])
    admin_sub = Submodule(key="az104", code="AZ-104", title="Azure Admin", position=0)
    de_sub = Submodule(key="dp900", code="DP-900", title="Azure Data", position=0, uplearn_url="https://up.test/dp900")
    admin = Module(key="ccc601", code="CCC601", title="Admin", position=1, submodules=[admin_sub], weeks=[
        Week(key="w8", week_number=8, title="W8", position=0, submodule=admin_sub, tasks=[t("t8")]),
    ], assessments=[Assessment(key="a2", title="A2", due_date=date(2026, 9, 13))])
    de = Module(key="ccc602", code="CCC602", title="Data Engineering", position=2, uplearn_url="https://up.test/602",
                submodules=[de_sub], weeks=[
        Week(key="w10", week_number=10, title="W10", position=0, submodule=de_sub, tasks=[t("t10")]),
        Week(key="w11", week_number=11, title="W11", position=1, submodule=de_sub, tasks=[t("t11a", 0), t("t11b", 1)]),
        Week(key="w12", week_number=12, title="W12", position=2, submodule=de_sub, tasks=[t("t12")]),
    ], assessments=[
        Assessment(key="a3", title="A3", due_date=date(2026, 10, 25)),
        Assessment(key="a4", title="A4", due_date=date(2026, 11, 22)),
        Assessment(key="a5", title="A5", due_date=None),
    ])
    azure = Prerequisite(key="azure", title="Azure account", external_url="https://azure.test")
    skillable = Prerequisite(key="skillable", title="Skillable", external_url="https://skillable.test")
    db.add_all([admin, de, azure, skillable])
    db.flush()
    db.add_all([
        SubmodulePrerequisite(submodule_id=de_sub.id, prerequisite_id=azure.id, position=0),
        SubmodulePrerequisite(submodule_id=de_sub.id, prerequisite_id=skillable.id, position=1),
    ])
    db.flush()


def get(client):
    response = client.get("/api/this-week")
    assert response.status_code == 200
    return response.json()


def test_teaching_week(user_client, content, today_is):
    today_is(date(2026, 10, 14))
    body = get(user_client)
    assert body["today"] == "2026-10-14"
    assert body["status"] == "teaching"
    assert body["week"] == {"week_number": 11, "starts_on": "2026-10-12", "ends_on": "2026-10-18"}
    assert (body["current_break"], body["next_week"], body["upcoming_break"], body["holidays"]) == (None, None, None, [])
    [group] = body["groups"]
    assert (group["module_code"], group["module_title"], group["module_uplearn_url"]) == ("CCC602", "Data Engineering", "https://up.test/602")
    assert group["submodule"] == {"key": "dp900", "code": "DP-900", "title": "Azure Data", "uplearn_url": "https://up.test/dp900"}
    assert [t["key"] for t in group["week"]["tasks"]] == ["t11a", "t11b"]
    assert [p["key"] for p in group["prerequisites"]] == ["azure", "skillable"]
    assert body["stats"] == {"done": 0, "total": 2, "next_deadline_days": 11}


def test_only_unfinished_prerequisites_are_listed(user_client, content, today_is):
    today_is(date(2026, 10, 14))
    user_client.put("/api/prerequisites/azure/complete")
    assert [p["key"] for p in get(user_client)["groups"][0]["prerequisites"]] == ["skillable"]


def test_lurking_lists_unticked_tasks_from_earlier_weeks(user_client, content, today_is):
    today_is(date(2026, 10, 14))
    user_client.put("/api/tasks/t10/complete")
    lurking = get(user_client)["lurking"]
    assert [(w["week_number"], [t["key"] for t in w["tasks"]]) for w in lurking] == [(8, ["t8"])]
    assert lurking[0]["tasks"][0]["module_code"] == "CCC601"


def test_ahead_when_every_task_this_week_is_ticked(user_client, content, today_is):
    today_is(date(2026, 10, 14))
    assert get(user_client)["ahead"] is None
    user_client.put("/api/tasks/t11a/complete")
    user_client.put("/api/tasks/t11b/complete")
    body = get(user_client)
    assert body["stats"]["done"] == 2
    assert body["ahead"]["week_number"] == 12
    assert [t["key"] for t in body["ahead"]["groups"][0]["week"]["tasks"]] == ["t12"]


def test_a_week_with_no_content_is_never_ahead(user_client, content, today_is):
    today_is(date(2026, 10, 27))  # week 13: no content
    body = get(user_client)
    assert (body["status"], body["groups"], body["ahead"]) == ("teaching", [], None)
    assert body["stats"]["total"] == 0


def test_holidays_in_the_current_week(user_client, content, today_is):
    today_is(date(2026, 10, 27))
    assert get(user_client)["holidays"] == [{"day": "2026-10-26", "name": "Labour Day"}]


def test_upcoming_break(user_client, content, today_is):
    today_is(date(2026, 9, 2))  # week 7
    assert get(user_client)["upcoming_break"] == {
        "starts_on": "2026-09-14", "ends_on": "2026-09-27", "length_weeks": 2, "resumes_week": 9, "resumes_on": "2026-09-28",
    }


def test_on_break(user_client, content, today_is):
    today_is(date(2026, 9, 20))
    body = get(user_client)
    assert body["status"] == "break"
    assert body["week"] is None
    assert body["current_break"] == {"starts_on": "2026-09-14", "ends_on": "2026-09-27", "week_of_break": 1, "length_weeks": 2}
    assert body["next_week"] == {"week_number": 9, "starts_on": "2026-09-28"}
    assert [w["week_number"] for w in body["lurking"]] == [8]
    assert body["groups"] == [] and body["stats"]["total"] == 0


def test_before_start(user_client, content, today_is):
    today_is(date(2026, 7, 1))
    body = get(user_client)
    assert (body["status"], body["next_week"], body["lurking"]) == ("before_start", {"week_number": 1, "starts_on": "2026-07-20"}, [])


def test_finished_counts_every_unticked_task_as_lurking(user_client, content, today_is):
    today_is(date(2027, 5, 1))
    body = get(user_client)
    assert body["status"] == "finished"
    assert [w["week_number"] for w in body["lurking"]] == [8, 10, 11, 12]


def test_assessment_window(user_client, content, today_is):
    today_is(date(2026, 10, 14))
    # a2 overdue and not submitted: shown. a3 due in 11 days: shown. a4 due in 39 days: not yet. a5 no date: never.
    assert [a["key"] for a in get(user_client)["assessments"]] == ["a2", "a3"]
    user_client.put("/api/assessments/a2/submitted")
    user_client.put("/api/assessments/a3/submitted")
    body = get(user_client)
    assert [(a["key"], a["status"]) for a in body["assessments"]] == [("a3", "submitted")]
    assert body["stats"]["next_deadline_days"] == 39


def test_window_edge_is_28_days(user_client, content, today_is):
    today_is(date(2026, 10, 25))  # a4 is exactly 28 days away
    assert "a4" in [a["key"] for a in get(user_client)["assessments"]]
    today_is(date(2026, 10, 24))  # 29 days
    assert "a4" not in [a["key"] for a in get(user_client)["assessments"]]


def test_groups_cover_every_module_in_the_week_in_module_order(user_client, db, content, today_is):
    extra = Submodule(key="sec", code="SEC", title="Security", position=0)
    db.add(Module(key="ccc600", code="CCC600", title="Earlier", position=0, submodules=[extra], weeks=[
        Week(key="x11", week_number=11, title="X11", position=0, submodule=extra, tasks=[t("x1")]),
    ]))
    db.flush()
    today_is(date(2026, 10, 14))
    groups = get(user_client)["groups"]
    assert [(g["module_code"], [t["key"] for t in g["week"]["tasks"]]) for g in groups] == [
        ("CCC600", ["x1"]), ("CCC602", ["t11a", "t11b"]),
    ]


def test_this_week_needs_a_session(client):
    assert client.get("/api/this-week").status_code == 401
```

Run: `uv run pytest tests/test_this_week_api.py -v` → FAIL (404 on the route).

- [ ] **Step 2: Schemas**

Add to `backend/app/api/schemas.py`:

```python
class WeekSpanOut(BaseModel):
    week_number: int
    starts_on: date
    ends_on: date


class NextWeekOut(BaseModel):
    week_number: int
    starts_on: date


class CurrentBreakOut(BaseModel):
    starts_on: date
    ends_on: date
    week_of_break: int
    length_weeks: int


class UpcomingBreakOut(BaseModel):
    starts_on: date
    ends_on: date
    length_weeks: int
    resumes_week: int
    resumes_on: date


class HolidayOut(_Out):
    day: date
    name: str


class SubmoduleRef(_Out):
    key: str
    code: str
    title: str
    uplearn_url: str | None


class ThisWeekGroup(BaseModel):
    module_key: str
    module_code: str
    module_title: str
    module_uplearn_url: str | None
    submodule: SubmoduleRef
    week: WeekOut
    prerequisites: list[PrerequisiteOut]


class AheadOut(BaseModel):
    week_number: int
    groups: list[ThisWeekGroup]


class LurkingTaskOut(TaskOut):
    module_code: str


class LurkingWeekOut(BaseModel):
    week_number: int
    tasks: list[LurkingTaskOut]


class StatsOut(BaseModel):
    done: int
    total: int
    next_deadline_days: int | None


class ThisWeekOut(BaseModel):
    today: date
    status: str
    week: WeekSpanOut | None
    current_break: CurrentBreakOut | None
    next_week: NextWeekOut | None
    upcoming_break: UpcomingBreakOut | None
    holidays: list[HolidayOut]
    groups: list[ThisWeekGroup]
    ahead: AheadOut | None
    lurking: list[LurkingWeekOut]
    assessments: list[AssessmentStatusOut]
    stats: StatsOut
```

- [ ] **Step 3: Route**

`backend/app/api/this_week.py`:

```python
from dataclasses import asdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.assessments import assessment_out, submitted_ids
from app.api.modules import _done_prerequisite_ids, _done_task_ids
from app.api.schemas import (
    AheadOut, AssessmentStatusOut, CurrentBreakOut, HolidayOut, LurkingTaskOut, LurkingWeekOut, NextWeekOut,
    PrerequisiteOut, StatsOut, SubmoduleRef, TaskOut, ThisWeekGroup, ThisWeekOut, UpcomingBreakOut, WeekOut,
    WeekSpanOut,
)
from app.auth.deps import current_user
from app.clock import today
from app.db import get_db
from app.models import Module, Submodule, SubmodulePrerequisite, User, Week
from app.schedule import TeachingWeek, locate, upcoming_break

router = APIRouter(tags=["this-week"])

ASSESSMENT_WINDOW = timedelta(days=28)


def _group(week: Week, done: set[int], done_prereqs: set[int]) -> ThisWeekGroup:
    week_out = WeekOut.model_validate(week)
    for task, task_out in zip(week.tasks, week_out.tasks):
        task_out.done = task.id in done
    m, s = week.module, week.submodule
    return ThisWeekGroup(
        module_key=m.key, module_code=m.code, module_title=m.title, module_uplearn_url=m.uplearn_url,
        submodule=SubmoduleRef.model_validate(s),
        week=week_out,
        prerequisites=[
            PrerequisiteOut.model_validate(link.prerequisite)
            for link in s.prerequisite_links
            if link.prerequisite_id not in done_prereqs
        ],
    )


@router.get("/this-week", response_model=ThisWeekOut)
def this_week(
    user: User = Depends(current_user), db: Session = Depends(get_db), today_: date = Depends(today)
) -> ThisWeekOut:
    intake = user.settings.intake
    weeks = [TeachingWeek(w.week_number, w.starts_on) for w in intake.weeks]
    pos = locate(weeks, today_)
    done, done_prereqs, submitted = _done_task_ids(db, user), _done_prerequisite_ids(db, user), submitted_ids(db, user)

    content = db.scalars(
        select(Week)
        .join(Module)
        .options(
            selectinload(Week.tasks),
            selectinload(Week.module),
            selectinload(Week.submodule)
            .selectinload(Submodule.prerequisite_links)
            .selectinload(SubmodulePrerequisite.prerequisite),
        )
        .order_by(Module.position, Week.position)
    ).all()

    def groups_for(number: int) -> list[ThisWeekGroup]:
        return [_group(w, done, done_prereqs) for w in content if w.week_number == number]

    groups = groups_for(pos.week.week_number) if pos.week else []
    tasks_now = [t for g in groups for t in g.week.tasks]

    ahead = None
    if pos.week and tasks_now and all(t.done for t in tasks_now):
        i = weeks.index(pos.week)
        if i + 1 < len(weeks):
            nxt = weeks[i + 1].week_number
            ahead = AheadOut(week_number=nxt, groups=groups_for(nxt))

    lurking: dict[int, list[LurkingTaskOut]] = {}
    if pos.cutoff_week is not None:
        for w in content:
            if w.week_number < pos.cutoff_week:
                for task in w.tasks:
                    if task.id not in done:
                        lurking.setdefault(w.week_number, []).append(
                            LurkingTaskOut(**TaskOut.model_validate(task).model_dump(), module_code=w.module.code)
                        )

    modules = db.scalars(select(Module).options(selectinload(Module.assessments)).order_by(Module.position)).all()
    shown = [
        AssessmentStatusOut(**assessment_out(a, submitted, today_).model_dump(), module_key=m.key, module_code=m.code)
        for m in modules
        for a in m.assessments
        if a.due_date is not None
        and (today_ <= a.due_date <= today_ + ASSESSMENT_WINDOW or (a.due_date < today_ and a.id not in submitted))
    ]
    shown.sort(key=lambda a: a.due_date)  # stable: module order breaks ties
    upcoming = [
        (a.due_date - today_).days
        for m in modules
        for a in m.assessments
        if a.due_date is not None and a.due_date >= today_ and a.id not in submitted
    ]

    brk = upcoming_break(weeks, today_)
    return ThisWeekOut(
        today=today_,
        status=pos.status,
        week=WeekSpanOut(week_number=pos.week.week_number, starts_on=pos.week.starts_on, ends_on=pos.week.ends_on)
        if pos.week else None,
        current_break=CurrentBreakOut(
            starts_on=pos.brk.starts_on, ends_on=pos.brk.ends_on,
            week_of_break=pos.week_of_break, length_weeks=pos.brk.length_weeks,
        ) if pos.brk else None,
        next_week=NextWeekOut(week_number=pos.next_week.week_number, starts_on=pos.next_week.starts_on)
        if pos.next_week else None,
        upcoming_break=UpcomingBreakOut(**asdict(brk)) if brk else None,
        holidays=[
            HolidayOut.model_validate(h) for h in intake.holidays
            if pos.week and pos.week.starts_on <= h.day <= pos.week.ends_on
        ],
        groups=groups,
        ahead=ahead,
        lurking=[LurkingWeekOut(week_number=n, tasks=tasks) for n, tasks in sorted(lurking.items())],
        assessments=shown,
        stats=StatsOut(
            done=sum(1 for t in tasks_now if t.done), total=len(tasks_now),
            next_deadline_days=min(upcoming, default=None),
        ),
    )
```

`backend/app/main.py`: import `this_week` and `api.include_router(this_week.router)`.

Lurking order: weeks ascending; inside a week, `content` is already in module order then week position, and `Week.tasks` is ordered by task position.

- [ ] **Step 4: Run tests, full suite, commit**

Run: `uv run pytest tests/test_this_week_api.py -v` → PASS, then `uv run pytest` → PASS.

```bash
git add backend
git commit -m "feat(api): this week, with lurking tasks, ahead of schedule, breaks, holidays and deadlines"
```

---

### Task 6: Catch-up ticks at sign-up

**Files:**
- Create: `backend/app/catchup.py`, `backend/tests/test_catchup.py`
- Modify: `backend/app/api/auth.py`, `backend/app/api/schemas.py`

**Interfaces:**
- Consumes: `locate`, `TeachingWeek` (Task 1); models (Task 2); `today` dependency
- Produces:
  - `prefill_past_work(db: Session, user: User, intake: Intake, today: date) -> int | None`
  - `SignupOut(MeOut)` with `prefilled_through_week: int | None`
  - `POST /auth/signup` returns `SignupOut` (login and `/me` still return `MeOut`)

- [ ] **Step 1: Write the failing tests**

`backend/tests/test_catchup.py`:

```python
from datetime import date

import pytest
from sqlalchemy import select

from app.models import (
    Assessment, AssessmentSubmission, Module, Prerequisite, PrerequisiteCompletion, Submodule, SubmodulePrerequisite,
    Task, TaskCompletion, User, Week,
)
from tests.conftest import add_schedule, signup_body


def t(key):
    return Task(key=key, title=key, type="lab", external_url=f"https://x.test/{key}", position=0)


@pytest.fixture
def content(db, intake):
    add_schedule(db, intake)
    started = Submodule(key="aws", code="AWS", title="AWS", position=0)
    later = Submodule(key="fortinet", code="NSE", title="Fortinet", position=1)
    db.add(Module(key="m", code="M", title="M", position=1, submodules=[started, later], weeks=[
        Week(key="w9", week_number=9, title="W9", position=0, submodule=started, tasks=[t("t9")]),
        Week(key="w11", week_number=11, title="W11", position=1, submodule=started, tasks=[t("t11")]),
        Week(key="w21", week_number=21, title="W21", position=2, submodule=later, tasks=[t("t21")]),
    ], assessments=[
        Assessment(key="past", title="Past", due_date=date(2026, 10, 1)),
        Assessment(key="today", title="Today", due_date=date(2026, 10, 14)),
        Assessment(key="future", title="Future", due_date=date(2026, 11, 22)),
    ]))
    aws_acct = Prerequisite(key="aws-account", title="AWS", external_url="https://aws.test")
    forti = Prerequisite(key="forti", title="Forti", external_url="https://forti.test")
    db.add_all([aws_acct, forti])
    db.flush()
    db.add_all([
        SubmodulePrerequisite(submodule_id=started.id, prerequisite_id=aws_acct.id, position=0),
        SubmodulePrerequisite(submodule_id=later.id, prerequisite_id=forti.id, position=0),
    ])
    db.flush()


def keys(db, model, key_model, fk):
    user_id = db.scalars(select(User.id)).one()
    return sorted(db.scalars(select(key_model.key).join(model, fk == key_model.id).where(model.user_id == user_id)))


def signup(client):
    response = client.post("/api/auth/signup", json=signup_body("new@example.com"))
    assert response.status_code == 201
    return response.json()


def test_catch_up_in_a_teaching_week(client, db, content, today_is):
    today_is(date(2026, 10, 14))  # week 11
    assert signup(client)["prefilled_through_week"] == 10
    assert keys(db, TaskCompletion, Task, TaskCompletion.task_id) == ["t9"]
    assert keys(db, AssessmentSubmission, Assessment, AssessmentSubmission.assessment_id) == ["past"]
    assert keys(db, PrerequisiteCompletion, Prerequisite, PrerequisiteCompletion.prerequisite_id) == ["aws-account"]


def test_catch_up_leaves_assessments_due_today_alone(client, db, content, today_is):
    today_is(date(2026, 10, 14))
    signup(client)
    assert "today" not in keys(db, AssessmentSubmission, Assessment, AssessmentSubmission.assessment_id)


def test_catch_up_on_a_break_ticks_everything_before_the_next_week(client, db, content, today_is):
    today_is(date(2026, 12, 25))  # Christmas break, week 21 next
    assert signup(client)["prefilled_through_week"] == 20
    assert keys(db, TaskCompletion, Task, TaskCompletion.task_id) == ["t11", "t9"]
    assert keys(db, PrerequisiteCompletion, Prerequisite, PrerequisiteCompletion.prerequisite_id) == ["aws-account"]


def test_no_catch_up_before_the_programme_starts(client, db, content, today_is):
    today_is(date(2026, 7, 1))
    assert signup(client)["prefilled_through_week"] is None
    assert keys(db, TaskCompletion, Task, TaskCompletion.task_id) == []


def test_catch_up_after_the_end_ticks_everything(client, db, content, today_is):
    today_is(date(2027, 5, 1))
    assert signup(client)["prefilled_through_week"] == 32
    assert keys(db, TaskCompletion, Task, TaskCompletion.task_id) == ["t11", "t21", "t9"]
    assert keys(db, PrerequisiteCompletion, Prerequisite, PrerequisiteCompletion.prerequisite_id) == ["aws-account", "forti"]


def test_login_does_not_catch_up(client, db, content, today_is):
    today_is(date(2026, 7, 1))
    signup(client)
    today_is(date(2026, 10, 14))
    client.post("/api/auth/login", json={"email": "new@example.com", "password": "correct horse"})
    assert keys(db, TaskCompletion, Task, TaskCompletion.task_id) == []
```

Run: `uv run pytest tests/test_catchup.py -v` → FAIL (`prefilled_through_week` missing).

- [ ] **Step 2: Implement**

`backend/app/catchup.py`:

```python
"""Students often join mid-programme. At sign-up, tick off what's already behind them so This week starts clean."""

from datetime import date

from sqlalchemy import insert, select
from sqlalchemy.orm import Session

from app.models import (
    Assessment, AssessmentSubmission, Intake, PrerequisiteCompletion, SubmodulePrerequisite, Task, TaskCompletion,
    User, Week,
)
from app.schedule import TeachingWeek, locate


def prefill_past_work(db: Session, user: User, intake: Intake, today: date) -> int | None:
    """Tick tasks in past weeks, mark past-due assessments submitted and prerequisites of started submodules done.

    Returns the last week counted as past, or None when nothing is past yet."""
    weeks = [TeachingWeek(w.week_number, w.starts_on) for w in intake.weeks]
    cutoff = locate(weeks, today).cutoff_week
    past = [w.week_number for w in weeks if cutoff is not None and w.week_number < cutoff]
    if not past:
        return None

    task_ids = db.scalars(select(Task.id).join(Week).where(Week.week_number < cutoff)).all()
    assessment_ids = db.scalars(select(Assessment.id).where(Assessment.due_date < today)).all()
    prereq_ids = db.scalars(
        select(SubmodulePrerequisite.prerequisite_id)
        .join(Week, Week.submodule_id == SubmodulePrerequisite.submodule_id)
        .where(Week.week_number < cutoff)
        .distinct()
    ).all()
    if task_ids:
        db.execute(insert(TaskCompletion), [{"user_id": user.id, "task_id": i} for i in task_ids])
    if assessment_ids:
        db.execute(insert(AssessmentSubmission), [{"user_id": user.id, "assessment_id": i} for i in assessment_ids])
    if prereq_ids:
        db.execute(insert(PrerequisiteCompletion), [{"user_id": user.id, "prerequisite_id": i} for i in prereq_ids])
    return max(past)
```

Schemas: `class SignupOut(MeOut): prefilled_through_week: int | None = None`.

`backend/app/api/auth.py` signup: add `today_: date = Depends(today)` (import `from datetime import date` alongside the existing `datetime` import, and `from app.clock import today`); `response_model=SignupOut`; after the successful `db.flush()`:

```python
    prefilled = prefill_past_work(db, user, intake, today_)
    token = start_session(db, user)
    db.commit()
    _set_cookie(response, token)
    return SignupOut(**_me(user).model_dump(), prefilled_through_week=prefilled)
```

Update `test_signup_starts_a_session_with_a_safe_cookie` to expect `"prefilled_through_week": None` in the body too.

- [ ] **Step 3: Run tests, full suite, commit**

Run: `uv run pytest tests/test_catchup.py tests/test_auth_api.py -v` → PASS, then `uv run pytest` → PASS.

```bash
git add backend
git commit -m "feat(auth): tick off past weeks, past deadlines and started setup steps at sign-up"
```

---

### Task 7: Frontend foundations: API types, routes, sidebar, Coming soon, no Settings

**Files:**
- Create: `frontend/src/hooks/useThisWeek.ts` (query only for now), `frontend/src/pages/ThisWeekPage.tsx` (placeholder heading; filled in Task 9)
- Modify: `frontend/src/api.ts`, `frontend/src/App.tsx`, `frontend/src/format.ts`, `frontend/src/format.test.ts`, `frontend/src/progress.ts`, `frontend/src/progress.test.ts`, `frontend/src/components/Sidebar.tsx`, `frontend/src/components/Sidebar.test.tsx`, `frontend/src/components/module/ModuleHeader.tsx`, `frontend/src/pages/ModulePage.tsx`, `frontend/src/pages/ModulePage.test.tsx`, `frontend/src/pages/ModulesPage.tsx`, `frontend/src/pages/ModulesPage.test.tsx`, `frontend/src/pages/NotFoundPage.tsx`, `frontend/src/test/utils.tsx`, `frontend/src/index.css`, and any test that renders `/` expecting Modules
- Delete: `frontend/src/pages/SettingsPage.tsx`, `frontend/src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: backend responses from Tasks 2, 4, 5, 6
- Produces (in `api.ts`):

```ts
export type AssessmentStatus = 'submitted' | 'due_today' | 'upcoming' | 'overdue' | 'no_date'
export interface Assessment { key: string; title: string; due_date: string | null; uplearn_url: string | null; submitted: boolean; status: AssessmentStatus; days_until: number | null }
export interface AssessmentWithModule extends Assessment { module_key: string; module_code: string }
export interface Me { email: string; study_mode: 'FT' | 'PT'; intake: { key: string; title: string } }
export interface SignupResult extends Me { prefilled_through_week: number | null }
export type WeekStatus = 'before_start' | 'teaching' | 'break' | 'finished'
export interface ThisWeekGroup { module_key: string; module_code: string; module_title: string; module_uplearn_url: string | null; submodule: { key: string; code: string; title: string; uplearn_url: string | null }; week: Week; prerequisites: Prerequisite[] }
export interface LurkingTask extends Task { module_code: string }
export interface ThisWeek {
  today: string
  status: WeekStatus
  week: { week_number: number; starts_on: string; ends_on: string } | null
  current_break: { starts_on: string; ends_on: string; week_of_break: number; length_weeks: number } | null
  next_week: { week_number: number; starts_on: string } | null
  upcoming_break: { starts_on: string; ends_on: string; length_weeks: number; resumes_week: number; resumes_on: string } | null
  holidays: { day: string; name: string }[]
  groups: ThisWeekGroup[]
  ahead: { week_number: number; groups: ThisWeekGroup[] } | null
  lurking: { week_number: number; tasks: LurkingTask[] }[]
  assessments: AssessmentWithModule[]
  stats: { done: number; total: number; next_deadline_days: number | null }
}
export const fetchThisWeek = () => request<ThisWeek>('GET', '/this-week')
export const fetchAssessments = () => request<AssessmentWithModule[]>('GET', '/assessments')
export const setAssessmentSubmitted = (key: string, submitted: boolean) =>
  request<void>(submitted ? 'PUT' : 'DELETE', `/assessments/${encodeURIComponent(key)}/submitted`)
export const signup = (email: string, password: string) =>
  request<SignupResult>('POST', '/auth/signup', { email, password, accepted_disclaimer_version: DISCLAIMER_VERSION })
// updateSettings removed
```

- `format.ts`: `shortDate(iso) -> '12 Oct'`, `dayDate(iso) -> 'Mon 12 Oct'`, `dateSpan(start, end) -> '12–18 Oct' | '28 Sep – 4 Oct'`, `weekFooter(tw: ThisWeek) -> string`
- `useThisWeek()` in `src/hooks/useThisWeek.ts`: `useQuery({ queryKey: ['this-week'], queryFn: fetchThisWeek })`
- `test/utils.tsx`: `ME` with the new shape; `THIS_WEEK: ThisWeek` (teaching week 11, no groups); `mockApi` answers `/api/this-week` with `THIS_WEEK` unless overridden
- Routes: `/` → `ThisWeekPage`, `/modules` → `ModulesPage`, `/assessments` → placeholder until Task 8 (route it to `NotFoundPage`, or add it in Task 8), `/settings` removed

- [ ] **Step 1: Format helpers, test-first**

Add to `frontend/src/format.test.ts`:

```ts
import type { ThisWeek } from './api'
import { THIS_WEEK } from './test/utils'

describe('dates', () => {
  it('formats short and day dates without shifting the day', () => {
    expect(shortDate('2026-10-12')).toBe('12 Oct')
    expect(dayDate('2026-10-12')).toBe('Mon 12 Oct')
  })
  it('spans a week inside one month or across two', () => {
    expect(dateSpan('2026-10-12', '2026-10-18')).toBe('12–18 Oct')
    expect(dateSpan('2026-09-28', '2026-10-04')).toBe('28 Sep – 4 Oct')
  })
})

describe('weekFooter', () => {
  const tw = (over: Partial<ThisWeek>): ThisWeek => ({ ...THIS_WEEK, ...over })
  it('names the week and its dates while teaching', () => {
    expect(weekFooter(THIS_WEEK)).toBe('Week 11 · 12–18 Oct')
  })
  it('says when a break ends', () => {
    expect(weekFooter(tw({ status: 'break', week: null, current_break: { starts_on: '2026-09-14', ends_on: '2026-09-27', week_of_break: 1, length_weeks: 2 } }))).toBe('On break until 27 Sep')
  })
  it('says when the programme starts, or that it has finished', () => {
    expect(weekFooter(tw({ status: 'before_start', week: null, next_week: { week_number: 1, starts_on: '2026-07-20' } }))).toBe('Starts Mon 20 Jul')
    expect(weekFooter(tw({ status: 'finished', week: null }))).toBe('Programme finished')
  })
})
```

Delete the `daysUntil`, `countdownLabel` and `countdownTone` tests **in Task 8** (the rail still uses them until then).

Implement in `frontend/src/format.ts`:

```ts
import type { ThisWeek } from './api'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function localDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function shortDate(iso: string): string {
  const d = localDate(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function dayDate(iso: string): string {
  return `${DAYS[localDate(iso).getDay()]} ${shortDate(iso)}`
}

export function dateSpan(start: string, end: string): string {
  const a = localDate(start)
  const b = localDate(end)
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${shortDate(end)}` : `${shortDate(start)} – ${shortDate(end)}`
}

export function weekFooter(tw: ThisWeek): string {
  if (tw.status === 'teaching' && tw.week) return `Week ${tw.week.week_number} · ${dateSpan(tw.week.starts_on, tw.week.ends_on)}`
  if (tw.status === 'break' && tw.current_break) return `On break until ${shortDate(tw.current_break.ends_on)}`
  if (tw.status === 'before_start') return tw.next_week ? `Starts ${dayDate(tw.next_week.starts_on)}` : 'No schedule yet'
  return 'Programme finished'
}
```

- [ ] **Step 2: api.ts, test utils, hook**

Apply the `api.ts` changes from **Interfaces**. In `src/test/utils.tsx`:

```ts
import type { Me, ThisWeek } from '../api'

export const ME: Me = { email: 'joel@example.com', study_mode: 'FT', intake: { key: '2607-online-ccc-ft', title: 'July 2026 intake, full-time (NZ4129)' } }

export const THIS_WEEK: ThisWeek = {
  today: '2026-10-14',
  status: 'teaching',
  week: { week_number: 11, starts_on: '2026-10-12', ends_on: '2026-10-18' },
  current_break: null,
  next_week: null,
  upcoming_break: null,
  holidays: [],
  groups: [],
  ahead: null,
  lurking: [],
  assessments: [],
  stats: { done: 0, total: 0, next_deadline_days: null },
}
```

and in `mockApi`: `const all: Record<string, Route> = { '/api/me': ME, '/api/this-week': THIS_WEEK, ...routes }` (update the doc comment).

`src/hooks/useThisWeek.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { fetchThisWeek } from '../api'

export function useThisWeek() {
  return useQuery({ queryKey: ['this-week'], queryFn: fetchThisWeek })
}
```

Remove `weekOptions` from `progress.ts` and its `describe('weekOptions')` from `progress.test.ts`. Delete `SettingsPage.tsx` and `SettingsPage.test.tsx`.

- [ ] **Step 3: Routes and placeholder page**

`src/pages/ThisWeekPage.tsx` (placeholder, replaced in Task 9):

```tsx
import { usePageTitle } from '../usePageTitle'

export function ThisWeekPage() {
  usePageTitle('This week')
  return (
    <main className="page">
      <h1>This week</h1>
    </main>
  )
}
```

`src/App.tsx` routes inside `AppShell`:

```tsx
            <Route path="/" element={<ThisWeekPage />} />
            <Route path="/modules" element={<ModulesPage />} />
            <Route path="/modules/:key" element={<ModulePage />} />
            <Route path="/disclaimer" element={<DisclaimerPage />} />
            <Route path="*" element={<NotFoundPage />} />
```

Change every "back to modules" link to `/modules`: `ModuleHeader` breadcrumb, `ModulePage` 404 link, `NotFoundPage`. Update tests that render `/` expecting the Modules page to render `/modules` (ModulesPage.test, App.test and any others; grep for `renderAt('/')`). Update the ModulePage breadcrumb assertion to `href="/modules"`.

- [ ] **Step 4: Coming soon on the Modules page, test-first**

Add to `ModulesPage.test.tsx` (the `ccc601` fixture already has `week_count: 0`):

```tsx
  it('shows a module with no weeks as coming soon, without a link or progress bar', async () => {
    mockApi({ '/api/modules': modules })
    renderAt('/modules')
    const main = await loadedMain()
    const card = within(main).getByText('Public Cloud Administration').closest('li')!
    expect(within(card).getByText('Coming soon')).toBeInTheDocument()
    expect(within(card).queryByRole('link')).not.toBeInTheDocument()
    expect(within(card).queryByRole('progressbar')).not.toBeInTheDocument()
  })
```

In `ModulesPage.tsx`, render coming-soon cards like this:

```tsx
          {query.data.map((m) =>
            m.week_count === 0 ? (
              <li key={m.key} className="card module-card is-coming-soon">
                <span className="mono small muted">{m.code}</span>
                <span className="module-card-title">{m.title}</span>
                <span className="soon">Coming soon</span>
              </li>
            ) : (
              /* existing card */
            ),
          )}
```

CSS (`index.css`): `.module-card.is-coming-soon { opacity: 0.6; }` and `.module-card.is-coming-soon .soon { margin-left: 0; align-self: flex-start; }`.

- [ ] **Step 5: Sidebar, test-first**

Rewrite the Sidebar tests that mention Settings or the week picker:

```tsx
  it('links This week, Modules and Assessments, with no Settings', async () => {
    mockApi({ '/api/modules': modules })
    renderAt('/modules')
    await within(nav()).findByText('CCC602')
    expect(within(nav()).getByRole('link', { name: 'This week' })).toHaveAttribute('href', '/')
    expect(within(nav()).getByRole('link', { name: 'Modules' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav()).getByRole('link', { name: 'Assessments' })).toHaveAttribute('href', '/assessments')
    expect(within(nav()).queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument()
  })

  it('shows where you are in the programme in the footer', async () => {
    mockApi({ '/api/modules': modules })
    renderAt('/modules')
    expect(await within(nav()).findByText('Week 11 · 12–18 Oct')).toBeInTheDocument()
  })

  it('greys out a module that is coming soon', async () => {
    mockApi({ '/api/modules': [...modules, { key: 'ccc604', code: 'CCC604', title: 'Multi-Cloud', submodule_count: 0, week_count: 0, task_count: 0, completed_count: 0, week_numbers: [], uplearn_url: null }] })
    renderAt('/modules')
    const item = (await within(nav()).findByText('Multi-Cloud')).closest('li')!
    expect(within(item).getByText('Soon')).toBeInTheDocument()
    expect(within(item).queryByRole('link')).not.toBeInTheDocument()
  })
```

Sidebar changes:
- "This week" becomes `<Link to="/" className="nav-item" aria-current={pathname === '/' ? 'page' : undefined}>` (no "Soon" badge). "Assessments" becomes `<Link to="/assessments" ...>` with `aria-current` when `pathname === '/assessments'`. Remove the Settings item.
- `modulesCurrent = pathname === '/modules' ? 'page' : pathname.startsWith('/modules/') ? 'true' : undefined`; Modules links to `/modules`.
- Side modules with `m.week_count === 0` render `<span className="side-module is-coming-soon">` with the code, title and `<span className="soon">Soon</span>`, no percentage or progress bar.
- Footer: replace the current-week paragraph with `{thisWeek.data && <p className="small">{weekFooter(thisWeek.data)}</p>}` using `useThisWeek()`.

CSS: `.side-module.is-coming-soon { opacity: 0.6; cursor: default; }`.

- [ ] **Step 6: ModulePage current week**

In `ModulePage.tsx`, replace `useMe` with `useThisWeek` and pass `currentWeek={thisWeek.data?.status === 'teaching' ? thisWeek.data.week?.week_number ?? null : null}`. In `ModulePage.test.tsx` (around line 442), the "current week" test mocks `'/api/this-week': { ...THIS_WEEK, week: { week_number: 10, starts_on: '2026-10-05', ends_on: '2026-10-11' } }` in place of the `current_week: 10` ME.

- [ ] **Step 7: Run everything and commit**

Run: `npm test` then `npm run build` then `npm run lint`
Expected: all pass, no type errors, no lint errors. (AssessmentsRail still compiles: its `Assessment` type only gained fields.)

```bash
git add -A frontend
git commit -m "feat(frontend): This week at /, modules at /modules, coming-soon modules, week from the schedule; remove Settings"
```

---

### Task 8: Submitted tick, status chips and the Assessments page

**Files:**
- Create: `frontend/src/hooks/useSubmitAssessment.ts`, `frontend/src/pages/AssessmentsPage.tsx`, `frontend/src/pages/AssessmentsPage.test.tsx`
- Modify: `frontend/src/components/AssessmentsRail.tsx`, `frontend/src/components/AssessmentsRail.test.tsx`, `frontend/src/progress.ts`, `frontend/src/progress.test.ts`, `frontend/src/format.ts`, `frontend/src/format.test.ts`, `frontend/src/pages/ModulePage.tsx`, `frontend/src/pages/ModulePage.test.tsx`, `frontend/src/App.tsx`, `frontend/src/index.css`

**Interfaces:**
- Consumes: `Assessment`, `AssessmentWithModule`, `fetchAssessments`, `setAssessmentSubmitted` (Task 7)
- Produces:
  - `progress.ts`: `assessmentStatus(daysUntil: number | null, submitted: boolean): AssessmentStatus`, `withAssessmentSubmitted<T extends Assessment>(list: T[], key: string, submitted: boolean): T[]`
  - `format.ts`: `statusChip(a: Assessment): { label: string; tone: 'is-done' | 'is-soon' | 'is-overdue' | '' } | null` (replaces `daysUntil`, `countdownLabel`, `countdownTone`, which are removed)
  - `useSubmitAssessment()` → mutation taking `{ key: string; submitted: boolean }`
  - `AssessmentsRail` props: `{ assessments: (Assessment & { module_code?: string })[]; code?: string; portalUrl: string | null; onToggleSubmitted: (key: string, submitted: boolean) => void; emptyText?: string }`

Chip labels: submitted → "Submitted" (`is-done`); due_today → "Due today" (`is-soon`); upcoming → "Due in N days" (`is-soon` when ≤ 7, else `''`); overdue → "N days overdue" (`is-overdue`); no_date → `null`. Singular "1 day".

- [ ] **Step 1: Helpers, test-first**

`progress.test.ts`:

```ts
describe('assessments', () => {
  const a3 = { key: 'a3', title: 'A3', due_date: '2026-10-25', uplearn_url: null, submitted: false, status: 'upcoming' as const, days_until: 8 }
  const a1 = { key: 'a1', title: 'A1', due_date: '2026-08-16', uplearn_url: null, submitted: false, status: 'overdue' as const, days_until: -62 }
  it('works out status from days and the tick', () => {
    expect(assessmentStatus(8, false)).toBe('upcoming')
    expect(assessmentStatus(0, false)).toBe('due_today')
    expect(assessmentStatus(-1, false)).toBe('overdue')
    expect(assessmentStatus(-1, true)).toBe('submitted')
    expect(assessmentStatus(null, false)).toBe('no_date')
  })
  it('ticks one assessment and recomputes its status', () => {
    const [x, y] = withAssessmentSubmitted([a3, a1], 'a1', true)
    expect(x).toBe(a3)
    expect(y).toEqual({ ...a1, submitted: true, status: 'submitted' })
    expect(withAssessmentSubmitted([y], 'a1', false)[0].status).toBe('overdue')
  })
})
```

`format.test.ts` (replace the countdown tests):

```ts
describe('statusChip', () => {
  const base = { key: 'a', title: 'A', due_date: '2026-10-25', uplearn_url: null, submitted: false }
  it('labels each status', () => {
    expect(statusChip({ ...base, status: 'submitted', days_until: 3 })).toEqual({ label: 'Submitted', tone: 'is-done' })
    expect(statusChip({ ...base, status: 'due_today', days_until: 0 })).toEqual({ label: 'Due today', tone: 'is-soon' })
    expect(statusChip({ ...base, status: 'upcoming', days_until: 1 })).toEqual({ label: 'Due in 1 day', tone: 'is-soon' })
    expect(statusChip({ ...base, status: 'upcoming', days_until: 8 })).toEqual({ label: 'Due in 8 days', tone: '' })
    expect(statusChip({ ...base, status: 'overdue', days_until: -2 })).toEqual({ label: '2 days overdue', tone: 'is-overdue' })
    expect(statusChip({ ...base, due_date: null, status: 'no_date', days_until: null })).toBeNull()
  })
})
```

Implement:

```ts
// progress.ts
export function assessmentStatus(daysUntil: number | null, submitted: boolean): AssessmentStatus {
  if (submitted) return 'submitted'
  if (daysUntil === null) return 'no_date'
  if (daysUntil < 0) return 'overdue'
  return daysUntil === 0 ? 'due_today' : 'upcoming'
}

export function withAssessmentSubmitted<T extends Assessment>(list: T[], key: string, submitted: boolean): T[] {
  return list.map((a) => (a.key === key ? { ...a, submitted, status: assessmentStatus(a.days_until, submitted) } : a))
}

// format.ts
export function statusChip(a: Assessment): { label: string; tone: 'is-done' | 'is-soon' | 'is-overdue' | '' } | null {
  const days = a.days_until ?? 0
  switch (a.status) {
    case 'submitted':
      return { label: 'Submitted', tone: 'is-done' }
    case 'due_today':
      return { label: 'Due today', tone: 'is-soon' }
    case 'upcoming':
      return { label: `Due in ${plural(days, 'day')}`, tone: days <= 7 ? 'is-soon' : '' }
    case 'overdue':
      return { label: `${plural(-days, 'day')} overdue`, tone: 'is-overdue' }
    default:
      return null
  }
}
```

Remove `daysUntil`, `countdownLabel`, `countdownTone` and their tests.

- [ ] **Step 2: Mutation hook**

`src/hooks/useSubmitAssessment.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type AssessmentWithModule, type ModuleDetail, type ThisWeek, setAssessmentSubmitted } from '../api'
import { withAssessmentSubmitted } from '../progress'

const CACHES = ['assessments', 'this-week', 'module'] as const
const mutationKey = ['submit-assessment']

/** Tick or untick "submitted": update every cached list straight away, undo on error, sync once quiet. */
export function useSubmitAssessment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey,
    mutationFn: ({ key, submitted }: { key: string; submitted: boolean }) => setAssessmentSubmitted(key, submitted),
    onMutate: async ({ key, submitted }) => {
      await Promise.all(CACHES.map((k) => queryClient.cancelQueries({ queryKey: [k] })))
      const snapshot = CACHES.flatMap((k) => queryClient.getQueriesData({ queryKey: [k] }))
      queryClient.setQueryData<AssessmentWithModule[]>(['assessments'], (old) => old && withAssessmentSubmitted(old, key, submitted))
      queryClient.setQueryData<ThisWeek>(['this-week'], (old) => old && { ...old, assessments: withAssessmentSubmitted(old.assessments, key, submitted) })
      queryClient.setQueriesData<ModuleDetail>({ queryKey: ['module'] }, (old) => old && { ...old, assessments: withAssessmentSubmitted(old.assessments, key, submitted) })
      return { snapshot }
    },
    onError: (_error, _vars, context) => {
      context?.snapshot.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data))
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) !== 1) return
      CACHES.forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }))
    },
  })
}
```

(`['module']` as a prefix does not match `['modules']`: TanStack compares key elements, and `'module' !== 'modules'`.)

- [ ] **Step 3: Rail, test-first**

Rewrite `AssessmentsRail.test.tsx` around the new props:

```tsx
const list = [
  { key: 'a3', title: 'Assessment 3', due_date: '2026-10-25', uplearn_url: 'https://up.test/a3', submitted: false, status: 'upcoming' as const, days_until: 8, module_code: 'CCC602' },
  { key: 'a1', title: 'Assessment 1', due_date: '2026-08-16', uplearn_url: null, submitted: true, status: 'submitted' as const, days_until: -62, module_code: 'CCC601' },
]

it('shows each assessment with its module, due date and status chip', () => {
  render(<AssessmentsRail assessments={list} portalUrl={null} onToggleSubmitted={() => {}} />)
  const a3 = screen.getByRole('heading', { name: 'Assessment 3' }).closest('li')!
  expect(within(a3).getByText('CCC602')).toBeInTheDocument()
  expect(within(a3).getByText('Due Sun, 25 Oct 2026', { exact: false })).toBeInTheDocument()
  expect(within(a3).getByText('Due in 8 days')).toBeInTheDocument()
  expect(within(screen.getByRole('heading', { name: 'Assessment 1' }).closest('li')!).getByText('Submitted')).toBeInTheDocument()
})

it('ticks submitted', async () => {
  const onToggle = vi.fn()
  render(<AssessmentsRail assessments={list} portalUrl={null} onToggleSubmitted={onToggle} />)
  const a3 = screen.getByRole('heading', { name: 'Assessment 3' }).closest('li')!
  await userEvent.click(within(a3).getByRole('checkbox', { name: 'Mark submitted' }))
  expect(onToggle).toHaveBeenCalledWith('a3', true)
})

it('shows the empty text', () => {
  render(<AssessmentsRail assessments={[]} portalUrl={null} onToggleSubmitted={() => {}} emptyText="No deadlines in the next 4 weeks." />)
  expect(screen.getByText('No deadlines in the next 4 weeks.')).toBeInTheDocument()
})
```

Keep the existing UPLearn-link and portal-button tests, updated to the new props. Check the exact due-date text `formatDueDate` produces in jsdom against the existing test before relying on it.

Rail list item body:

```tsx
            const chip = statusChip(a)
            const titleId = `assessment-${a.key}-title`
            return (
              <li key={a.key} className="card assessment-card">
                <span className="mono small muted">{a.module_code ?? code}</span>
                <h3 id={titleId} className="assessment-title">{a.title}</h3>
                <div className="assessment-foot">
                  <span className="muted small">{a.due_date ? `Due ${formatDueDate(a.due_date)}` : 'Due date: see programme guide'}</span>
                  {chip && <span className={`status-chip ${chip.tone}`.trim()}>{chip.label}</span>}
                </div>
                <label className="submitted-toggle">
                  <input type="checkbox" checked={a.submitted} onChange={() => onToggleSubmitted(a.key, !a.submitted)} aria-describedby={titleId} />
                  Mark submitted
                </label>
                {a.uplearn_url && (/* existing UPLearn link */)}
              </li>
            )
```

CSS: replace the `.countdown` rules with:

```css
.status-chip { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: var(--tag-bg); color: var(--text); }
.status-chip.is-soon { background: #fcefdd; color: var(--soon); }
.status-chip.is-overdue { background: #fde7e7; color: var(--overdue); }
.status-chip.is-done { background: #e3eef9; color: #164f80; }
.submitted-toggle { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; font-size: 14px; }
```

(Check that `--text` and `--overdue` exist in `:root`; use whatever the stylesheet already calls its body text colour.)

ModulePage: `const submit = useSubmitAssessment()` and pass `onToggleSubmitted={(key, submitted) => submit.mutate({ key, submitted })}`; show the same "Couldn't save that tick. Try again." alert when `submit.isError`. Update the ModulePage test's `detail.assessments` fixture with `submitted`, `status`, `days_until`.

- [ ] **Step 4: Assessments page, test-first**

`src/pages/AssessmentsPage.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { jsonResponse, mockApi, renderAt } from '../test/utils'

const all = [
  { key: 'a1', title: 'Assessment 1', due_date: '2026-08-16', uplearn_url: null, submitted: true, status: 'submitted', days_until: -62, module_key: 'ccc601', module_code: 'CCC601' },
  { key: 'a3', title: 'Assessment 3', due_date: '2026-10-25', uplearn_url: 'https://up.test/a3', submitted: false, status: 'upcoming', days_until: 8, module_key: 'ccc602', module_code: 'CCC602' },
]

describe('AssessmentsPage', () => {
  it('groups assessments by module', async () => {
    mockApi({ '/api/assessments': all, '/api/modules': [] })
    renderAt('/assessments')
    expect(await screen.findByRole('heading', { level: 1, name: 'Assessments' })).toBeInTheDocument()
    const ccc602 = screen.getByRole('region', { name: 'CCC602' })
    expect(within(ccc602).getByText('Assessment 3')).toBeInTheDocument()
    expect(within(ccc602).getByText('Due in 8 days')).toBeInTheDocument()
  })

  it('ticks submitted straight away and saves it', async () => {
    const calls: string[] = []
    mockApi({ '/api/assessments': all, '/api/modules': [], 'PUT /api/assessments/a3/submitted': () => (calls.push('put'), new Response(null, { status: 204 })) })
    renderAt('/assessments')
    const region = await screen.findByRole('region', { name: 'CCC602' })
    await userEvent.click(within(region).getByRole('checkbox', { name: 'Mark submitted' }))
    expect(within(region).getByRole('checkbox', { name: 'Mark submitted' })).toBeChecked()
    await waitFor(() => expect(calls).toEqual(['put']))
  })

  it('rolls the tick back when saving fails', async () => {
    mockApi({ '/api/assessments': all, '/api/modules': [], 'PUT /api/assessments/a3/submitted': () => jsonResponse({ detail: 'boom' }, 500) })
    renderAt('/assessments')
    const region = await screen.findByRole('region', { name: 'CCC602' })
    await userEvent.click(within(region).getByRole('checkbox', { name: 'Mark submitted' }))
    await waitFor(() => expect(within(region).getByRole('checkbox', { name: 'Mark submitted' })).not.toBeChecked())
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save that tick. Try again.")
  })
})
```

`src/pages/AssessmentsPage.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import { type AssessmentWithModule, fetchAssessments } from '../api'
import { AssessmentsRail } from '../components/AssessmentsRail'
import { ErrorMessage } from '../components/ErrorMessage'
import { useSubmitAssessment } from '../hooks/useSubmitAssessment'
import { usePageTitle } from '../usePageTitle'

function byModule(list: AssessmentWithModule[]): [string, AssessmentWithModule[]][] {
  const groups = new Map<string, AssessmentWithModule[]>()
  for (const a of list) groups.set(a.module_code, [...(groups.get(a.module_code) ?? []), a])
  return [...groups.entries()]
}

export function AssessmentsPage() {
  usePageTitle('Assessments')
  const query = useQuery({ queryKey: ['assessments'], queryFn: fetchAssessments })
  const submit = useSubmitAssessment()

  if (query.isPending) return <main className="page"><p className="muted">Loading…</p></main>
  if (query.isError) return <main className="page"><ErrorMessage error={query.error} onRetry={() => query.refetch()} /></main>

  return (
    <main className="page">
      <header className="page-header">
        <h1>Assessments</h1>
        <p className="muted">Every assessment in the programme. Tick one off once you've submitted it on UPLearn.</p>
      </header>
      {submit.isError && <p role="alert" className="error">Couldn't save that tick. Try again.</p>}
      {byModule(query.data).map(([code, list]) => (
        <section key={code} aria-label={code} className="assessments-module">
          <AssessmentsRail assessments={list} code={code} portalUrl={null} onToggleSubmitted={(key, submitted) => submit.mutate({ key, submitted })} />
        </section>
      ))}
    </main>
  )
}
```

The rail renders its own `<aside>` with an "Assessments" `h2`. Give the rail an optional `heading?: string` prop (default "Assessments") and pass `heading={code}` here, so each section reads "CCC601", "CCC602". Use `useId()` for the heading id, since the rail now appears several times on one page.

Route: `<Route path="/assessments" element={<AssessmentsPage />} />` in `App.tsx`.

- [ ] **Step 5: Run everything and commit**

Run: `npm test`, `npm run build`, `npm run lint` → all pass.

```bash
git add -A frontend
git commit -m "feat(frontend): mark assessments submitted, status chips, and an Assessments page"
```

---

### Task 9: The This week page

**Files:**
- Create: `frontend/src/components/thisweek/WeekGroups.tsx`, `frontend/src/pages/ThisWeekPage.test.tsx`
- Modify: `frontend/src/pages/ThisWeekPage.tsx` (replace placeholder), `frontend/src/hooks/useThisWeek.ts`, `frontend/src/hooks/useTickTask.ts`, `frontend/src/progress.ts`, `frontend/src/progress.test.ts`, `frontend/src/index.css`

**Interfaces:**
- Consumes: `ThisWeek`, `ThisWeekGroup`, `useThisWeek` (Task 7); `AssessmentsRail`, `useSubmitAssessment` (Task 8); `TaskRow` from `components/module/WeekTimeline`, `PrerequisiteBox` from `components/module/PrerequisiteBox`, `ProgressBar`, `ExternalLink`
- Produces:
  - `progress.ts`: `withThisWeekTaskDone(tw: ThisWeek, taskKey: string, done: boolean): ThisWeek`, `withThisWeekPrerequisiteDone(tw: ThisWeek, key: string, completed: boolean): ThisWeek`
  - `useThisWeek.ts`: `useTickThisWeekTask()` (mutation `{ taskKey, done }`) and `useTickThisWeekPrerequisite()` (mutation `{ prerequisiteKey, completed }`), sharing mutation key `['tick', 'this-week']`
  - `WeekGroups({ groups, onToggleTask, onTogglePrerequisite })`
  - `useTickTask.ts` `settleTicks` also invalidates `['this-week']`

Page copy (exact):
- Teaching header: `h1` "Week 11"; line "Mon 12 Oct – Sun 18 Oct · CCC602 Data Engineering in the Public Cloud" (module codes and titles from the groups, joined with ", "; dates only when there are no groups); progress bar labelled "This week's progress" with "2/5 tasks done"; when `stats.next_deadline_days !== null`, "Next deadline in 8 days" ("Next deadline today" at 0).
- No content: "Content for this week isn't in the app yet." plus an `ExternalLink` "Open UPLearn" to `https://yoobee.uplearn.education/`.
- Ahead: `h2` "You're ahead of schedule 🎉", `h3` "Next up · Week 12", then `WeekGroups`, or "Week 12 isn't in the app yet." when its groups are empty.
- Break: `h1` "You're on break 🌴"; "Until Sun 27 Sep (week 1 of 2)."; "Rest up, or use the time to clear anything still lurking."; "Week 9 starts Mon 28 Sep."
- Before start: `h1` "This week"; "The programme starts Mon 20 Jul." (or "The schedule isn't loaded yet." when `next_week` is null).
- Finished: `h1` "Programme finished"; "You've reached the end of the programme."
- Rail: `AssessmentsRail` with `assessments={tw.assessments}`, `portalUrl={null}`, `emptyText="No deadlines in the next 4 weeks."`.

- [ ] **Step 1: Optimistic helpers, test-first**

`progress.test.ts`:

```ts
describe('this week ticks', () => {
  const task = (key: string, done = false) => ({ key, title: key, type: 'lab' as const, external_url: 'https://x.test', uplearn_url: null, note: null, done })
  const group = (key: string, tasks: ReturnType<typeof task>[]) => ({
    module_key: 'ccc602', module_code: 'CCC602', module_title: 'DE', module_uplearn_url: null,
    submodule: { key: 'dp900', code: 'DP-900', title: 'DP', uplearn_url: null },
    week: { key, submodule_key: 'dp900', week_number: 11, title: key, tasks },
    prerequisites: [{ key: 'azure', title: 'Azure', note: null, external_url: 'https://a.test', uplearn_url: null, completed: false }],
  })
  const tw = { ...THIS_WEEK, groups: [group('w11', [task('t1'), task('t2')])], lurking: [{ week_number: 10, tasks: [{ ...task('t0'), module_code: 'CCC602' }] }], stats: { done: 0, total: 2, next_deadline_days: null } }

  it('ticks a task in this week and recounts', () => {
    const next = withThisWeekTaskDone(tw, 't1', true)
    expect(next.groups[0].week.tasks[0].done).toBe(true)
    expect(next.stats.done).toBe(1)
  })
  it('ticks a lurking task', () => {
    expect(withThisWeekTaskDone(tw, 't0', true).lurking[0].tasks[0].done).toBe(true)
  })
  it('ticks a prerequisite in every group', () => {
    expect(withThisWeekPrerequisiteDone(tw, 'azure', true).groups[0].prerequisites[0].completed).toBe(true)
  })
})
```

Implement:

```ts
function tickGroups(groups: ThisWeekGroup[], taskKey: string, done: boolean): ThisWeekGroup[] {
  return groups.map((g) =>
    g.week.tasks.some((t) => t.key === taskKey)
      ? { ...g, week: { ...g.week, tasks: g.week.tasks.map((t) => (t.key === taskKey ? { ...t, done } : t)) } }
      : g,
  )
}

export function withThisWeekTaskDone(tw: ThisWeek, taskKey: string, done: boolean): ThisWeek {
  const groups = tickGroups(tw.groups, taskKey, done)
  return {
    ...tw,
    groups,
    ahead: tw.ahead && { ...tw.ahead, groups: tickGroups(tw.ahead.groups, taskKey, done) },
    lurking: tw.lurking.map((w) => ({ ...w, tasks: w.tasks.map((t) => (t.key === taskKey ? { ...t, done } : t)) })),
    stats: { ...tw.stats, done: groups.reduce((n, g) => n + weekDone(g.week), 0) },
  }
}

export function withThisWeekPrerequisiteDone(tw: ThisWeek, key: string, completed: boolean): ThisWeek {
  const tick = (groups: ThisWeekGroup[]) =>
    groups.map((g) => ({ ...g, prerequisites: g.prerequisites.map((p) => (p.key === key ? { ...p, completed } : p)) }))
  return { ...tw, groups: tick(tw.groups), ahead: tw.ahead && { ...tw.ahead, groups: tick(tw.ahead.groups) } }
}
```

- [ ] **Step 2: Tick hooks**

Append to `src/hooks/useThisWeek.ts`:

```ts
const thisWeekKey = ['this-week']
const mutationKey = ['tick', 'this-week']

function settle(queryClient: QueryClient) {
  if (queryClient.isMutating({ mutationKey }) !== 1) return
  void queryClient.invalidateQueries({ queryKey: thisWeekKey })
  void queryClient.invalidateQueries({ queryKey: ['module'] })
  void queryClient.invalidateQueries({ queryKey: ['modules'] })
}

function useOptimisticThisWeek<V>(mutationFn: (v: V) => Promise<void>, apply: (tw: ThisWeek, v: V) => ThisWeek) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey,
    mutationFn,
    onMutate: async (vars: V) => {
      await queryClient.cancelQueries({ queryKey: thisWeekKey })
      const previous = queryClient.getQueryData<ThisWeek>(thisWeekKey)
      if (previous) queryClient.setQueryData(thisWeekKey, apply(previous, vars))
      return { previous }
    },
    onError: (_e, _v, context) => {
      if (context?.previous) queryClient.setQueryData(thisWeekKey, context.previous)
    },
    onSettled: () => settle(queryClient),
  })
}

export const useTickThisWeekTask = () =>
  useOptimisticThisWeek(
    ({ taskKey, done }: { taskKey: string; done: boolean }) => setTaskDone(taskKey, done),
    (tw, { taskKey, done }) => withThisWeekTaskDone(tw, taskKey, done),
  )

export const useTickThisWeekPrerequisite = () =>
  useOptimisticThisWeek(
    ({ prerequisiteKey, completed }: { prerequisiteKey: string; completed: boolean }) => setPrerequisiteDone(prerequisiteKey, completed),
    (tw, { prerequisiteKey, completed }) => withThisWeekPrerequisiteDone(tw, prerequisiteKey, completed),
  )
```

In `useTickTask.ts` `settleTicks`, add `void queryClient.invalidateQueries({ queryKey: ['this-week'] })`.

- [ ] **Step 3: Page tests**

`src/pages/ThisWeekPage.test.tsx`. Build fixtures from `THIS_WEEK`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ThisWeek } from '../api'
import { THIS_WEEK, mockApi, renderAt } from '../test/utils'

const task = (key: string, done = false) => ({ key, title: `Task ${key}`, type: 'lab' as const, external_url: 'https://x.test/' + key, uplearn_url: null, note: null, done })
const group = (weekNumber: number, tasks: ReturnType<typeof task>[]) => ({
  module_key: 'ccc602', module_code: 'CCC602', module_title: 'Data Engineering in the Public Cloud', module_uplearn_url: 'https://up.test/602',
  submodule: { key: 'dp900', code: 'DP-900', title: 'Azure Data Fundamentals', uplearn_url: null },
  week: { key: `w${weekNumber}`, submodule_key: 'dp900', week_number: weekNumber, title: `Week ${weekNumber} work`, tasks },
  prerequisites: [{ key: 'azure', title: 'Create an Azure account', note: null, external_url: 'https://azure.test', uplearn_url: null, completed: false }],
})
const teaching: ThisWeek = { ...THIS_WEEK, groups: [group(11, [task('t1', true), task('t2')])], stats: { done: 1, total: 2, next_deadline_days: 8 } }

function show(tw: ThisWeek, extra: Record<string, unknown> = {}) {
  const fetchMock = mockApi({ '/api/this-week': tw, '/api/modules': [], ...extra })
  renderAt('/')
  return fetchMock
}
```

Tests to write (each asserts with exact copy from **Page copy** above):
1. `"shows this week's header, progress and tasks"`: `teaching` → `h1` "Week 11"; text "Mon 12 Oct – Sun 18 Oct · CCC602 Data Engineering in the Public Cloud"; progressbar "This week's progress" `aria-valuenow` 50; "1/2 tasks done"; "Next deadline in 8 days"; checkboxes "Task t1" (checked) and "Task t2"; the "Before you start" box lists "Create an Azure account".
2. `"says when this week has no content yet"`: `{ ...THIS_WEEK }` (no groups) → "Content for this week isn't in the app yet." and a link "Open UPLearn" to `https://yoobee.uplearn.education/`.
3. `"shows next week when you're ahead"`: `{ ...teaching, ahead: { week_number: 12, groups: [group(12, [task('t12')])] } }` → heading "You're ahead of schedule 🎉", heading "Next up · Week 12", checkbox "Task t12". Then with `ahead: { week_number: 12, groups: [] }` → "Week 12 isn't in the app yet."
4. `"shows the break screen"`: `{ ...THIS_WEEK, status: 'break', week: null, current_break: { starts_on: '2026-09-14', ends_on: '2026-09-27', week_of_break: 1, length_weeks: 2 }, next_week: { week_number: 9, starts_on: '2026-09-28' } }` → `h1` "You're on break 🌴", "Until Sun 27 Sep (week 1 of 2).", "Week 9 starts Mon 28 Sep."
5. `"before the programme starts"` and `"after it finishes"`: the copy for each.
6. `"ticks a task straight away and saves it"`: click "Task t2" → checked at once; `PUT /api/tasks/t2/complete` called; progress shows "2/2 tasks done".
7. `"refreshes this week, modules and module pages after a tick"`: count fetches to `/api/this-week` and `/api/modules` before and after a tick (wrap them in handler functions that push to an array); after the `PUT` settles, each has been fetched again.
8. `"rolls back a failed tick"`: `PUT` returns 500 → checkbox unchecked again and the alert "Couldn't save that tick. Try again." is shown.
9. `"lists upcoming assessments in the rail"`: `assessments: [{ key: 'a3', title: 'Assessment 3', due_date: '2026-10-25', uplearn_url: null, submitted: false, status: 'upcoming', days_until: 8, module_key: 'ccc602', module_code: 'CCC602' }]` → "Assessment 3" and "Due in 8 days" inside the rail; with `[]` → "No deadlines in the next 4 weeks."

Run: `npx vitest run src/pages/ThisWeekPage.test.tsx` → FAIL (placeholder page).

- [ ] **Step 4: Implement `WeekGroups` and the page**

`src/components/thisweek/WeekGroups.tsx`:

```tsx
import type { ThisWeekGroup } from '../../api'
import { ExternalLink } from '../ExternalLink'
import { PrerequisiteBox } from '../module/PrerequisiteBox'
import { TaskRow } from '../module/WeekTimeline'

export function WeekGroups({
  groups,
  onToggleTask,
  onTogglePrerequisite,
}: {
  groups: ThisWeekGroup[]
  onToggleTask: (taskKey: string, done: boolean) => void
  onTogglePrerequisite: (prerequisiteKey: string, completed: boolean) => void
}) {
  return (
    <>
      {groups.map((g) => (
        <section key={g.week.key} className="card week-group" aria-labelledby={`group-${g.week.key}`}>
          <header className="submodule-head">
            <h3 id={`group-${g.week.key}`}>
              <span className="mono">{g.submodule.code}</span> · {g.submodule.title}
            </h3>
            <span className="small muted">{g.week.title}</span>
            {g.submodule.uplearn_url && (
              <ExternalLink href={g.submodule.uplearn_url} label={`${g.submodule.code} on UPLearn`}>UPLearn</ExternalLink>
            )}
          </header>
          <PrerequisiteBox
            submodule={{ ...g.submodule, first_week: null, last_week: null, prerequisites: g.prerequisites }}
            onToggle={onTogglePrerequisite}
          />
          {g.week.tasks.length === 0 ? (
            <p className="muted">No tasks listed for this week.</p>
          ) : (
            <ul className="task-list">
              {g.week.tasks.map((t) => <TaskRow key={t.key} task={t} onToggle={onToggleTask} />)}
            </ul>
          )}
        </section>
      ))}
    </>
  )
}
```

`src/pages/ThisWeekPage.tsx`: loading and error states copy `ModulesPage`. Body:

```tsx
export function ThisWeekPage() {
  usePageTitle('This week')
  const query = useThisWeek()
  const tickTask = useTickThisWeekTask()
  const tickPrereq = useTickThisWeekPrerequisite()
  const submit = useSubmitAssessment()
  // ...isPending / isError as in ModulesPage
  const tw = query.data
  const onToggleTask = (taskKey: string, done: boolean) => tickTask.mutate({ taskKey, done })
  const onTogglePrerequisite = (prerequisiteKey: string, completed: boolean) => tickPrereq.mutate({ prerequisiteKey, completed })
  return (
    <main className="page">
      <StatusHeader tw={tw} />
      {(tickTask.isError || tickPrereq.isError || submit.isError) && (
        <p role="alert" className="error">Couldn't save that tick. Try again.</p>
      )}
      {/* Task 10 adds: CatchUpNote, UpcomingBreakBanner, HolidayNotes, MalwareBanner here */}
      <div className="module-columns">
        <div className="this-week-main">
          {tw.status === 'teaching' &&
            (tw.groups.length === 0 ? (
              <p className="muted">
                Content for this week isn't in the app yet.{' '}
                <ExternalLink href="https://yoobee.uplearn.education/" label="Open UPLearn">Open UPLearn</ExternalLink>
              </p>
            ) : (
              <WeekGroups groups={tw.groups} onToggleTask={onToggleTask} onTogglePrerequisite={onTogglePrerequisite} />
            ))}
          {tw.ahead && (
            <section aria-labelledby="ahead-heading" className="ahead">
              <h2 id="ahead-heading">You're ahead of schedule 🎉</h2>
              <h3>Next up · Week {tw.ahead.week_number}</h3>
              {tw.ahead.groups.length === 0 ? (
                <p className="muted">Week {tw.ahead.week_number} isn't in the app yet.</p>
              ) : (
                <WeekGroups groups={tw.ahead.groups} onToggleTask={onToggleTask} onTogglePrerequisite={onTogglePrerequisite} />
              )}
            </section>
          )}
        </div>
        <AssessmentsRail
          assessments={tw.assessments}
          portalUrl={null}
          emptyText="No deadlines in the next 4 weeks."
          onToggleSubmitted={(key, submitted) => submit.mutate({ key, submitted })}
        />
      </div>
    </main>
  )
}
```

`StatusHeader` (same file) renders the header copy for each status from **Page copy**, using `dayDate`, `percent`, `ProgressBar` (`label="This week's progress"`, `size="lg"`) and `plural`. Check how `ExternalLink` renders its accessible name (it takes `label`) so the "Open UPLearn" link test matches.

CSS: `.week-group { display: flex; flex-direction: column; gap: 12px; }`, `.this-week-main { display: flex; flex-direction: column; gap: 20px; min-width: 0; }`.

- [ ] **Step 5: Run everything and commit**

Run: `npm test`, `npm run build`, `npm run lint` → all pass.

```bash
git add -A frontend
git commit -m "feat(frontend): This week page with progress, ahead of schedule, break, before-start and finished states"
```

---

### Task 10: Malware banner, break and holiday notices, catch-up note, docs

**Files:**
- Create: `frontend/src/components/thisweek/MalwareBanner.tsx`, `frontend/src/components/thisweek/Notices.tsx`
- Modify: `frontend/src/pages/ThisWeekPage.tsx`, `frontend/src/pages/ThisWeekPage.test.tsx`, `frontend/src/pages/AuthPage.tsx`, `frontend/src/pages/AuthPage.test.tsx`, `frontend/src/index.css`, `CLAUDE.md`, `docs/superpowers/specs/2026-10-15-yoobee-study-guide-design.md`

**Interfaces:**
- Consumes: `ThisWeek`, `TaskRow`, `dayDate`, `plural`, tick hooks (Task 9)
- Produces:
  - `MalwareBanner({ lurking, onToggleTask })`
  - `UpcomingBreakBanner({ upcoming })`, `HolidayNotes({ holidays })`, `CatchUpNote({ throughWeek, onDismiss })` in `Notices.tsx`
  - `AuthPage` signup navigates with `state: { prefilledThroughWeek: number }` when the response has one

Copy (exact):
- Malware: label "MALWARE DETECTED"; text "{N} unfinished {task is|tasks are} lurking in Week {9, 10}."; button "Quarantine them" (`aria-expanded`); when open, one list per week headed "Week 9" with `TaskRow`s.
- Upcoming break: "Break coming up: {2 weeks}, Mon 14 Sep – Sun 27 Sep. Week 9 starts Mon 28 Sep." (`plural(length_weeks, 'week')`)
- Holiday: "Labour Day, Mon 26 Oct: campus closed."
- Catch-up: "We've marked weeks 1–10 as done. Untick anything you haven't finished." with a "Dismiss" button. If `throughWeek === 1`: "We've marked week 1 as done. Untick anything you haven't finished."

Banner look, from the owner's design ("Module timeline" artboard): `role="status"`, dark card `#0F1E33` with white text, 12px radius, 14px/18px padding; a 36px amber (`#F2A33A`) rounded square holding a bug icon (inline SVG, `aria-hidden`, stroke `#0F1E33`: `<rect x="8" y="7" width="8" height="12" rx="4"/><path d="M12 7V4M9 5l-2-2M15 5l2-2M8 11H4M16 11h4M8 15H5M16 15h3"/>`); the label in IBM Plex Mono (or the app's mono font) 12px, colour `#F7C47E`, letter-spacing 0.04em; the button amber background, dark text, weight 700, min-height 44px, radius 10px. The task list under it sits in a normal card, not inside the dark banner.

- [ ] **Step 1: Tests**

Add to `ThisWeekPage.test.tsx`:

```tsx
  it('warns about lurking tasks and opens them on Quarantine', async () => {
    show({ ...teaching, lurking: [
      { week_number: 9, tasks: [{ ...task('old1'), module_code: 'CCC602' }] },
      { week_number: 10, tasks: [{ ...task('old2'), module_code: 'CCC602' }] },
    ] })
    const banner = await screen.findByRole('status')
    expect(within(banner).getByText('MALWARE DETECTED')).toBeInTheDocument()
    expect(within(banner).getByText('2 unfinished tasks are lurking in Week 9, 10.')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Task old1' })).not.toBeInTheDocument()
    await userEvent.click(within(banner).getByRole('button', { name: 'Quarantine them' }))
    expect(within(banner).getByRole('button', { name: 'Quarantine them' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('heading', { name: 'Week 9' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Task old1' })).toBeInTheDocument()
  })

  it('uses the singular for one lurking task', async () => {
    show({ ...teaching, lurking: [{ week_number: 8, tasks: [{ ...task('old'), module_code: 'CCC601' }] }] })
    expect(await screen.findByText('1 unfinished task is lurking in Week 8.')).toBeInTheDocument()
  })

  it('has no banner when nothing is lurking', async () => {
    show(teaching)
    await screen.findByRole('heading', { level: 1, name: 'Week 11' })
    expect(screen.queryByText('MALWARE DETECTED')).not.toBeInTheDocument()
  })

  it('warns about a break coming up', async () => {
    show({ ...teaching, upcoming_break: { starts_on: '2026-09-14', ends_on: '2026-09-27', length_weeks: 2, resumes_week: 9, resumes_on: '2026-09-28' } })
    expect(await screen.findByText('Break coming up: 2 weeks, Mon 14 Sep – Sun 27 Sep. Week 9 starts Mon 28 Sep.')).toBeInTheDocument()
  })

  it('lists holidays this week', async () => {
    show({ ...teaching, holidays: [{ day: '2026-10-26', name: 'Labour Day' }] })
    expect(await screen.findByText('Labour Day, Mon 26 Oct: campus closed.')).toBeInTheDocument()
  })

  it('shows the lurking banner on a break too', async () => {
    show({ ...THIS_WEEK, status: 'break', week: null, current_break: { starts_on: '2026-09-14', ends_on: '2026-09-27', week_of_break: 1, length_weeks: 2 }, next_week: { week_number: 9, starts_on: '2026-09-28' }, lurking: [{ week_number: 8, tasks: [{ ...task('old'), module_code: 'CCC601' }] }] })
    expect(await screen.findByText('1 unfinished task is lurking in Week 8.')).toBeInTheDocument()
  })
```

Catch-up note test. The note lives on `/` and reads router state, so render the app from `/signup`, sign up through the form, and land on `/`:

```tsx
  it('after sign-up, says which weeks were pre-ticked and can be dismissed', async () => {
    localStorage.clear()  // not needed for the gate: setup.ts records acceptance
    mockApi({
      '/api/modules': [],
      'POST /api/auth/signup': () => new Response(JSON.stringify({ ...ME, prefilled_through_week: 10 }), { status: 201, headers: { 'Content-Type': 'application/json' } }),
    })
    renderAt('/signup')
    await userEvent.type(screen.getByLabelText('Email'), 'new@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText("We've marked weeks 1–10 as done. Untick anything you haven't finished.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText(/We've marked weeks/)).not.toBeInTheDocument()
  })
```

Drop the `localStorage.clear()` line if it breaks the disclaimer gate; it's only there to show intent. Check how `AuthPage.test.tsx` already drives the signup form and copy its approach (the `/api/me` mock may need to return 401 first, then ME, so `RequireAuth` lets the user through after sign-up).

Run: `npx vitest run src/pages/ThisWeekPage.test.tsx` → the new tests FAIL.

- [ ] **Step 2: Implement**

`MalwareBanner.tsx`:

```tsx
import { useId, useState } from 'react'
import type { ThisWeek } from '../../api'
import { TaskRow } from '../module/WeekTimeline'

export function MalwareBanner({ lurking, onToggleTask }: { lurking: ThisWeek['lurking']; onToggleTask: (taskKey: string, done: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const count = lurking.reduce((n, w) => n + w.tasks.length, 0)
  if (count === 0) return null
  const weeks = lurking.map((w) => w.week_number).join(', ')
  return (
    <>
      <div role="status" className="malware-banner">
        <span className="malware-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F1E33" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="8" y="7" width="8" height="12" rx="4" />
            <path d="M12 7V4M9 5l-2-2M15 5l2-2M8 11H4M16 11h4M8 15H5M16 15h3" />
          </svg>
        </span>
        <span className="malware-text">
          <span className="malware-label">MALWARE DETECTED</span>
          <span>{count} unfinished {count === 1 ? 'task is' : 'tasks are'} lurking in Week {weeks}.</span>
        </span>
        <button type="button" className="malware-button" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(!open)}>
          Quarantine them
        </button>
      </div>
      {open && (
        <section id={listId} className="card quarantine" aria-label="Unfinished tasks from earlier weeks">
          {lurking.map((w) => (
            <div key={w.week_number}>
              <h3>Week {w.week_number}</h3>
              <ul className="task-list">
                {w.tasks.map((t) => <TaskRow key={t.key} task={t} onToggle={onToggleTask} />)}
              </ul>
            </div>
          ))}
        </section>
      )}
    </>
  )
}
```

Note: the banner's `role="status"` and the upcoming-break notice must not both be `role="status"`, or `findByRole('status')` in the test becomes ambiguous. Give the other notices `role="note"` (or no role).

`Notices.tsx`:

```tsx
import type { ThisWeek } from '../../api'
import { dayDate, plural } from '../../format'

export function UpcomingBreakBanner({ upcoming }: { upcoming: NonNullable<ThisWeek['upcoming_break']> }) {
  return (
    <p className="notice">
      Break coming up: {plural(upcoming.length_weeks, 'week')}, {dayDate(upcoming.starts_on)} – {dayDate(upcoming.ends_on)}. Week{' '}
      {upcoming.resumes_week} starts {dayDate(upcoming.resumes_on)}.
    </p>
  )
}

export function HolidayNotes({ holidays }: { holidays: ThisWeek['holidays'] }) {
  return (
    <>
      {holidays.map((h) => (
        <p key={h.day} className="notice">
          {h.name}, {dayDate(h.day)}: campus closed.
        </p>
      ))}
    </>
  )
}

export function CatchUpNote({ throughWeek, onDismiss }: { throughWeek: number; onDismiss: () => void }) {
  const weeks = throughWeek === 1 ? 'week 1' : `weeks 1–${throughWeek}`
  return (
    <div className="notice notice-row">
      <p>We've marked {weeks} as done. Untick anything you haven't finished.</p>
      <button type="button" className="link-button" onClick={onDismiss}>Dismiss</button>
    </div>
  )
}
```

The text in `UpcomingBreakBanner` is split across JSX expressions. `getByText` with a full string matches the element's combined text content when it's all in one element, so keep it inside a single `<p>` with no child elements.

`ThisWeekPage.tsx`, where the Task 9 comment sits:

```tsx
      {catchUp !== null && <CatchUpNote throughWeek={catchUp} onDismiss={() => navigate('.', { replace: true, state: null })} />}
      {tw.upcoming_break && <UpcomingBreakBanner upcoming={tw.upcoming_break} />}
      <HolidayNotes holidays={tw.holidays} />
      <MalwareBanner lurking={tw.lurking} onToggleTask={onToggleTask} />
```

with `const location = useLocation()`, `const navigate = useNavigate()`, `const catchUp = (location.state as { prefilledThroughWeek?: number } | null)?.prefilledThroughWeek ?? null`.

`AuthPage.tsx` `onSubmit`: after the call, `const prefilled = mode === 'signup' ? (me as SignupResult).prefilled_through_week : null` and `navigate(target, { replace: true, state: prefilled ? { prefilledThroughWeek: prefilled } : undefined })`. Add an AuthPage test that a signup with `prefilled_through_week: null` shows no note.

CSS (`index.css`):

```css
.malware-banner { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; padding: 14px 18px; border-radius: 12px; background: #0f1e33; color: #fff; }
.malware-icon { width: 36px; height: 36px; flex: 0 0 36px; border-radius: 10px; background: #f2a33a; display: flex; align-items: center; justify-content: center; }
.malware-text { flex: 1 1 280px; display: flex; flex-direction: column; font-weight: 500; }
.malware-label { font-family: var(--font-mono, 'IBM Plex Mono', monospace); font-size: 12px; color: #f7c47e; letter-spacing: 0.04em; }
.malware-button { min-height: 44px; padding: 0 16px; border-radius: 10px; border: 0; background: #f2a33a; color: #0f1e33; font-weight: 700; cursor: pointer; }
.malware-button:focus-visible { outline: 2px solid #f7c47e; outline-offset: 2px; }
.quarantine { display: flex; flex-direction: column; gap: 12px; }
.notice { margin: 0; padding: 12px 16px; border-radius: 10px; background: #e3eef9; color: #164f80; }
.notice-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
.notice-row p { margin: 0; }
```

(Use the stylesheet's actual mono font variable name if it differs from `--font-mono`.)

- [ ] **Step 3: Docs**

`CLAUDE.md`:
- Status line: "Status: Phase 3 done: This week home screen (week worked out from the intake's dates), lurking-task banner, break and holiday notices, assessments with a submitted tick, catch-up ticks at sign-up; CCC601–603 seeded, CCC604 a shell."
- Layout: `seed/` line adds "`schedule.yaml` (each intake's week start dates and public holidays)".
- Replace "Each user picks their **current week manually**; it is not derived from dates. Assessments still show real due dates." with "The **current week is worked out** from the user's intake (`seed/schedule.yaml`) and today's date in NZ time. There is no manual override. Breaks are the gaps between week start dates. New accounts get past weeks pre-ticked."
- Commands: note that the seed loader requires `schedule.yaml` and refuses to drop an intake that users are on; migration 0008 moves existing users onto `2607-online-ccc-ft`.
- MVP scope item 1: "This week" is the home page.

`docs/superpowers/specs/2026-10-15-yoobee-study-guide-design.md`:
- API table: remove `PATCH /me/settings`; add `GET /assessments`, `PUT|DELETE /assessments/{key}/submitted`; describe `GET /this-week` as "Current week (from the intake's dates), lurking tasks, breaks, holidays, deadlines".
- Screens: "5. Settings: choose current week" → "5. Assessments: every assessment with a submitted tick".
- Phases: mark 3 done and point to `2026-10-17-phase-3-this-week-design.md`.

- [ ] **Step 4: Run everything and commit**

Run: `npm test`, `npm run build`, `npm run lint` → all pass.

```bash
git add -A frontend CLAUDE.md docs
git commit -m "feat(frontend): malware banner, break and holiday notices, catch-up note; docs for Phase 3"
```

---

## After the tasks (controller)

1. Whole-branch review against the spec, then one fix wave.
2. Full backend suite (`uv run pytest`) and frontend (`npm test`, `npm run build`, `npm run lint`).
3. Browser check against the dev DB (backend `uv run uvicorn app.main:app --reload` on :8000; frontend `npm run dev`, which uses 5173 if free, otherwise check the port Vite prints, and never kill the owner's 5173 process): log in as the owner's account → This week shows week 11 (or the actual current week) with the CCC602 tasks; Quarantine opens lurking tasks; ticking updates the sidebar; Assessments page ticks A3; a brand-new e2e account sees "We've marked weeks 1–N as done"; CCC604 shows "Coming soon".
4. Ask the owner before merging to `main` or pushing.
