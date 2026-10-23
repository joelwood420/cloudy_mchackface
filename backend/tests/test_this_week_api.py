from datetime import date

import pytest

from sqlalchemy import select

from app.models import Assessment, AssessmentResource, Module, Prerequisite, SchedulePost, Submodule, SubmodulePrerequisite, Task, Week
from tests.conftest import PT_WEEKS, add_schedule


def t(key, pos=0):
    return Task(key=key, title=key.upper(), type="lab", external_url=f"https://x.test/{key}", position=pos)


@pytest.fixture
def content(db, intake):
    add_schedule(db, intake, holidays=[(date(2026, 10, 26), "Labour Day")])
    admin_sub = Submodule(key="az104", code="AZ-104", title="Azure Admin", position=0)
    de_sub = Submodule(key="dp900", code="DP-900", title="Azure Data", position=0, uplearn_url="https://up.test/dp900")
    admin = Module(key="ccc601", code="CCC601", title="Admin", position=1, submodules=[admin_sub], weeks=[
        Week(key="w8", week_number=8, title="W8", position=0, submodule=admin_sub, tasks=[t("t8")]),
    ], assessments=[Assessment(key="a2", title="A2", due_week=8)])
    de = Module(key="ccc602", code="CCC602", title="Data Engineering", position=2, uplearn_url="https://up.test/602",
                submodules=[de_sub], weeks=[
        Week(key="w10", week_number=10, title="W10", position=0, submodule=de_sub, tasks=[t("t10")]),
        Week(key="w11", week_number=11, title="W11", position=1, submodule=de_sub, tasks=[t("t11a", 0), t("t11b", 1)]),
        Week(key="w12", week_number=12, title="W12", position=2, submodule=de_sub, tasks=[t("t12")]),
    ], assessments=[
        Assessment(key="a3", title="A3", due_week=12),
        Assessment(key="a4", title="A4", due_week=16),
        Assessment(key="a5", title="A5", due_week=None),
    ])
    azure = Prerequisite(key="azure", title="Azure account", external_url="https://azure.test")
    skillable = Prerequisite(key="skillable", title="Skillable", external_url="https://skillable.test")
    db.add_all([admin, de, azure, skillable])
    db.flush()
    db.add_all([
        SubmodulePrerequisite(submodule_id=de_sub.id, prerequisite_id=azure.id, position=0),
        SubmodulePrerequisite(submodule_id=de_sub.id, prerequisite_id=skillable.id, position=1),
    ])
    db.flush()


def get(client):
    response = client.get("/api/this-week")
    assert response.status_code == 200
    return response.json()


def test_teaching_week(user_client, content, today_is):
    today_is(date(2026, 10, 14))
    body = get(user_client)
    assert body["today"] == "2026-10-14"
    assert body["status"] == "teaching"
    assert body["week"] == {"week_number": 11, "starts_on": "2026-10-12", "ends_on": "2026-10-18"}
    assert (body["current_break"], body["next_week"], body["upcoming_break"], body["holidays"]) == (None, None, None, [])
    [group] = body["groups"]
    assert (group["module_code"], group["module_title"], group["module_uplearn_url"]) == ("CCC602", "Data Engineering", "https://up.test/602")
    assert group["submodule"] == {"key": "dp900", "code": "DP-900", "title": "Azure Data", "uplearn_url": "https://up.test/dp900"}
    assert [t["key"] for t in group["week"]["tasks"]] == ["t11a", "t11b"]
    assert [p["key"] for p in group["prerequisites"]] == ["azure", "skillable"]
    assert body["stats"] == {"done": 0, "total": 2, "next_deadline_days": 11}


def test_only_unfinished_prerequisites_are_listed(user_client, content, today_is):
    today_is(date(2026, 10, 14))
    user_client.put("/api/prerequisites/azure/complete")
    assert [p["key"] for p in get(user_client)["groups"][0]["prerequisites"]] == ["skillable"]


def test_lurking_lists_unticked_tasks_from_earlier_weeks(user_client, content, today_is):
    today_is(date(2026, 10, 14))
    user_client.put("/api/tasks/t10/complete")
    lurking = get(user_client)["lurking"]
    assert [(w["week_number"], [t["key"] for t in w["tasks"]]) for w in lurking] == [(8, ["t8"])]
    assert lurking[0]["tasks"][0]["module_code"] == "CCC601"
    assert (lurking[0]["tasks"][0]["submodule_code"], lurking[0]["tasks"][0]["submodule_uplearn_url"]) == ("AZ-104", None)


def test_ahead_when_every_task_this_week_is_ticked(user_client, content, today_is):
    today_is(date(2026, 10, 14))
    assert get(user_client)["ahead"] is None
    user_client.put("/api/tasks/t11a/complete")
    user_client.put("/api/tasks/t11b/complete")
    body = get(user_client)
    assert body["stats"]["done"] == 2
    assert body["ahead"]["week_number"] == 12
    assert [t["key"] for t in body["ahead"]["groups"][0]["week"]["tasks"]] == ["t12"]


