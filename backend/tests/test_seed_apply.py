from datetime import date

from sqlalchemy import func, select

from app.models import Assessment, Module, Task, Week
from app.seed.__main__ import run
from app.seed.loader import apply_seed
from app.seed.schema import SeedFile


def seed(weeks, assessments=None, module_key="ccc602"):
    return SeedFile.model_validate(
        {
            "module": {"key": module_key, "code": "CCC602", "title": "Data Engineering", "order": 2},
            "weeks": weeks,
            "assessments": assessments or [],
        }
    )


def task(key, title="T"):
    return {"key": key, "title": title, "type": "learning_path", "external_url": "https://x.test/" + key}


def count(db, model):
    return db.scalar(select(func.count()).select_from(model))


def test_inserts_everything_with_positions(db):
    apply_seed(
        db,
        [seed(
            [{"key": "w9", "week_number": 9, "title": "W9", "tasks": [task("t1"), task("t2")]}],
            [{"key": "a3", "title": "A3", "due_date": "2026-10-25"}],
        )],
    )
    module = db.scalars(select(Module)).one()
    assert module.position == 2
    assert [(t.key, t.position) for t in module.weeks[0].tasks] == [("t1", 0), ("t2", 1)]
    assert module.assessments[0].due_date == date(2026, 10, 25)
    assert module.weeks[0].tasks[0].external_url == "https://x.test/t1"


def test_rerun_is_idempotent(db):
    data = [seed([{"key": "w9", "week_number": 9, "title": "W9", "tasks": [task("t1")]}])]
    apply_seed(db, data)
    apply_seed(db, data)
    assert (count(db, Module), count(db, Week), count(db, Task)) == (1, 1, 1)


def test_task_moved_to_other_week_keeps_its_row(db):
    apply_seed(db, [seed([
        {"key": "w9", "week_number": 9, "title": "W9", "tasks": [task("t1")]},
        {"key": "w10", "week_number": 10, "title": "W10", "tasks": []},
    ])])
    original_id = db.scalars(select(Task.id).where(Task.key == "t1")).one()

    apply_seed(db, [seed([
        {"key": "w9", "week_number": 9, "title": "W9", "tasks": []},
        {"key": "w10", "week_number": 10, "title": "W10", "tasks": [task("t1", title="Moved")]},
    ])])

    moved = db.scalars(select(Task).where(Task.key == "t1")).one()
    assert moved.id == original_id
    assert moved.week.key == "w10"
    assert moved.title == "Moved"
    assert count(db, Task) == 1


def test_removed_items_are_deleted(db):
    apply_seed(db, [
        seed([{"key": "w9", "week_number": 9, "title": "W9", "tasks": [task("t1"), task("t2")]}],
             [{"key": "a3", "title": "A3"}]),
        seed([{"key": "x-w1", "week_number": 1, "title": "X", "tasks": [task("x1")]}], module_key="other"),
    ])
    apply_seed(db, [seed([{"key": "w9", "week_number": 9, "title": "W9", "tasks": [task("t1")]}])])

    assert db.scalars(select(Task.key)).all() == ["t1"]
    assert count(db, Assessment) == 0
    assert db.scalars(select(Module.key)).all() == ["ccc602"]


def test_run_with_invalid_files_writes_nothing(db, tmp_path, capsys):
    good = (
        "module: {key: ccc602, code: CCC602, title: DE, order: 2}\n"
        "weeks: [{key: w9, week_number: 9, title: W9}]\n"
    )
    (tmp_path / "a.yaml").write_text(good, encoding="utf-8")
    (tmp_path / "b.yaml").write_text(good.replace("key: ccc602", "key: other"), encoding="utf-8")

    assert run(tmp_path, db) == 1
    assert count(db, Module) == 0
    assert "duplicate key 'w9'" in capsys.readouterr().err


def test_run_with_valid_files_succeeds(db, tmp_path):
    (tmp_path / "a.yaml").write_text(
        "module: {key: ccc602, code: CCC602, title: DE, order: 2}\n", encoding="utf-8"
    )
    assert run(tmp_path, db) == 0
    assert count(db, Module) == 1
