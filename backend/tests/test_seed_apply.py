from sqlalchemy import func, select

from app.models import Assessment, Intake, Module, Prerequisite, SchedulePost, Submodule, SubmodulePrerequisite, Task, Week
from app.seed.__main__ import run
from app.seed.loader import apply_seed
from app.seed.schema import SeedFile, SeedPrerequisite, SeedSchedulePost
from tests.conftest import schedule_yaml


def seed(weeks=None, assessments=None, module_key="ccc602", submodules=None):
    """A module file. Pass `weeks` for a single submodule, or `submodules` for full control."""
    if submodules is None:
        submodules = [{"key": f"{module_key}-sub", "code": "SUB", "title": "Sub", "weeks": weeks or []}]
    return SeedFile.model_validate({
        "module": {"key": module_key, "code": "CCC602", "title": "Data Engineering", "order": 2},
        "submodules": submodules,
        "assessments": assessments or [],
    })


def sub(key, weeks=(), prerequisites=(), code="SUB"):
    return {"key": key, "code": code, "title": key.upper(), "prerequisites": list(prerequisites), "weeks": list(weeks)}


def week(key, number, tasks=()):
    return {"key": key, "week_number": number, "title": key.upper(), "tasks": list(tasks)}


def task(key, title="T"):
    return {"key": key, "title": title, "type": "learning_path", "external_url": "https://x.test/" + key}


def prereq(key, title=None):
    return SeedPrerequisite.model_validate({"key": key, "title": title or key, "external_url": "https://x.test/" + key})


def count(db, model):
    return db.scalar(select(func.count()).select_from(model))


def links(db):
    """(submodule key, prerequisite key, position) for every link row."""
    return db.execute(
        select(Submodule.key, Prerequisite.key, SubmodulePrerequisite.position)
        .join(Submodule, Submodule.id == SubmodulePrerequisite.submodule_id)
        .join(Prerequisite, Prerequisite.id == SubmodulePrerequisite.prerequisite_id)
        .order_by(Submodule.key, SubmodulePrerequisite.position)
    ).all()


def test_inserts_everything_with_positions(db):
    apply_seed(db, [seed(
        [week("w9", 9, [task("t1"), task("t2")])],
        [{"key": "a3", "title": "A3", "due_week": 12}],
    )])
    module = db.scalars(select(Module)).one()
    assert module.position == 2
    assert [(t.key, t.position) for t in module.weeks[0].tasks] == [("t1", 0), ("t2", 1)]
    assert (module.assessments[0].due_week, module.assessments[0].due_weekday) == (12, 6)
    assert module.weeks[0].tasks[0].external_url == "https://x.test/t1"


def test_weeks_belong_to_module_and_submodule_in_file_order(db):
    apply_seed(db, [seed(submodules=[
        sub("s1", [week("w1", 1), week("w2", 2)], code="AZ-900"),
        sub("s2", [week("w3", 3)], code="AZ-104"),
    ])])
    module = db.scalars(select(Module)).one()
    assert [(s.key, s.code, s.position) for s in module.submodules] == [("s1", "AZ-900", 0), ("s2", "AZ-104", 1)]
    assert [(w.key, w.position, w.submodule_key) for w in module.weeks] == [("w1", 0, "s1"), ("w2", 1, "s1"), ("w3", 2, "s2")]


def test_shared_prerequisite_is_stored_once_and_linked_in_order(db):
    apply_seed(db, [seed(submodules=[
        sub("s1", [week("w1", 1)], prerequisites=["azure", "skillable"]),
        sub("s2", [week("w2", 2)], prerequisites=["azure"]),
    ])], [prereq("azure", "Azure account"), prereq("skillable")])
    assert count(db, Prerequisite) == 2
    assert links(db) == [("s1", "azure", 0), ("s1", "skillable", 1), ("s2", "azure", 0)]
    assert db.scalars(select(Prerequisite.title).where(Prerequisite.key == "azure")).one() == "Azure account"