def test_a_week_with_no_content_is_never_ahead(user_client, content, today_is):
    today_is(date(2026, 10, 27))  # week 13: no content
    body = get(user_client)
    assert (body["status"], body["groups"], body["ahead"]) == ("teaching", [], None)
    assert body["stats"]["total"] == 0


def test_holidays_in_the_current_week(user_client, content, today_is):
    today_is(date(2026, 10, 27))
    assert get(user_client)["holidays"] == [{"day": "2026-10-26", "name": "Labour Day"}]


def test_upcoming_break(user_client, content, today_is):
    today_is(date(2026, 9, 2))  # week 7
    assert get(user_client)["upcoming_break"] == {
        "starts_on": "2026-09-14", "ends_on": "2026-09-27", "length_weeks": 2, "resumes_week": 9, "resumes_on": "2026-09-28",
    }


def test_on_break(user_client, content, today_is):
    today_is(date(2026, 9, 20))
    body = get(user_client)
    assert body["status"] == "break"
    assert body["week"] is None
    assert body["current_break"] == {"starts_on": "2026-09-14", "ends_on": "2026-09-27", "week_of_break": 1, "length_weeks": 2}
    assert body["next_week"] == {"week_number": 9, "starts_on": "2026-09-28"}
    assert [w["week_number"] for w in body["lurking"]] == [8]
    assert body["groups"] == [] and body["stats"]["total"] == 0


def test_before_start(user_client, content, today_is):
    today_is(date(2026, 7, 1))
    body = get(user_client)
    assert (body["status"], body["next_week"], body["lurking"]) == ("before_start", {"week_number": 1, "starts_on": "2026-07-20"}, [])


def test_finished_counts_every_unticked_task_as_lurking(user_client, content, today_is):
    today_is(date(2027, 5, 1))
    body = get(user_client)
    assert body["status"] == "finished"
    assert [w["week_number"] for w in body["lurking"]] == [8, 10, 11, 12]


def test_assessment_window(user_client, content, today_is):
    today_is(date(2026, 10, 14))
    # a2 overdue and not submitted: shown. a3 due in 11 days: shown. a4 due in 39 days: not yet. a5 no date: never.
    assert [a["key"] for a in get(user_client)["assessments"]] == ["a2", "a3"]
    user_client.put("/api/assessments/a2/submitted")
    user_client.put("/api/assessments/a3/submitted")
    body = get(user_client)
    assert [(a["key"], a["status"]) for a in body["assessments"]] == [("a3", "submitted")]
    assert body["stats"]["next_deadline_days"] == 39


def test_window_edge_is_28_days(user_client, content, today_is):
    today_is(date(2026, 10, 25))  # a4 is exactly 28 days away
    assert "a4" in [a["key"] for a in get(user_client)["assessments"]]
    today_is(date(2026, 10, 24))  # 29 days
    assert "a4" not in [a["key"] for a in get(user_client)["assessments"]]


def test_groups_cover_every_module_in_the_week_in_module_order(user_client, db, content, today_is):
    extra = Submodule(key="sec", code="SEC", title="Security", position=0)
    db.add(Module(key="ccc600", code="CCC600", title="Earlier", position=0, submodules=[extra], weeks=[
        Week(key="x11", week_number=11, title="X11", position=0, submodule=extra, tasks=[t("x1")]),
    ]))
    db.flush()
    today_is(date(2026, 10, 14))
    groups = get(user_client)["groups"]
    assert [(g["module_code"], [t["key"] for t in g["week"]["tasks"]]) for g in groups] == [
        ("CCC600", ["x1"]), ("CCC602", ["t11a", "t11b"]),
    ]


def test_this_week_needs_a_session(client):
    assert client.get("/api/this-week").status_code == 401


def test_groups_and_lurking_tasks_link_their_weeks_schedule_post(user_client, db, content, today_is):
    admin, de = db.scalars(select(Module).order_by(Module.position)).all()
    db.add_all([
        SchedulePost(module_id=admin.id, study_mode="FT", week_number=8, url="https://up.test/601-w8"),
        SchedulePost(module_id=de.id, study_mode="FT", week_number=11, url="https://up.test/602-w11"),
    ])
    db.flush()
    today_is(date(2026, 10, 14))
    body = get(user_client)
    assert body["groups"][0]["week"]["schedule_post_url"] == "https://up.test/602-w11"
    by_key = {t["key"]: t["schedule_post_url"] for w in body["lurking"] for t in w["tasks"]}
    assert by_key == {"t8": "https://up.test/601-w8", "t10": None}


@pytest.fixture
def part_time(db, intake):
    """A PT intake: content week 1 has one task, content week 3 has three."""
    intake.study_mode = "PT"
    add_schedule(db, intake, weeks=PT_WEEKS)
    sub = Submodule(key="clf", code="CLF", title="Cloud Foundations", position=0)
    db.add(Module(key="ccc601", code="CCC601", title="Admin", position=1, submodules=[sub], weeks=[
        Week(key="w1", week_number=1, title="W1", position=0, submodule=sub, tasks=[t("solo")]),
        Week(key="w3", week_number=3, title="W3", position=1, submodule=sub, tasks=[t("a", 0), t("b", 1), t("c", 2)]),
    ]))
    db.flush()


