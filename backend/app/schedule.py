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
