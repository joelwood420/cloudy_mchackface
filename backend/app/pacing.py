"""Maps content weeks onto an intake's own weeks. Pure functions; the database never comes in here.

Content is numbered in full-time (FT) weeks. A full-time intake teaches one content week per intake week.
A part-time (PT) intake takes two intake weeks per content week: content week n is intake weeks 2n-1 and 2n,
with the week's tasks split between them (the first half gets the extra task when the count is odd)."""

from collections.abc import Sequence
from datetime import date, timedelta
from math import ceil
from typing import Literal, TypeVar

from app.schedule import TeachingWeek

StudyMode = Literal["FT", "PT"]
T = TypeVar("T")


def intake_weeks(mode: StudyMode, week_number: int) -> list[int]:
    return [week_number] if mode == "FT" else [2 * week_number - 1, 2 * week_number]


def split_week(mode: StudyMode, week_number: int, tasks: Sequence[T]) -> list[tuple[int, list[T]]]:
    """(intake week, its tasks) pairs for one content week. PT always gives both weeks, even if one is empty."""
    if mode == "FT":
        return [(week_number, list(tasks))]
    half = ceil(len(tasks) / 2)
    first, second = intake_weeks(mode, week_number)
    return [(first, list(tasks[:half])), (second, list(tasks[half:]))]


def due_date(weeks: Sequence[TeachingWeek], mode: StudyMode, due_week: int | None, due_weekday: int) -> date | None:
    """The date in the intake's own calendar. due_weekday runs 0=Mon to 6=Sun. None if unset or past the intake."""
    if due_week is None:
        return None
    target = due_week if mode == "FT" else 2 * due_week
    week = next((w for w in weeks if w.week_number == target), None)
    return week.starts_on + timedelta(days=due_weekday) if week else None
