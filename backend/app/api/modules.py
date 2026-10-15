from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.schemas import AssessmentOut, ModuleDetail, ModuleSummary, PrerequisiteOut, SubmoduleOut, WeekOut
from app.db import get_db
from app.models import Module, Submodule, SubmodulePrerequisite, Week

router = APIRouter(prefix="/modules", tags=["modules"])


@router.get("", response_model=list[ModuleSummary])
def list_modules(db: Session = Depends(get_db)) -> list[ModuleSummary]:
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
            uplearn_url=m.uplearn_url,
        )
        for m in modules
    ]


def _submodule_out(sub: Submodule) -> SubmoduleOut:
    numbers = [w.week_number for w in sub.weeks]
    return SubmoduleOut(
        key=sub.key,
        code=sub.code,
        title=sub.title,
        uplearn_url=sub.uplearn_url,
        first_week=min(numbers, default=None),
        last_week=max(numbers, default=None),
        prerequisites=[PrerequisiteOut.model_validate(link.prerequisite) for link in sub.prerequisite_links],
    )


@router.get("/{key}", response_model=ModuleDetail)
def get_module(key: str, db: Session = Depends(get_db)) -> ModuleDetail:
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
    assessments = sorted(
        (AssessmentOut.model_validate(a) for a in module.assessments),
        key=lambda a: (a.due_date is None, a.due_date or date.max, a.title),
    )
    return ModuleDetail(
        key=module.key,
        code=module.code,
        title=module.title,
        uplearn_url=module.uplearn_url,
        submodules=[_submodule_out(s) for s in module.submodules],
        weeks=[WeekOut.model_validate(w) for w in module.weeks],
        assessments=assessments,
    )
