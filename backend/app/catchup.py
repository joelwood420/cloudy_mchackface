"""Students often join mid-programme. At sign-up, tick off what's already behind them so This week starts clean."""

from datetime import date

from sqlalchemy import insert, select
from sqlalchemy.orm import Session

from app.api.assessments import assessment_due
from app.models import (
    Assessment, AssessmentSubmission, Intake, PrerequisiteCompletion, SubmodulePrerequisite, Task, TaskCompletion,
    User, Week,
)
from app.schedule import TeachingWeek, locate


def prefill_past_work(db: Session, user: User, intake: Intake, today: date) -> int | None:
    """Tick tasks in past weeks, mark past-due assessments submitted and prerequisites of started submodules done.

    Returns the last week counted as past, or None when nothing is past yet."""
    weeks = [TeachingWeek(w.week_number, w.starts_on) for w in intake.weeks]
    cutoff = locate(weeks, today).cutoff_week
    past = [w.week_number for w in weeks if cutoff is not None and w.week_number < cutoff]
    if not past:
        return None

    task_ids = db.scalars(select(Task.id).join(Week).where(Week.week_number < cutoff)).all()
    assessment_ids = [
        a.id for a in db.scalars(select(Assessment)) if (due := assessment_due(a, intake)) is not None and due < today
    ]
    prereq_ids = db.scalars(
        select(SubmodulePrerequisite.prerequisite_id)
        .join(Week, Week.submodule_id == SubmodulePrerequisite.submodule_id)
        .where(Week.week_number < cutoff)
        .distinct()
    ).all()
    if task_ids:
        db.execute(insert(TaskCompletion), [{"user_id": user.id, "task_id": i} for i in task_ids])
    if assessment_ids:
        db.execute(insert(AssessmentSubmission), [{"user_id": user.id, "assessment_id": i} for i in assessment_ids])
    if prereq_ids:
        db.execute(insert(PrerequisiteCompletion), [{"user_id": user.id, "prerequisite_id": i} for i in prereq_ids])
    return max(past)
