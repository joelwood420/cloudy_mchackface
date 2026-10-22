from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session, selectinload

from app.api.schemas import AssessmentOut, AssessmentStatusOut
from app.auth.deps import current_user
from app.clock import today
from app.db import get_db
from app.models import Assessment, AssessmentSubmission, Intake, Module, User
from app.pacing import due_date
from app.schedule import TeachingWeek

router = APIRouter(tags=["assessments"])


def assessment_status(due: date | None, submitted: bool, today: date) -> tuple[str, int | None]:
    days = None if due is None else (due - today).days
    if submitted:
        return "submitted", days
    if days is None:
        return "no_date", None
    if days < 0:
        return "overdue", days
    return ("due_today" if days == 0 else "upcoming"), days


def submitted_ids(db: Session, user: User) -> set[int]:
    return set(db.scalars(select(AssessmentSubmission.assessment_id).where(AssessmentSubmission.user_id == user.id)))


def assessment_due(a: Assessment, intake: Intake) -> date | None:
    """When the assessment is due for students on this intake."""
    weeks = [TeachingWeek(w.week_number, w.starts_on) for w in intake.weeks]
    return due_date(weeks, intake.study_mode, a.due_week, a.due_weekday)


def assessment_out(a: Assessment, submitted: set[int], today: date, due: date | None) -> AssessmentOut:
    status, days = assessment_status(due, a.id in submitted, today)
    return AssessmentOut(
        key=a.key, title=a.title, due_date=due, uplearn_url=a.uplearn_url,
        submitted=a.id in submitted, status=status, days_until=days,
    )


def _sort_key(a: Assessment, due: date | None):
    return (due is None, due or date.max, a.title)


@router.get("/assessments", response_model=list[AssessmentStatusOut])
def list_assessments(
    user: User = Depends(current_user), db: Session = Depends(get_db), today_: date = Depends(today)
) -> list[AssessmentStatusOut]:
    done = submitted_ids(db, user)
    intake = user.settings.intake
    modules = db.scalars(select(Module).options(selectinload(Module.assessments)).order_by(Module.position)).all()
    return [
        AssessmentStatusOut(**assessment_out(a, done, today_, due).model_dump(), module_key=m.key, module_code=m.code)
        for m in modules
        for a, due in sorted(((a, assessment_due(a, intake)) for a in m.assessments), key=lambda p: _sort_key(*p))
    ]


def _assessment_id(db: Session, key: str) -> int:
    row_id = db.scalar(select(Assessment.id).where(Assessment.key == key))
    if row_id is None:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return row_id


@router.put("/assessments/{key}/submitted", status_code=204)
def submit(key: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> None:
    assessment_id = _assessment_id(db, key)
    db.execute(insert(AssessmentSubmission).values(user_id=user.id, assessment_id=assessment_id).on_conflict_do_nothing())
    db.commit()


@router.delete("/assessments/{key}/submitted", status_code=204)
def unsubmit(key: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> None:
    assessment_id = _assessment_id(db, key)
    db.execute(
        delete(AssessmentSubmission).where(
            AssessmentSubmission.user_id == user.id, AssessmentSubmission.assessment_id == assessment_id
        )
    )
    db.commit()
