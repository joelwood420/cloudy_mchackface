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


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(100), unique=True)
    module_id: Mapped[int] = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    due_date: Mapped[date | None] = mapped_column(Date)
    uplearn_url: Mapped[str | None] = mapped_column(String(1000))

    module: Mapped[Module] = relationship(back_populates="assessments")


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
