from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.auth.deps import current_user
from app.db import get_db
from app.models import Prerequisite, PrerequisiteCompletion, Task, TaskCompletion, User

router = APIRouter(tags=["ticks"])


def _id(db: Session, model, key: str, label: str) -> int:
    row_id = db.scalar(select(model.id).where(model.key == key))
    if row_id is None:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return row_id


@router.put("/tasks/{key}/complete", status_code=204)
def complete_task(key: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> None:
    task_id = _id(db, Task, key, "Task")
    db.execute(insert(TaskCompletion).values(user_id=user.id, task_id=task_id).on_conflict_do_nothing())
    db.commit()


@router.delete("/tasks/{key}/complete", status_code=204)
def uncomplete_task(key: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> None:
    task_id = _id(db, Task, key, "Task")
    db.execute(delete(TaskCompletion).where(TaskCompletion.user_id == user.id, TaskCompletion.task_id == task_id))
    db.commit()


@router.put("/prerequisites/{key}/complete", status_code=204)
def complete_prerequisite(key: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> None:
    prereq_id = _id(db, Prerequisite, key, "Prerequisite")
    db.execute(
        insert(PrerequisiteCompletion).values(user_id=user.id, prerequisite_id=prereq_id).on_conflict_do_nothing()
    )
    db.commit()


@router.delete("/prerequisites/{key}/complete", status_code=204)
def uncomplete_prerequisite(key: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> None:
    prereq_id = _id(db, Prerequisite, key, "Prerequisite")
    db.execute(
        delete(PrerequisiteCompletion).where(
            PrerequisiteCompletion.user_id == user.id, PrerequisiteCompletion.prerequisite_id == prereq_id
        )
    )
    db.commit()
