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
