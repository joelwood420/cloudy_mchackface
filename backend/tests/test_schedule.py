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
