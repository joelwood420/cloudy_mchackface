"""Which of an assessment's resources belong next to the assessment steps in one This week slot. Pure functions."""

import re
from collections.abc import Sequence

from app.api.schemas import ResourceBoxOut, ResourceOut
from app.models import Assessment, Task


def assessment_short(title: str) -> str:
    """"Assessment 3: Azure…" → "A3"; anything else stays as it is."""
    match = re.match(r"Assessment (\d+)\b", title)
    return f"A{match.group(1)}" if match else title


def resource_boxes(tasks: Sequence[Task]) -> list[ResourceBoxOut]:
    """One box per assessment with steps among `tasks`, in the order the steps appear.

    A box lists the resources tagged with a task number in the slot, plus untagged ones; a "watch the recordings"
    step (shows_all_resources) lists everything. Submitting links live on the assessment card, never in a box."""
    steps: dict[int, tuple[Assessment, list[Task]]] = {}
    for task in tasks:
        if task.type == "assessment_step" and task.assessment is not None:
            steps.setdefault(task.assessment.id or id(task.assessment), (task.assessment, []))[1].append(task)

    boxes = []
    for assessment, its_steps in steps.values():
        numbers = sorted({s.assessment_task for s in its_steps if s.assessment_task is not None})
        show_all = any(s.shows_all_resources for s in its_steps)
        resources = [
            r for r in assessment.resources
            if r.group != "submitting" and (show_all or not r.tasks or set(r.tasks) & set(numbers))
        ]
        if resources:
            boxes.append(ResourceBoxOut(
                assessment_key=assessment.key, assessment_short=assessment_short(assessment.title),
                task_numbers=numbers, resources=[ResourceOut.model_validate(r) for r in resources],
            ))
    return boxes
