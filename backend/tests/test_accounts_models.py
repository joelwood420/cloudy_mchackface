from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app.models import (
    Module, Prerequisite, PrerequisiteCompletion, Task, TaskCompletion, User, UserSession, UserSettings, Week,
)
from app.seed.loader import apply_seed
from app.seed.schema import SeedFile, SeedPrerequisite


def make_user(db, email="joel@example.com"):
    user = User(email=email, password_hash="x", settings=UserSettings())
    db.add(user)
    db.flush()
    return user


def seed(task_keys, prerequisite_keys=()):
    module = SeedFile.model_validate({
        "module": {"key": "ccc602", "code": "CCC602", "title": "DE", "order": 2},
        "submodules": [{
            "key": "dp900", "code": "DP-900", "title": "DP-900", "prerequisites": list(prerequisite_keys),
            "weeks": [{"key": "w9", "week_number": 9, "title": "W9", "tasks": [
                {"key": k, "title": k, "type": "lab", "external_url": "https://x.test/" + k} for k in task_keys
            ]}],
        }],
    })
    prerequisites = [
        SeedPrerequisite.model_validate({"key": k, "title": k, "external_url": "https://x.test/" + k})
        for k in prerequisite_keys
    ]
    return [module], prerequisites


def count(db, model):
    return db.scalar(select(func.count()).select_from(model))


def test_new_user_gets_default_settings(db):
    user = make_user(db)
    db.expire_all()
    settings = db.get(UserSettings, user.id)
    assert settings.study_mode == "FT"
    assert settings.current_week is None
    assert db.get(User, user.id).created_at is not None


def test_removing_a_ticked_task_from_seed_deletes_its_tick(db):
    apply_seed(db, *seed(["t1", "t2"]))
    user = make_user(db)
    for key in ("t1", "t2"):
        task_id = db.scalar(select(Task.id).where(Task.key == key))
        db.add(TaskCompletion(user_id=user.id, task_id=task_id))
    db.flush()

    apply_seed(db, *seed(["t2"]))
    remaining = db.scalars(select(Task.key).join(TaskCompletion, TaskCompletion.task_id == Task.id)).all()
    assert remaining == ["t2"]


def test_removing_a_ticked_prerequisite_from_seed_deletes_its_tick(db):
    apply_seed(db, *seed(["t1"], ["azure", "aws"]))
    user = make_user(db)
    for key in ("azure", "aws"):
        prereq_id = db.scalar(select(Prerequisite.id).where(Prerequisite.key == key))
        db.add(PrerequisiteCompletion(user_id=user.id, prerequisite_id=prereq_id))
    db.flush()

    apply_seed(db, *seed(["t1"], ["aws"]))
    remaining = db.scalars(
        select(Prerequisite.key).join(PrerequisiteCompletion, PrerequisiteCompletion.prerequisite_id == Prerequisite.id)
    ).all()
    assert remaining == ["aws"]


def test_reseeding_keeps_ticks_on_unchanged_content(db):
    apply_seed(db, *seed(["t1"], ["azure"]))
    user = make_user(db)
    db.add(TaskCompletion(user_id=user.id, task_id=db.scalar(select(Task.id))))
    db.add(PrerequisiteCompletion(user_id=user.id, prerequisite_id=db.scalar(select(Prerequisite.id))))
    db.flush()

    apply_seed(db, *seed(["t1"], ["azure"]))
    assert (count(db, TaskCompletion), count(db, PrerequisiteCompletion)) == (1, 1)


def test_deleting_a_module_deletes_ticks_on_its_tasks(db):
    apply_seed(db, *seed(["t1"]))
    user = make_user(db)
    db.add(TaskCompletion(user_id=user.id, task_id=db.scalar(select(Task.id))))
    db.flush()
    db.expire_all()

    db.delete(db.scalars(select(Module)).one())
    db.flush()
    assert (count(db, Week), count(db, Task), count(db, TaskCompletion)) == (0, 0, 0)


def test_deleting_a_user_deletes_their_sessions_ticks_and_settings(db):
    apply_seed(db, *seed(["t1"], ["azure"]))
    user = make_user(db)
    db.add(TaskCompletion(user_id=user.id, task_id=db.scalar(select(Task.id))))
    db.add(PrerequisiteCompletion(user_id=user.id, prerequisite_id=db.scalar(select(Prerequisite.id))))
    db.add(UserSession(token_hash="a" * 64, user_id=user.id, expires_at=datetime.now(UTC) + timedelta(days=1)))
    db.flush()
    db.expire_all()

    db.delete(db.get(User, user.id))
    db.flush()
    assert (count(db, UserSession), count(db, TaskCompletion), count(db, UserSettings)) == (0, 0, 0)
    assert count(db, PrerequisiteCompletion) == 0