def test_rerun_is_idempotent_and_keeps_ids(db):
    data = [seed(submodules=[sub("s1", [week("w9", 9, [task("t1")])], prerequisites=["azure"])])]
    apply_seed(db, data, [prereq("azure")])
    ids = (db.scalar(select(Prerequisite.id)), db.scalar(select(Submodule.id)), db.scalar(select(Task.id)))
    apply_seed(db, data, [prereq("azure")])
    assert (db.scalar(select(Prerequisite.id)), db.scalar(select(Submodule.id)), db.scalar(select(Task.id))) == ids
    assert (count(db, Module), count(db, Submodule), count(db, Week), count(db, Task)) == (1, 1, 1, 1)
    assert links(db) == [("s1", "azure", 0)]


def test_unlinking_keeps_the_prerequisite_and_removing_it_deletes_its_links(db):
    two = [prereq("azure"), prereq("skillable")]
    apply_seed(db, [seed(submodules=[sub("s1", [week("w1", 1)], prerequisites=["azure", "skillable"])])], two)

    apply_seed(db, [seed(submodules=[sub("s1", [week("w1", 1)], prerequisites=["skillable"])])], two)
    assert links(db) == [("s1", "skillable", 0)]
    assert count(db, Prerequisite) == 2

    apply_seed(db, [seed(submodules=[sub("s1", [week("w1", 1)])])], [prereq("azure")])
    assert links(db) == []
    assert db.scalars(select(Prerequisite.key)).all() == ["azure"]


def test_week_moved_to_other_submodule_keeps_its_row(db):
    apply_seed(db, [seed(submodules=[sub("s1", [week("w1", 1), week("w2", 2)]), sub("s2", [])])])
    original_id = db.scalar(select(Week.id).where(Week.key == "w2"))

    apply_seed(db, [seed(submodules=[sub("s1", [week("w1", 1)]), sub("s2", [week("w2", 2)])])])
    moved = db.scalars(select(Week).where(Week.key == "w2")).one()
    assert moved.id == original_id
    assert moved.submodule_key == "s2"


def test_task_moved_to_other_week_keeps_its_row(db):
    apply_seed(db, [seed([week("w9", 9, [task("t1")]), week("w10", 10)])])
    original_id = db.scalars(select(Task.id).where(Task.key == "t1")).one()

    apply_seed(db, [seed([week("w9", 9), week("w10", 10, [task("t1", title="Moved")])])])

    moved = db.scalars(select(Task).where(Task.key == "t1")).one()
    assert moved.id == original_id
    assert moved.week.key == "w10"
    assert moved.title == "Moved"
    assert count(db, Task) == 1


def test_removed_items_are_deleted(db):
    apply_seed(db, [
        seed([week("w9", 9, [task("t1"), task("t2")])], [{"key": "a3", "title": "A3"}]),
        seed([week("x-w1", 1, [task("x1")])], module_key="other"),
    ])
    apply_seed(db, [seed([week("w9", 9, [task("t1")])])])

    assert db.scalars(select(Task.key)).all() == ["t1"]
    assert count(db, Assessment) == 0
    assert db.scalars(select(Module.key)).all() == ["ccc602"]
    assert db.scalars(select(Submodule.key)).all() == ["ccc602-sub"]


def test_removing_a_submodule_removes_its_weeks_and_tasks(db):
    apply_seed(db, [seed(submodules=[sub("s1", [week("w1", 1, [task("t1")])]), sub("s2", [week("w2", 2, [task("t2")])])])])
    apply_seed(db, [seed(submodules=[sub("s2", [week("w2", 2, [task("t2")])])])])
    assert db.scalars(select(Submodule.key)).all() == ["s2"]
    assert db.scalars(select(Week.key)).all() == ["w2"]
    assert db.scalars(select(Task.key)).all() == ["t2"]


def test_removing_one_week_keeps_module_and_other_weeks(db):
    apply_seed(db, [seed([week("w9", 9, [task("t1"), task("t2")]), week("w10", 10, [task("t3")])])])
    apply_seed(db, [seed([week("w10", 10, [task("t3")])])])

    assert db.scalars(select(Module.key)).all() == ["ccc602"]
    assert db.scalars(select(Week.key)).all() == ["w10"]
    assert db.scalars(select(Task.key)).all() == ["t3"]


