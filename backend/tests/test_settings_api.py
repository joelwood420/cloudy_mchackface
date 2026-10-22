from datetime import date

import pytest
from sqlalchemy import select

from app.models import Intake, Module, Submodule, Task, TaskCompletion, User, Week
from tests.conftest import FT_WEEKS, PT_2609_WEEKS, PT_WEEKS, add_schedule


def t(key):
    return Task(key=key, title=key, type="lab", external_url=f"https://x.test/{key}", position=0)


@pytest.fixture
def intakes(db, intake):
    """The FT intake everyone signs up on, plus a July PT and a September PT intake."""
    add_schedule(db, intake, weeks=FT_WEEKS)
    july_pt = Intake(key="2607-online-ccc-pt", title="July 2026 intake, part-time", study_mode="PT")
    sept_pt = Intake(key="2609-online-ccc-pt", title="September 2026 intake, part-time", study_mode="PT")
    empty = Intake(key="empty", title="No weeks yet", study_mode="FT")
    db.add_all([july_pt, sept_pt, empty])
    db.flush()
    add_schedule(db, july_pt, weeks=PT_WEEKS)
    add_schedule(db, sept_pt, weeks=PT_2609_WEEKS)
    sub = Submodule(key="clf", code="CLF", title="CLF", position=0)
    db.add(Module(key="m", code="M", title="M", position=1, submodules=[sub], weeks=[
        Week(key=f"w{n}", week_number=n, title=f"W{n}", position=n, submodule=sub, tasks=[t(f"t{n}")])
        for n in (2, 6)
    ]))
    db.flush()


def ticked(db) -> list[str]:
    user_id = db.scalars(select(User.id)).one()
    return sorted(db.scalars(select(Task.key).join(TaskCompletion).where(TaskCompletion.user_id == user_id)))


def test_intakes_are_listed_by_start_without_a_session(client, intakes):
    response = client.get("/api/intakes")
    assert response.status_code == 200
    assert [i["key"] for i in response.json()] == ["2607-online-ccc-ft", "2607-online-ccc-pt", "2609-online-ccc-pt"]
    assert response.json()[1] == {"key": "2607-online-ccc-pt", "title": "July 2026 intake, part-time", "study_mode": "PT"}


def test_changing_intake_needs_a_session(client, intakes):
    assert client.put("/api/me/settings", json={"intake_key": "2607-online-ccc-pt"}).status_code == 401


def test_unknown_intake_is_refused(user_client, intakes):
    response = user_client.put("/api/me/settings", json={"intake_key": "nope"})
    assert response.status_code == 422
    assert response.json() == {"detail": "Pick your intake from the list."}


def test_moving_to_full_time_ticks_what_is_now_past(user_client, db, intakes, today_is):
    today_is(date(2026, 9, 2))  # week 7: PT has covered content weeks 1-3, FT content weeks 1-6
    assert user_client.put("/api/me/settings", json={"intake_key": "2607-online-ccc-pt"}).status_code == 200
    assert ticked(db) == ["t2"]
    response = user_client.put("/api/me/settings", json={"intake_key": "2607-online-ccc-ft"})
    assert response.status_code == 200
    assert (response.json()["study_mode"], response.json()["intake"]["key"]) == ("FT", "2607-online-ccc-ft")
    assert ticked(db) == ["t2", "t6"]


def test_moving_to_part_time_keeps_every_tick(user_client, db, intakes, today_is):
    today_is(date(2026, 9, 2))  # FT week 7: content week 6 is past for FT, not for PT
    user_client.put("/api/me/settings", json={"intake_key": "2607-online-ccc-ft"})
    assert ticked(db) == ["t2", "t6"]
    response = user_client.put("/api/me/settings", json={"intake_key": "2607-online-ccc-pt"})
    assert response.json()["study_mode"] == "PT"
    assert user_client.get("/api/me").json()["intake"]["key"] == "2607-online-ccc-pt"
    assert ticked(db) == ["t2", "t6"]