def test_part_time_week_shows_its_half_of_the_content_week(user_client, part_time, today_is):
    today_is(date(2026, 8, 19))  # PT week 5: first half of content week 3
    [group] = get(user_client)["groups"]
    assert (group["week"]["week_number"], group["week"]["key"]) == (5, "w3-5")
    assert [t["key"] for t in group["week"]["tasks"]] == ["a", "b"]
    today_is(date(2026, 8, 26))  # PT week 6: the rest
    [group] = get(user_client)["groups"]
    assert (group["week"]["week_number"], [t["key"] for t in group["week"]["tasks"]]) == (6, ["c"])


def test_part_time_week_left_empty_by_the_split_has_no_group(user_client, part_time, today_is):
    today_is(date(2026, 7, 29))  # PT week 2: content week 1's only task went to week 1
    body = get(user_client)
    assert body["week"]["week_number"] == 2
    assert body["groups"] == []


def test_part_time_lurking_uses_part_time_week_numbers(user_client, part_time, today_is):
    today_is(date(2026, 8, 26))  # PT week 6
    assert [(w["week_number"], [t["key"] for t in w["tasks"]]) for w in get(user_client)["lurking"]] == [
        (1, ["solo"]), (5, ["a", "b"]),
    ]


def resource(key, group="recording", tasks=(), position=0):
    return AssessmentResource(key=key, title=key.upper(), url=f"https://x.test/{key}", group=group, tasks=list(tasks), position=position)


def link_a3(db):
    """Make t11a A3's Task 3 step, and give A3 resources for tasks 3 and 4 plus an untagged and a submitting one."""
    a3 = db.scalars(select(Assessment).where(Assessment.key == "a3")).one()
    a3.title = "Assessment 3: Azure"
    a3.resources = [
        resource("r3", tasks=[3], position=0), resource("r4", tasks=[4], position=1),
        resource("repo", "code_data", position=2), resource("format", "submitting", position=3),
    ]
    step = db.scalars(select(Task).where(Task.key == "t11a")).one()
    step.type, step.assessment, step.assessment_task = "assessment_step", a3, 3
    db.flush()


def test_resource_box_in_current_week_only(user_client, db, content, today_is):
    link_a3(db)
    today_is(date(2026, 10, 14))
    [group] = get(user_client)["groups"]
    [box] = group["assessment_resources"]
    assert (box["assessment_key"], box["assessment_short"], box["task_numbers"]) == ("a3", "A3", [3])
    assert [r["key"] for r in box["resources"]] == ["r3", "repo"]
    assert box["resources"][0] == {"key": "r3", "title": "R3", "url": "https://x.test/r3", "group": "recording", "tasks": [3]}
    step = group["week"]["tasks"][0]
    assert (step["assessment_key"], step["assessment_task"]) == ("a3", 3)

    today_is(date(2026, 10, 7))  # week 10: t11a is ahead, and ahead groups never get boxes
    user_client.put("/api/tasks/t10/complete")
    body = get(user_client)
    assert body["ahead"]["groups"][0]["assessment_resources"] == []


def test_rail_assessments_carry_their_resources(user_client, db, content, today_is):
    link_a3(db)
    today_is(date(2026, 10, 14))
    [a3] = [a for a in get(user_client)["assessments"] if a["key"] == "a3"]
    assert [r["key"] for r in a3["resources"]] == ["r3", "r4", "repo", "format"]


@pytest.fixture
def part_time_a3(db, intake):
    """PT intake; content week 3 holds A3's Task 3 and Task 4 steps, so each lands in its own PT week."""
    intake.study_mode = "PT"
    add_schedule(db, intake, weeks=PT_WEEKS)
    sub = Submodule(key="dp203", code="DP-203", title="Data Engineer", position=0)
    a3 = Assessment(key="a3", title="Assessment 3: Azure", due_week=4, resources=[
        resource("r3", tasks=[3], position=0), resource("r4", tasks=[4], position=1), resource("repo", "code_data", position=2),
    ])
    steps = [
        Task(key=f"s{n}", title=f"Task {n}", type="assessment_step", uplearn_url="https://x.test/a3", position=n,
             assessment=a3, assessment_task=n)
        for n in (3, 4)
    ]
    db.add(Module(key="ccc602", code="CCC602", title="DE", position=2, submodules=[sub], assessments=[a3], weeks=[
        Week(key="w3", week_number=3, title="W3", position=0, submodule=sub, tasks=steps),
    ]))
    db.flush()


def test_pt_half_weeks_split_the_box(user_client, part_time_a3, today_is):
    today_is(date(2026, 8, 19))  # PT week 5: first half of content week 3
    [box] = get(user_client)["groups"][0]["assessment_resources"]
    assert (box["task_numbers"], [r["key"] for r in box["resources"]]) == ([3], ["r3", "repo"])
    today_is(date(2026, 8, 26))  # PT week 6
    [box] = get(user_client)["groups"][0]["assessment_resources"]
    assert (box["task_numbers"], [r["key"] for r in box["resources"]]) == ([4], ["r4", "repo"])
