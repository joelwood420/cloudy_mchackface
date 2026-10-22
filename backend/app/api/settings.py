from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.schemas import IntakeOut, MeOut, SettingsIn
from app.auth.deps import current_user
from app.catchup import prefill_past_work
from app.clock import today
from app.db import get_db
from app.models import Intake, User

router = APIRouter(tags=["settings"])

UNKNOWN_INTAKE = "Pick your intake from the list."


def find_intake(db: Session, key: str) -> Intake:
    """The intake with this key, or a 422 when there isn't one."""
    intake = db.scalars(select(Intake).where(Intake.key == key)).one_or_none()
    if intake is None:
        raise HTTPException(status_code=422, detail=UNKNOWN_INTAKE)
    return intake


@router.get("/intakes", response_model=list[IntakeOut])
def list_intakes(db: Session = Depends(get_db)) -> list[Intake]:
    """Every intake a student can pick, earliest start first, full-time before part-time."""
    intakes = [i for i in db.scalars(select(Intake).options(selectinload(Intake.weeks))) if i.weeks]
    return sorted(intakes, key=lambda i: (i.weeks[0].starts_on, i.study_mode, i.key))


@router.put("/me/settings", response_model=MeOut)
def update_settings(
    body: SettingsIn, user: User = Depends(current_user), db: Session = Depends(get_db), today_: date = Depends(today)
) -> MeOut:
    intake = find_intake(db, body.intake_key)
    user.settings.intake = intake
    db.flush()
    prefill_past_work(db, user, intake, today_)
    db.commit()
    return MeOut(email=user.email, study_mode=intake.study_mode, intake=IntakeOut.model_validate(intake))
