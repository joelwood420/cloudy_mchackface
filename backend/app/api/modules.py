from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.assessments import _sort_key, assessment_due, assessment_out, submitted_ids
from app.api.schemas import ModuleDetail, ModuleSummary, PrerequisiteOut, SubmoduleOut, TaskOut, WeekOut
from app.auth.deps import current_user
from app.clock import today
from app.db import get_db
from app.models import (
    Assessment,
    Module,
    PrerequisiteCompletion,
    SchedulePost,
    Submodule,
    SubmodulePrerequisite,
    Task,
    TaskCompletion,
    User,
    Week,
)
from app.pacing import StudyMode, intake_weeks, week_slots

router = APIRouter(prefix="/modules", tags=["modules"])


def _done_task_ids(db: Session, user: User) -> set[int]:
    return set(db.scalars(select(TaskCompletion.task_id).where(TaskCompletion.user_id == user.id)))


def _done_prerequisite_ids(db: Session, user: User) -> set[int]:
    return set(
        db.scalars(select(PrerequisiteCompletion.prerequisite_id).where(PrerequisiteCompletion.user_id == user.id))
    )


def schedule_post_urls(db: Session, user: User) -> dict[tuple[int, int], str]:
    """(module id, week number) -> the schedule post for the user's study mode."""
    posts = db.scalars(select(SchedulePost).where(SchedulePost.study_mode == user.settings.intake.study_mode))
    return {(p.module_id, p.week_number): p.url for p in posts}


@router.get("", response_model=list[ModuleSummary])
def list_modules(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[ModuleSummary]:
    done = _done_task_ids(db, user)
    modules = db.scalars(
        select(Module)
        .options(selectinload(Module.weeks).selectinload(Week.tasks), selectinload(Module.submodules))
        .order_by(Module.position)
    ).all()
    mode = user.settings.intake.study_mode
    out = []
    for m in modules:
        slots = week_slots(mode, m.weeks)
        out.append(
            ModuleSummary(
                key=m.key,
                code=m.code,
                title=m.title,
                submodule_count=len(m.submodules),
                week_count=len(slots),
                task_count=sum(len(w.tasks) for w in m.weeks),
                completed_count=sum(1 for w in m.weeks for t in w.tasks if t.id in done),
                week_numbers=list(dict.fromkeys(n for n, _, _ in slots)),
                uplearn_url=m.uplearn_url,
            )
        )
    return out


def _submodule_out(sub: Submodule, mode: StudyMode, done_prereqs: set[int]) -> SubmoduleOut:
    numbers = [n for w in sub.weeks for n in intake_weeks(mode, w.week_number)]
    return SubmoduleOut(
        key=sub.key,
        code=sub.code,
        title=sub.title,
        uplearn_url=sub.uplearn_url,
        first_week=min(numbers, default=None),
        last_week=max(numbers, default=None),
        prerequisites=[
            PrerequisiteOut.model_validate(link.prerequisite).model_copy(
                update={"completed": link.prerequisite_id in done_prereqs}
            )
            for link in sub.prerequisite_links
        ],
    )


@router.get("/{key}", response_model=ModuleDetail)
def get_module(
    key: str, user: User = Depends(current_user), db: Session = Depends(get_db), today_: date = Depends(today)
) -> ModuleDetail:
    module = db.scalars(
        select(Module)
        .where(Module.key == key)
        .options(
            selectinload(Module.weeks).selectinload(Week.tasks).selectinload(Task.assessment),
            selectinload(Module.submodules).selectinload(Submodule.weeks),
            selectinload(Module.submodules)
            .selectinload(Submodule.prerequisite_links)
            .selectinload(SubmodulePrerequisite.prerequisite),
            selectinload(Module.assessments).selectinload(Assessment.resources),
        )
    ).one_or_none()
    if module is None:
        raise HTTPException(status_code=404, detail="Module not found")
    done_tasks = _done_task_ids(db, user)
    done_prereqs = _done_prerequisite_ids(db, user)
    posts = schedule_post_urls(db, user)
    mode = user.settings.intake.study_mode
    weeks = []
    # A PT intake sees each content week as its two halves, keyed apart so the page can tell them apart.
    for number, week, tasks in week_slots(mode, module.weeks):
        week_out = WeekOut.model_validate(week).model_copy(update={
            "key": week.key if mode == "FT" else f"{week.key}-{number}",
            "week_number": number,
            "tasks": [TaskOut.model_validate(t) for t in tasks],
        })
        for task, task_out in zip(tasks, week_out.tasks):
            task_out.done = task.id in done_tasks
        week_out.schedule_post_url = posts.get((module.id, number))
        weeks.append(week_out)
    done_assessments = submitted_ids(db, user)
    dated = sorted(((a, assessment_due(a, user.settings.intake)) for a in module.assessments), key=lambda p: _sort_key(*p))
    assessments = [assessment_out(a, done_assessments, today_, due) for a, due in dated]
    return ModuleDetail(
        key=module.key,
        code=module.code,
        title=module.title,
        uplearn_url=module.uplearn_url,
        submodules=[_submodule_out(s, mode, done_prereqs) for s in module.submodules],
        weeks=weeks,
        assessments=assessments,
    )