def test_key_that_changes_type_deletes_the_old_row(db):
    apply_seed(db, [seed([week("w9", 9, [task("shared")])])])
    apply_seed(db, [seed([week("w9", 9), week("shared", 10)])])

    assert db.scalars(select(Task.key)).all() == []
    assert sorted(db.scalars(select(Week.key)).all()) == ["shared", "w9"]


def test_module_uplearn_url_is_stored_and_cleared(db):
    with_link = SeedFile.model_validate({
        "module": {
            "key": "ccc602", "code": "CCC602", "title": "Data Engineering", "order": 2,
            "uplearn_url": "https://yoobee.uplearn.education/course/view.php?id=548",
        }
    })
    apply_seed(db, [with_link])
    assert db.scalars(select(Module.uplearn_url)).one() == "https://yoobee.uplearn.education/course/view.php?id=548"

    apply_seed(db, [seed([])])
    assert db.scalars(select(Module.uplearn_url)).one() is None


def test_task_note_is_stored_and_cleared(db):
    with_note = {**task("t1"), "note": "Training key is in the Teams tutor-only channel."}
    apply_seed(db, [seed([week("w9", 9, [with_note])])])
    assert db.scalars(select(Task.note)).one() == "Training key is in the Teams tutor-only channel."

    apply_seed(db, [seed([week("w9", 9, [task("t1")])])])
    assert db.scalars(select(Task.note)).one() is None


GOOD = (
    "module: {key: ccc602, code: CCC602, title: DE, order: 2}\n"
    "submodules: [{key: ccc602-s, code: S, title: S, prerequisites: [azure], "
    "weeks: [{key: w9, week_number: 9, title: W9}]}]\n"
)
PREREQS = "prerequisites: [{key: azure, title: Azure, external_url: 'https://azure.test'}]\n"


def test_run_with_invalid_files_writes_nothing(db, tmp_path, capsys):
    (tmp_path / "a.yaml").write_text(GOOD, encoding="utf-8")
    (tmp_path / "b.yaml").write_text(GOOD.replace("key: ccc602", "key: other"), encoding="utf-8")
    (tmp_path / "prerequisites.yaml").write_text(PREREQS, encoding="utf-8")
    (tmp_path / "schedule.yaml").write_text(schedule_yaml(), encoding="utf-8")

    assert run(tmp_path, db) == 1
    assert count(db, Module) == 0
    assert count(db, Prerequisite) == 0
    assert "duplicate key 'w9'" in capsys.readouterr().err


def test_run_with_valid_files_succeeds(db, tmp_path, capsys):
    (tmp_path / "a.yaml").write_text(GOOD, encoding="utf-8")
    (tmp_path / "prerequisites.yaml").write_text(PREREQS, encoding="utf-8")
    (tmp_path / "schedule.yaml").write_text(schedule_yaml(), encoding="utf-8")
    assert run(tmp_path, db) == 0
    assert (count(db, Module), count(db, Submodule), count(db, Prerequisite)) == (1, 1, 1)
    assert links(db) == [("ccc602-s", "azure", 0)]
    assert count(db, Intake) == 1
    assert "Seeded 1 module(s), 1 prerequisite(s) and 1 intake(s)" in capsys.readouterr().out


def test_schedule_posts_are_rebuilt_on_every_run(db):
    def with_posts(*posts):
        s = seed([week("w9", 9), week("w10", 10)])
        s.schedule_posts = [
            SeedSchedulePost.model_validate({"week_number": n, "study_mode": mode, "url": f"https://up.test/{n}{mode}"})
            for n, mode in posts
        ]
        return s

    apply_seed(db, [with_posts((9, "FT"), (10, "FT"))])
    apply_seed(db, [with_posts((10, "FT"), (10, "PT"))])
    rows = db.execute(select(SchedulePost.week_number, SchedulePost.study_mode, SchedulePost.url).order_by(SchedulePost.study_mode)).all()
    assert rows == [(10, "FT", "https://up.test/10FT"), (10, "PT", "https://up.test/10PT")]
