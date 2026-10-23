from app.models import Assessment, AssessmentResource, Task
from app.resources import assessment_short, resource_boxes


def res(key, group="code_data", tasks=(), position=0):
    return AssessmentResource(key=key, title=key, url=f"https://x.test/{key}", group=group, tasks=list(tasks), position=position)


def a3(*resources):
    return Assessment(key="ccc602-a3", title="Assessment 3: Azure Practical Scenario Evaluation", resources=list(resources))


def step(key, assessment=None, number=None, shows_all=False):
    return Task(key=key, title=key, type="assessment_step", assessment=assessment, assessment_task=number,
                shows_all_resources=shows_all)


def test_assessment_short():
    assert assessment_short("Assessment 3: Azure Practical Scenario Evaluation") == "A3"
    assert assessment_short("Project") == "Project"


def test_box_filters_by_slot_tasks():
    a = a3(res("t3", "recording", [3], 0), res("t4", "recording", [4], 1), res("t5", "recording", [5], 2),
           res("repo", "code_data", [], 3), res("format", "submitting", [], 4))
    [box] = resource_boxes([step("s3", a, 3), step("s4", a, 4)])
    assert (box.assessment_key, box.assessment_short, box.task_numbers) == ("ccc602-a3", "A3", [3, 4])
    assert [r.key for r in box.resources] == ["t3", "t4", "repo"]


def test_box_shows_all_for_watch_step():
    a = a3(res("t3", "recording", [3], 0), res("t5", "recording", [5], 1), res("format", "submitting", [], 2))
    [box] = resource_boxes([step("demo", a, shows_all=True)])
    assert box.task_numbers == []
    assert [r.key for r in box.resources] == ["t3", "t5"]


def test_no_box_without_resources():
    a = a3(res("format", "submitting", [], 0))
    assert resource_boxes([step("s1", a, 1)]) == []
    assert resource_boxes([step("s1", a3(res("t5", "recording", [5])), 1)]) == []


def test_two_assessments_two_boxes_in_order():
    a = a3(res("x"))
    b = Assessment(key="ccc602-a4", title="Assessment 4: AWS", resources=[res("y")])
    lab = Task(key="lab", title="lab", type="lab")
    boxes = resource_boxes([step("b1", b), lab, step("a1", a), step("b2", b)])
    assert [x.assessment_short for x in boxes] == ["A4", "A3"]


def test_steps_without_an_assessment_are_ignored():
    assert resource_boxes([step("loose")]) == []
