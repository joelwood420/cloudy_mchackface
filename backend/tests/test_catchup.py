from datetime import date

import pytest
from sqlalchemy import select

from app.models import (
    Assessment, AssessmentSubmission, Module, Prerequisite, PrerequisiteCompletion, Submodule, SubmodulePrerequisite,
    Task, TaskCompletion, User, Week,
)
from tests.conftest import add_schedule, signup_body


def t(key):
    return Task(key=key, title=key, type="lab", external_url=f"https://x.test/{key}", position=0)


@pytest.fixture
def content(db, intake):
    add_schedule(db, intake)
    started = Submodule(key="aws", code="AWS", title="AWS", position=0)
    later = Submodule(key="fortinet", code="NSE", title="Fortinet", position=1)
    db.add(Module(key="m", code="M", title="M", position=1, submodules=[started, later], weeks=[
        Week(key="w9", week_number=9, title="W9", position=0, submodule=started, tasks=[t("t9")]),
        Week(key="w11", week_number=11, title="W11", position=1, submodule=started, tasks=[t("t11")]),
        Week(key="w21", week_number=21, title="W21", position=2, submodule=later, tasks=[t("t21")]),
    ], assessments=[
        Assessment(key="past", title="Past", due_date=date(2026, 10, 1)),
        Assessment(key="today", title="Today", due_date=date(2026, 10, 14)),
        Assessment(key="future", title="Future", due_date=date(2026, 11, 22)),
    ]))
    aws_acct = Prerequisite(key="aws-account", title="AWS", external_url="https://aws.test")
    forti = Prerequisite(key="forti", title="Forti", external_url="https://forti.test")
    db.add_all([aws_acct, forti])
    db.flush()
    db.add_all([
        SubmodulePrerequisite(submodule_id=started.id, prerequisite_id=aws_acct.id, position=0),
        SubmodulePrerequisite(submodule_id=later.id, prerequisite_id=forti.id, position=0),
    ])
    db.flush()


def keys(db, model, key_model, fk):
    user_id = db.scalars(select(User.id)).one()
    return sorted(db.scalars(select(key_model.key).join(model, fk == key_model.id).where(model.user_id == user_id)))


def signup(client):
    response = client.post("/api/auth/signup", json=signup_body("new@example.com"))
    assert response.status_code == 201
    return response.json()


def test_catch_up_in_a_teaching_week(client, db, content, today_is):
    today_is(date(2026, 10, 14))  # week 11
    assert signup(client)["prefilled_through_week"] == 10
    assert keys(db, TaskCompletion, Task, TaskCompletion.task_id) == ["t9"]
    assert keys(db, AssessmentSubmission, Assessment, AssessmentSubmission.assessment_id) == ["past"]
    assert keys(db, PrerequisiteCompletion, Prerequisite, PrerequisiteCompletion.prerequisite_id) == ["aws-account"]


def test_catch_up_leaves_assessments_due_today_alone(client, db, content, today_is):
    today_is(date(2026, 10, 14))
    signup(client)
    assert "today" not in keys(db, AssessmentSubmission, Assessment, AssessmentSubmission.assessment_id)


def test_catch_up_on_a_break_ticks_everything_before_the_next_week(client, db, content, today_is):
    today_is(date(2026, 12, 25))  # Christmas break, week 21 next
    assert signup(client)["prefilled_through_week"] == 20
    assert keys(db, TaskCompletion, Task, TaskCompletion.task_id) == ["t11", "t9"]
    assert keys(db, PrerequisiteCompletion, Prerequisite, PrerequisiteCompletion.prerequisite_id) == ["aws-account"]


def test_no_catch_up_before_the_programme_starts(client, db, content, today_is):
    today_is(date(2026, 7, 1))
    assert signup(client)["prefilled_through_week"] is None
    assert keys(db, TaskCompletion, Task, TaskCompletion.task_id) == []


def test_catch_up_after_the_end_ticks_everything(client, db, content, today_is):
    today_is(date(2027, 5, 1))
    assert signup(client)["prefilled_through_week"] == 32
    assert keys(db, TaskCompletion, Task, TaskCompletion.task_id) == ["t11", "t21", "t9"]
    assert keys(db, PrerequisiteCompletion, Prerequisite, PrerequisiteCompletion.prerequisite_id) == ["aws-account", "forti"]


def test_login_does_not_catch_up(client, db, content, today_is):
    today_is(date(2026, 7, 1))
    signup(client)
    today_is(date(2026, 10, 14))
    client.post("/api/auth/login", json={"email": "new@example.com", "password": "correct horse"})
    assert keys(db, TaskCompletion, Task, TaskCompletion.task_id) == []
