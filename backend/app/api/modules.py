from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.schemas import ModuleDetail, ModuleSummary
from app.db import get_db
from app.models import Module, Week

router = APIRouter(prefix="/modules", tags=["modules"])


@router.get("", response_model=list[ModuleSummary])
def list_modules(db: Session = Depends(get_db)) -> list[ModuleSummary]:
    modules = db.scalars(
        select(Module).options(selectinload(Module.weeks).selectinload(Week.tasks)).order_by(Module.position)
    ).all()
    return [
        ModuleSummary(
            key=m.key,
            code=m.code,
            title=m.title,
            week_count=len(m.weeks),
            task_count=sum(len(w.tasks) for w in m.weeks),
        )
        for m in modules
    ]


@router.get("/{key}", response_model=ModuleDetail)
def get_module(key: str, db: Session = Depends(get_db)) -> ModuleDetail:
    module = db.scalars(
        select(Module)
        .where(Module.key == key)
        .options(selectinload(Module.weeks).selectinload(Week.tasks), selectinload(Module.assessments))
    ).one_or_none()
    if module is None:
        raise HTTPException(status_code=404, detail="Module not found")
    detail = ModuleDetail.model_validate(module)
    detail.assessments.sort(key=lambda a: (a.due_date is None, a.due_date or date.max, a.title))
    return detail
