from datetime import date

from app.pacing import due_date, intake_weeks, split_week
from app.schedule import TeachingWeek
from tests.conftest import FT_WEEKS, PT_2609_WEEKS, PT_WEEKS


def _weeks(rows):
    return [TeachingWeek(n, d) for n, d in rows]


def test_split_week_ft_keeps_everything_in_one_week():
    assert split_week("FT", 3, ["a", "b", "c"]) == [(3, ["a", "b", "c"])]


def test_split_week_pt_halves_with_odd_extra_in_first():
    assert split_week("PT", 3, ["a", "b", "c"]) == [(5, ["a", "b"]), (6, ["c"])]


def test_split_week_pt_always_returns_both_weeks():
    assert split_week("PT", 1, ["a"]) == [(1, ["a"]), (2, [])]
    assert split_week("PT", 2, []) == [(3, []), (4, [])]


def test_intake_weeks():
    assert intake_weeks("FT", 8) == [8]
    assert intake_weeks("PT", 8) == [15, 16]


def test_part_time_fixtures_have_expected_landmarks():
    assert len(PT_WEEKS) == 64
    assert PT_WEEKS[31] == (32, date(2027, 4, 19))
    assert PT_WEEKS[32] == (33, date(2027, 4, 26))
    assert PT_WEEKS[-1] == (64, date(2028, 1, 24))
    assert len(PT_2609_WEEKS) == 64
    weeks = dict(PT_2609_WEEKS)
    assert weeks[1] == date(2026, 9, 28)
    assert weeks[13] == date(2027, 1, 18)
    assert weeks[25] == date(2027, 5, 10)
    assert weeks[53] == date(2028, 1, 17)
    assert weeks[64] == date(2028, 4, 3)


def test_due_date_ft():
    weeks = _weeks(FT_WEEKS)
    assert due_date(weeks, "FT", 4, 6) == date(2026, 8, 16)
    assert due_date(weeks, "FT", 32, 4) == date(2027, 4, 23)


def test_due_date_pt_uses_the_second_intake_week():
    weeks = _weeks(PT_2609_WEEKS)
    assert due_date(weeks, "PT", 4, 6) == date(2026, 11, 22)
    assert due_date(weeks, "PT", 31, 6) == date(2028, 3, 26)
    assert due_date(weeks, "PT", 32, 4) == date(2028, 4, 7)


def test_due_date_none_when_unset_or_beyond_intake():
    weeks = _weeks(FT_WEEKS)
    assert due_date(weeks, "FT", None, 6) is None
    assert due_date(weeks, "PT", 20, 6) is None
