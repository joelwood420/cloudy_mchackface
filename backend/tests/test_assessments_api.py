from datetime import date

import pytest

from app.api.assessments import assessment_status
from app.models import Assessment, Module
from tests.conftest import signup_body

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


def add_assessments(db):
    db.add_all([
        Module(key="ccc602", code="CCC602", title="DE", position=2, assessments=[
            Assessment(key="a4", title="A4", due_date=date(2026, 11, 22)),
            Assessment(key="a3", title="A3", due_date=date(2026, 10, 25), uplearn_url="https://up.test/a3"),
        ]),
        Module(key="ccc601", code="CCC601", title="Admin", position=1, assessments=[
            Assessment(key="a1", title="A1", due_date=date(2026, 8, 16)),
        ]),
    ])
    db.flush()


def test_list_assessments_in_module_then_date_order(user_client, db, today_is):
    add_assessments(db)
    today_is(TODAY)
    body = user_client.get("/api/assessments").json()
    assert [a["key"] for a in body] == ["a1", "a3", "a4"]
    assert body[1] == {
        "key": "a3", "title": "A3", "due_date": "2026-10-25", "uplearn_url": "https://up.test/a3",
        "submitted": False, "status": "upcoming", "days_until": 8, "module_key": "ccc602", "module_code": "CCC602",
    }
    assert body[0]["status"] == "overdue"


def test_submit_and_unsubmit_are_idempotent(user_client, db, today_is):
    add_assessments(db)
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


def test_submissions_are_per_user(user_client, client, db, today_is):
    add_assessments(db)
    today_is(TODAY)
    user_client.put("/api/assessments/a1/submitted")
    client.post("/api/auth/logout")
    client.post("/api/auth/signup", json=signup_body("other@example.com"))
    assert client.get("/api/assessments").json()[0]["submitted"] is False


def test_assessments_need_a_session(client):
    assert client.get("/api/assessments").status_code == 401
    assert client.put("/api/assessments/a1/submitted").status_code == 401
