from datetime import date

from sqlalchemy import func, select

from app.models import Assessment, Module, Task, Week


def make_module(db):
    module = Module(key="ccc602", code="CCC602", title="Data Engineering", position=2)
    week = Week(key="ccc602-w09", week_number=9, title="DP-900", position=0)
    week.tasks = [
        Task(key="t2", title="Second", type="lab", external_url="https://x.test/2", position=1),
        Task(key="t1", title="First", type="learning_path", external_url="https://x.test/1", position=0),
    ]
    module.weeks = [week]
    module.assessments = [Assessment(key="a3", title="Assessment 3", due_date=date(2026, 10, 25))]
    db.add(module)
    db.flush()
    db.expire_all()
    return db.scalars(select(Module).where(Module.key == "ccc602")).one()


def test_tasks_load_in_position_order(db):
    module = make_module(db)
    assert [t.key for t in module.weeks[0].tasks] == ["t1", "t2"]


def test_deleting_module_cascades(db):
    module = make_module(db)
    db.delete(module)
    db.flush()
    assert db.scalar(select(func.count()).select_from(Week)) == 0
    assert db.scalar(select(func.count()).select_from(Task)) == 0
    assert db.scalar(select(func.count()).select_from(Assessment)) == 0
