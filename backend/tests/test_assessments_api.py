from datetime import date

import pytest
from sqlalchemy import select

from app.api.assessments import assessment_status
from app.models import Assessment, AssessmentResource, Module
from tests.conftest import PT_WEEKS, add_schedule, signup_body

TODAY = date(2026, 10, 17)


@pytest.mark.parametrize(
    ("due", "submitted", "expected"),
    [
        (None, False, ("no_date", None)),
        (None, True, ("submitted", None)),
        (date(2026, 10, 25), False, ("upcoming", 8)),
        (date(2026, 10, 17), False, ("due_today", 0)),
        (date(2026, 10, 16), False, ("overdue", -1)),
        (date(2026, 10, 16), True, ("submitted", -1)),
    ],
)
def test_assessment_status(due, submitted, expected):
    assert assessment_status(due, submitted, TODAY) == expected


def add_assessments(db, intake, weeks=None):
    add_schedule(db, intake, **({} if weeks is None else {"weeks": weeks}))
    db.add_all([
        Module(key="ccc602", code="CCC602", title="DE", position=2, assessments=[
            Assessment(key="a4", title="A4", due_week=16),
            Assessment(key="a3", title="A3", due_week=12, uplearn_url="https://up.test/a3"),
        ]),
        Module(key="ccc601", code="CCC601", title="Admin", position=1, assessments=[
            Assessment(key="a1", title="A1", due_week=4),
        ]),
    ])
    db.flush()


def test_list_assessments_in_module_then_date_order(user_client, db, intake, today_is):
    add_assessments(db, intake)
    today_is(TODAY)
    body = user_client.get("/api/assessments").json()
    assert [a["key"] for a in body] == ["a1", "a3", "a4"]
    assert body[1] == {
        "key": "a3", "title": "A3", "due_date": "2026-10-25", "uplearn_url": "https://up.test/a3",
        "submitted": False, "status": "upcoming", "days_until": 8, "module_key": "ccc602", "module_code": "CCC602",
        "resources": [],
    }
    assert body[0]["status"] == "overdue"


def test_part_time_due_dates_follow_the_intakes_own_weeks(user_client, db, intake, today_is):
    intake.study_mode = "PT"
    add_assessments(db, intake, weeks=PT_WEEKS)
    today_is(TODAY)
    a1 = user_client.get("/api/assessments").json()[0]
    assert (a1["key"], a1["due_date"]) == ("a1", "2026-09-13")  # content week 4 is PT week 8; its Sunday


def test_submit_and_unsubmit_are_idempotent(user_client, db, intake, today_is):
    add_assessments(db, intake)
    today_is(TODAY)
    for _ in range(2):
        assert user_client.put("/api/assessments/a1/submitted").status_code == 204
    a1 = user_client.get("/api/assessments").json()[0]
    assert (a1["submitted"], a1["status"]) == (True, "submitted")
    for _ in range(2):
        assert user_client.delete("/api/assessments/a1/submitted").status_code == 204
    assert user_client.get("/api/assessments").json()[0]["status"] == "overdue"


def test_unknown_assessment_is_404(user_client):
    response = user_client.put("/api/assessments/nope/submitted")
    assert response.status_code == 404
    assert response.json() == {"detail": "Assessment not found"}


def test_submissions_are_per_user(user_client, client, db, intake, today_is):
    add_assessments(db, intake)
    today_is(TODAY)
    user_client.put("/api/assessments/a3/submitted")  # not yet due, so sign-up catch-up leaves it alone
    client.post("/api/auth/logout")
    client.post("/api/auth/signup", json=signup_body("other@example.com"))
    assert client.get("/api/assessments").json()[1]["submitted"] is False


def test_assessments_need_a_session(client):
    assert client.get("/api/assessments").status_code == 401
    assert client.put("/api/assessments/a1/submitted").status_code == 401


def test_assessments_include_resources(user_client, db, intake, today_is):
    add_assessments(db, intake)
    a3 = db.scalars(select(Assessment).where(Assessment.key == "a3")).one()
    a3.resources = [
        AssessmentResource(key="b", title="B", url="https://x.test/b", group="tool", position=1),
        AssessmentResource(key="a", title="A", url="https://x.test/a", group="recording", tasks=[2, 3], position=0),
    ]
    db.flush()
    db.expire_all()  # reload so the relationship's position order applies
    today_is(TODAY)
    body = user_client.get("/api/assessments").json()
    [row] = [a for a in body if a["key"] == "a3"]
    assert row["resources"] == [
        {"key": "a", "title": "A", "url": "https://x.test/a", "group": "recording", "tasks": [2, 3]},
        {"key": "b", "title": "B", "url": "https://x.test/b", "group": "tool", "tasks": []},
    ]
    assert all(a["resources"] == [] for a in body if a["key"] != "a3")
