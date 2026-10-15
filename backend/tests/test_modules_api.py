from datetime import date

from app.models import Assessment, Module, Task, Week


def add_content(db):
    de = Module(key="ccc602", code="CCC602", title="Data Engineering", position=2, uplearn_url="https://up.test/602")
    de.weeks = [
        Week(key="w10", week_number=10, title="Empty", position=1),
        Week(key="w9", week_number=9, title="DP-900", position=0, tasks=[
            Task(key="t2", title="Labs", type="lab", external_url="https://lab.test", position=1),
            Task(key="t1", title="LP1", type="learning_path", external_url="https://learn.test", position=0),
        ]),
    ]
    de.assessments = [
        Assessment(key="a4", title="Assessment 4", due_date=None),
        Assessment(key="a3", title="Assessment 3", due_date=date(2026, 10, 25), uplearn_url="https://up.test"),
    ]
    admin = Module(key="ccc601", code="CCC601", title="Public Cloud Administration", position=1)
    db.add_all([de, admin])
    db.flush()
    db.expire_all()


def test_list_modules_in_order_with_counts(client, db):
    add_content(db)
    response = client.get("/api/modules")
    assert response.status_code == 200
    assert response.json() == [
        {"key": "ccc601", "code": "CCC601", "title": "Public Cloud Administration", "week_count": 0, "task_count": 0, "uplearn_url": None},
        {"key": "ccc602", "code": "CCC602", "title": "Data Engineering", "week_count": 2, "task_count": 2, "uplearn_url": "https://up.test/602"},
    ]


def test_list_modules_when_empty(client):
    assert client.get("/api/modules").json() == []


def test_module_detail(client, db):
    add_content(db)
    body = client.get("/api/modules/ccc602").json()
    assert body["uplearn_url"] == "https://up.test/602"
    assert [w["key"] for w in body["weeks"]] == ["w9", "w10"]
    assert body["weeks"][0]["tasks"][0] == {
        "key": "t1", "title": "LP1", "type": "learning_path",
        "external_url": "https://learn.test", "uplearn_url": None,
    }
    assert body["weeks"][1]["tasks"] == []
    assert body["assessments"] == [
        {"key": "a3", "title": "Assessment 3", "due_date": "2026-10-25", "uplearn_url": "https://up.test"},
        {"key": "a4", "title": "Assessment 4", "due_date": None, "uplearn_url": None},
    ]


def test_unknown_module_is_404(client):
    response = client.get("/api/modules/nope")
    assert response.status_code == 404
    assert response.json() == {"detail": "Module not found"}
