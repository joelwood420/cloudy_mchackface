from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, SmallInteger, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Module(Base):
    __tablename__ = "modules"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(100), unique=True)
    code: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(200))
    position: Mapped[int]
    uplearn_url: Mapped[str | None] = mapped_column(String(1000))

    weeks: Mapped[list["Week"]] = relationship(
        back_populates="module", cascade="all, delete-orphan", passive_deletes=True,
        order_by="Week.position"
    )
    assessments: Mapped[list["Assessment"]] = relationship(
        back_populates="module", cascade="all, delete-orphan", passive_deletes=True
    )
    submodules: Mapped[list["Submodule"]] = relationship(
        back_populates="module", cascade="all, delete-orphan", passive_deletes=True,
        order_by="Submodule.position"
    )
    schedule_posts: Mapped[list["SchedulePost"]] = relationship(cascade="all, delete-orphan", passive_deletes=True)


class SchedulePost(Base):
    """The UPLearn forum post a module's tutors put up for one teaching week. FT and PT have their own posts."""

    __tablename__ = "schedule_posts"
    __table_args__ = (CheckConstraint("study_mode IN ('FT', 'PT')", name="study_mode"),)

    module_id: Mapped[int] = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"), primary_key=True)
    study_mode: Mapped[str] = mapped_column(String(2), primary_key=True)
    week_number: Mapped[int] = mapped_column(primary_key=True)
    url: Mapped[str] = mapped_column(String(1000))


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


class Week(Base):
    __tablename__ = "weeks"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(100), unique=True)
    module_id: Mapped[int] = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"), index=True)
    submodule_id: Mapped[int] = mapped_column(ForeignKey("submodules.id", ondelete="CASCADE"), index=True)
    week_number: Mapped[int]
    title: Mapped[str] = mapped_column(String(200))
    position: Mapped[int]

    module: Mapped[Module] = relationship(back_populates="weeks")
    submodule: Mapped[Submodule] = relationship(back_populates="weeks")
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="week", cascade="all, delete-orphan", passive_deletes=True,
        order_by="Task.position"
    )

    @property
    def submodule_key(self) -> str:
        return self.submodule.key


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(100), unique=True)
    week_id: Mapped[int] = mapped_column(ForeignKey("weeks.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    type: Mapped[str] = mapped_column(String(20))
    external_url: Mapped[str | None] = mapped_column(String(1000))
    uplearn_url: Mapped[str | None] = mapped_column(String(1000))
    note: Mapped[str | None] = mapped_column(String(300))
    position: Mapped[int]

    week: Mapped[Week] = relationship(back_populates="tasks")
    completions: Mapped[list["TaskCompletion"]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True
    )


class Assessment(Base):
    """Due on a weekday (0=Mon to 6=Sun) of a content week; the date depends on the intake (see app.pacing)."""

    __tablename__ = "assessments"
    __table_args__ = (CheckConstraint("due_weekday BETWEEN 0 AND 6", name="due_weekday"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(100), unique=True)
    module_id: Mapped[int] = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    due_week: Mapped[int | None]
    due_weekday: Mapped[int] = mapped_column(SmallInteger, default=6, server_default="6")
    uplearn_url: Mapped[str | None] = mapped_column(String(1000))

    module: Mapped[Module] = relationship(back_populates="assessments")
    submissions: Mapped[list["AssessmentSubmission"]] = relationship(cascade="all, delete-orphan", passive_deletes=True)


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


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    disclaimer_version: Mapped[int | None]
    disclaimer_accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

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
    assessment_submissions: Mapped[list["AssessmentSubmission"]] = relationship(
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

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    # No cascade: the seed loader refuses to delete an intake that anyone is on.
    intake_id: Mapped[int] = mapped_column(ForeignKey("intakes.id"), index=True)

    user: Mapped[User] = relationship(back_populates="settings")
    intake: Mapped[Intake] = relationship()
