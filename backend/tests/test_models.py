from sqlalchemy import func, select

from app.models import Assessment, Module, Prerequisite, Submodule, SubmodulePrerequisite, Task, Week


def make_module(db):
    module = Module(key="ccc602", code="CCC602", title="Data Engineering", position=2)
    sub = Submodule(key="dp900", code="DP-900", title="Azure Data Fundamentals", position=0)
    week = Week(key="ccc602-w09", week_number=9, title="DP-900", position=0, submodule=sub)
    week.tasks = [
        Task(key="t2", title="Second", type="lab", external_url="https://x.test/2", position=1),
        Task(key="t1", title="First", type="learning_path", external_url="https://x.test/1", position=0),
    ]
    module.submodules = [sub]
    module.weeks = [week]
    module.assessments = [Assessment(key="a3", title="Assessment 3", due_week=12)]
    azure = Prerequisite(key="azure-account", title="Azure account", external_url="https://azure.test")
    skillable = Prerequisite(key="skillable", title="Skillable", uplearn_url="https://up.test/s")
    db.add_all([module, azure, skillable])
    db.flush()
    db.add_all([
        SubmodulePrerequisite(submodule_id=sub.id, prerequisite_id=skillable.id, position=1),
        SubmodulePrerequisite(submodule_id=sub.id, prerequisite_id=azure.id, position=0),
    ])
    db.flush()
    db.expire_all()
    return db.scalars(select(Module).where(Module.key == "ccc602")).one()


def count(db, model):
    return db.scalar(select(func.count()).select_from(model))


def test_tasks_load_in_position_order(db):
    module = make_module(db)
    assert [t.key for t in module.weeks[0].tasks] == ["t1", "t2"]


def test_week_knows_its_submodule(db):
    module = make_module(db)
    assert module.weeks[0].submodule_key == "dp900"
    assert [w.key for w in module.submodules[0].weeks] == ["ccc602-w09"]


def test_prerequisite_links_load_in_position_order(db):
    module = make_module(db)
    assert [link.prerequisite.key for link in module.submodules[0].prerequisite_links] == ["azure-account", "skillable"]


def test_deleting_module_cascades(db):
    module = make_module(db)
    db.delete(module)
    db.flush()
    assert (count(db, Submodule), count(db, Week), count(db, Task), count(db, Assessment)) == (0, 0, 0, 0)
    assert count(db, SubmodulePrerequisite) == 0
    assert count(db, Prerequisite) == 2  # prerequisites are shared; they outlive any one module


def test_deleting_a_prerequisite_removes_only_its_links(db):
    make_module(db)
    db.delete(db.scalars(select(Prerequisite).where(Prerequisite.key == "azure-account")).one())
    db.flush()
    assert db.scalars(select(SubmodulePrerequisite.position)).all() == [1]
    assert count(db, Submodule) == 1
