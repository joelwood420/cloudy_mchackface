from sqlalchemy import func, select

from app.models import (
    Module, Prerequisite, PrerequisiteCompletion, Submodule, SubmodulePrerequisite, Task, TaskCompletion, Week,
)
from tests.conftest import signup_body


def add_content(db):
    dp900 = Submodule(key="dp900", code="DP-900", title="DP-900", position=0)
    dp203 = Submodule(key="dp203", code="DP-203", title="DP-203", position=1)
    db.add(Module(key="ccc602", code="CCC602", title="DE", position=2, submodules=[dp900, dp203], weeks=[
        Week(key="w9", week_number=9, title="W9", position=0, submodule=dp900, tasks=[
            Task(key="t1", title="T1", type="lab", external_url="https://x.test/1", position=0),
            Task(key="t2", title="T2", type="lab", external_url="https://x.test/2", position=1),
        ]),
        Week(key="w10", week_number=10, title="W10", position=1, submodule=dp203, tasks=[
            Task(key="t3", title="T3", type="lab", external_url="https://x.test/3", position=0),
        ]),
    ]))
    azure = Prerequisite(key="azure-account", title="Azure", external_url="https://azure.test")
    db.add(azure)
    db.flush()
    db.add_all([  # shared by both submodules
        SubmodulePrerequisite(submodule_id=dp900.id, prerequisite_id=azure.id, position=0),
        SubmodulePrerequisite(submodule_id=dp203.id, prerequisite_id=azure.id, position=0),
    ])
    db.flush()


def count(db, model):
    return db.scalar(select(func.count()).select_from(model))


def prerequisite_flags(client):
    detail = client.get("/api/modules/ccc602").json()
    return [[p["completed"] for p in s["prerequisites"]] for s in detail["submodules"]]


def test_tick_and_untick_are_idempotent(user_client, db):
    add_content(db)
    assert user_client.put("/api/tasks/t1/complete").status_code == 204
    assert user_client.put("/api/tasks/t1/complete").status_code == 204
    assert count(db, TaskCompletion) == 1
    assert user_client.delete("/api/tasks/t1/complete").status_code == 204
    assert user_client.delete("/api/tasks/t1/complete").status_code == 204
    assert count(db, TaskCompletion) == 0


def test_unknown_task_or_prerequisite_is_404(user_client, db):
    add_content(db)
    for method in (user_client.put, user_client.delete):
        assert method("/api/tasks/nope/complete").json() == {"detail": "Task not found"}
        response = method("/api/prerequisites/nope/complete")
        assert response.status_code == 404
        assert response.json() == {"detail": "Prerequisite not found"}


def test_ticking_needs_a_session(client, db):
    add_content(db)
    for path in ("/api/tasks/t1/complete", "/api/prerequisites/azure-account/complete"):
        assert client.put(path).status_code == 401
        assert client.delete(path).status_code == 401


def test_module_reads_need_a_session(client, db):
    add_content(db)
    assert client.get("/api/modules").status_code == 401
    assert client.get("/api/modules/ccc602").status_code == 401


def test_progress_counts_and_done_flags(user_client, db):
    add_content(db)
    user_client.put("/api/tasks/t1/complete")
    user_client.put("/api/tasks/t3/complete")

    [summary] = user_client.get("/api/modules").json()
    assert summary["completed_count"] == 2
    assert summary["task_count"] == 3
    assert summary["week_numbers"] == [9, 10]

    detail = user_client.get("/api/modules/ccc602").json()
    assert [[t["done"] for t in w["tasks"]] for w in detail["weeks"]] == [[True, False], [True]]


def test_shared_prerequisite_tick_shows_everywhere_and_never_counts(user_client, db):
    add_content(db)
    assert prerequisite_flags(user_client) == [[False], [False]]

    assert user_client.put("/api/prerequisites/azure-account/complete").status_code == 204
    assert user_client.put("/api/prerequisites/azure-account/complete").status_code == 204
    assert count(db, PrerequisiteCompletion) == 1
    assert prerequisite_flags(user_client) == [[True], [True]]
    assert user_client.get("/api/modules").json()[0]["completed_count"] == 0

    assert user_client.delete("/api/prerequisites/azure-account/complete").status_code == 204
    assert user_client.delete("/api/prerequisites/azure-account/complete").status_code == 204
    assert prerequisite_flags(user_client) == [[False], [False]]


def test_one_users_ticks_never_show_for_another(user_client, db):
    add_content(db)
    user_client.put("/api/tasks/t1/complete")
    user_client.put("/api/prerequisites/azure-account/complete")
    user_client.post("/api/auth/logout")

    other = user_client.post("/api/auth/signup", json=signup_body("other@example.com"))
    assert other.status_code == 201
    assert user_client.get("/api/modules").json()[0]["completed_count"] == 0
    detail = user_client.get("/api/modules/ccc602").json()
    assert not any(t["done"] for w in detail["weeks"] for t in w["tasks"])
    assert prerequisite_flags(user_client) == [[False], [False]]
