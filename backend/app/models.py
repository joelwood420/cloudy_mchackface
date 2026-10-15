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
        back_populates="week", cascade="all, delete-orphan", passive_deletes=True,
        order_by="Task.position"
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
