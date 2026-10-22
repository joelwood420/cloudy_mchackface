from datetime import date

from sqlalchemy import select

from app.models import Assessment, Module, Prerequisite, SchedulePost, Submodule, SubmodulePrerequisite, Task, Week
from tests.conftest import add_schedule


def add_content(db):
    de = Module(key="ccc602", code="CCC602", title="Data Engineering", position=2, uplearn_url="https://up.test/602")
    dp900 = Submodule(key="dp900", code="DP-900", title="Azure Data Fundamentals", position=0, uplearn_url="https://up.test/dp900")
    dea = Submodule(key="dea", code="DEA-C01", title="AWS Data Engineer", position=1)
    de.submodules = [dp900, dea]
    de.weeks = [
        Week(key="w10", week_number=10, title="Empty", position=1, submodule=dea),
        Week(key="w9", week_number=9, title="DP-900", position=0, submodule=dp900, tasks=[
            Task(key="t2", title="Labs", type="lab", external_url="https://lab.test", position=1, note="Key in Teams"),
            Task(key="t1", title="LP1", type="learning_path", external_url="https://learn.test", position=0),
        ]),
    ]
    de.assessments = [
        Assessment(key="a4", title="Assessment 4", due_week=None),
        Assessment(key="a3", title="Assessment 3", due_week=12, uplearn_url="https://up.test"),
    ]
    admin = Module(key="ccc601", code="CCC601", title="Public Cloud Administration", position=1)
    azure = Prerequisite(key="azure-account", title="Create an Azure account", note="Personal email", external_url="https://azure.test")
    db.add_all([de, admin, azure])
    db.flush()
    db.add(SubmodulePrerequisite(submodule_id=dp900.id, prerequisite_id=azure.id, position=0))
    db.flush()
    db.expire_all()


def test_list_modules_in_order_with_counts(user_client, db):
    add_content(db)
    response = user_client.get("/api/modules")
    assert response.status_code == 200
    assert response.json() == [
        {"key": "ccc601", "code": "CCC601", "title": "Public Cloud Administration", "submodule_count": 0, "week_count": 0, "task_count": 0, "completed_count": 0, "week_numbers": [], "uplearn_url": None},
        {"key": "ccc602", "code": "CCC602", "title": "Data Engineering", "submodule_count": 2, "week_count": 2, "task_count": 2, "completed_count": 0, "week_numbers": [9, 10], "uplearn_url": "https://up.test/602"},
    ]


def test_list_modules_when_empty(user_client):
    assert user_client.get("/api/modules").json() == []


def test_module_detail(user_client, db, intake, today_is):
    add_schedule(db, intake)
    add_content(db)
    today_is(date(2026, 10, 17))
    body = user_client.get("/api/modules/ccc602").json()
    assert body["uplearn_url"] == "https://up.test/602"
    assert [w["key"] for w in body["weeks"]] == ["w9", "w10"]
    assert body["weeks"][0]["tasks"][0] == {
        "key": "t1", "title": "LP1", "type": "learning_path",
        "external_url": "https://learn.test", "uplearn_url": None, "note": None, "done": False,
    }
    assert body["weeks"][0]["tasks"][1]["note"] == "Key in Teams"
    assert body["weeks"][1]["tasks"] == []
    assert body["assessments"] == [
        {"key": "a3", "title": "Assessment 3", "due_date": "2026-10-25", "uplearn_url": "https://up.test",
         "submitted": False, "status": "upcoming", "days_until": 8},
        {"key": "a4", "title": "Assessment 4", "due_date": None, "uplearn_url": None,
         "submitted": False, "status": "no_date", "days_until": None},
    ]


def test_unknown_module_is_404(user_client):
    response = user_client.get("/api/modules/nope")
    assert response.status_code == 404
    assert response.json() == {"detail": "Module not found"}


def test_module_detail_lists_submodules_with_prerequisites(user_client, db):
    add_content(db)
    body = user_client.get("/api/modules/ccc602").json()
    assert body["submodules"] == [
        {
            "key": "dp900", "code": "DP-900", "title": "Azure Data Fundamentals",
            "uplearn_url": "https://up.test/dp900", "first_week": 9, "last_week": 9,
            "prerequisites": [{
                "key": "azure-account", "title": "Create an Azure account", "note": "Personal email",
                "external_url": "https://azure.test", "uplearn_url": None, "completed": False,
            }],
        },
        {
            "key": "dea", "code": "DEA-C01", "title": "AWS Data Engineer",
            "uplearn_url": None, "first_week": 10, "last_week": 10, "prerequisites": [],
        },
    ]
    assert [(w["key"], w["submodule_key"]) for w in body["weeks"]] == [("w9", "dp900"), ("w10", "dea")]


def test_submodule_without_weeks_has_no_week_range(user_client, db):
    db.add(Module(key="m", code="M", title="M", position=1, submodules=[
        Submodule(key="empty", code="E", title="Empty", position=0),
    ]))
    db.flush()
    db.expire_all()
    [sub] = user_client.get("/api/modules/m").json()["submodules"]
    assert (sub["first_week"], sub["last_week"]) == (None, None)


def test_weeks_carry_the_schedule_post_for_the_users_study_mode(user_client, db):
    add_content(db)
    de = db.scalars(select(Module).where(Module.key == "ccc602")).one()
    db.add_all([
        SchedulePost(module_id=de.id, study_mode="FT", week_number=9, url="https://up.test/w9-ft"),
        SchedulePost(module_id=de.id, study_mode="PT", week_number=10, url="https://up.test/w10-pt"),
    ])
    db.flush()
    weeks = user_client.get("/api/modules/ccc602").json()["weeks"]
    assert [(w["week_number"], w["schedule_post_url"]) for w in weeks] == [(9, "https://up.test/w9-ft"), (10, None)]
