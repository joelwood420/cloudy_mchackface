from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.assessments import _sort_key, assessment_out, submitted_ids
from app.api.schemas import ModuleDetail, ModuleSummary, PrerequisiteOut, SubmoduleOut, WeekOut
from app.auth.deps import current_user
from app.clock import today
from app.db import get_db
from app.models import (
    Module,
    PrerequisiteCompletion,
    Submodule,
    SubmodulePrerequisite,
    TaskCompletion,
    User,
    Week,
)

router = APIRouter(prefix="/modules", tags=["modules"])


def _done_task_ids(db: Session, user: User) -> set[int]:
    return set(db.scalars(select(TaskCompletion.task_id).where(TaskCompletion.user_id == user.id)))


def _done_prerequisite_ids(db: Session, user: User) -> set[int]:
    return set(
        db.scalars(select(PrerequisiteCompletion.prerequisite_id).where(PrerequisiteCompletion.user_id == user.id))
    )


@router.get("", response_model=list[ModuleSummary])
def list_modules(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[ModuleSummary]:
    done = _done_task_ids(db, user)
    modules = db.scalars(
        select(Module)
        .options(selectinload(Module.weeks).selectinload(Week.tasks), selectinload(Module.submodules))
        .order_by(Module.position)
    ).all()
    return [
        ModuleSummary(
            key=m.key,
            code=m.code,
            title=m.title,
            submodule_count=len(m.submodules),
            week_count=len(m.weeks),
            task_count=sum(len(w.tasks) for w in m.weeks),
            completed_count=sum(1 for w in m.weeks for t in w.tasks if t.id in done),
            week_numbers=list(dict.fromkeys(w.week_number for w in m.weeks)),
            uplearn_url=m.uplearn_url,
        )
        for m in modules
    ]


def _submodule_out(sub: Submodule, done_prereqs: set[int]) -> SubmoduleOut:
    numbers = [w.week_number for w in sub.weeks]
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
            selectinload(Module.weeks).selectinload(Week.tasks),
            selectinload(Module.submodules).selectinload(Submodule.weeks),
            selectinload(Module.submodules)
            .selectinload(Submodule.prerequisite_links)
            .selectinload(SubmodulePrerequisite.prerequisite),
            selectinload(Module.assessments),
        )
    ).one_or_none()
    if module is None:
        raise HTTPException(status_code=404, detail="Module not found")
    done_tasks = _done_task_ids(db, user)
    done_prereqs = _done_prerequisite_ids(db, user)
    weeks = []
    for week in module.weeks:
        week_out = WeekOut.model_validate(week)
        for task, task_out in zip(week.tasks, week_out.tasks):
            task_out.done = task.id in done_tasks
        weeks.append(week_out)
    done_assessments = submitted_ids(db, user)
    assessments = [assessment_out(a, done_assessments, today_) for a in sorted(module.assessments, key=_sort_key)]
    return ModuleDetail(
        key=module.key,
        code=module.code,
        title=module.title,
        uplearn_url=module.uplearn_url,
        submodules=[_submodule_out(s, done_prereqs) for s in module.submodules],
        weeks=weeks,
        assessments=assessments,
    )
