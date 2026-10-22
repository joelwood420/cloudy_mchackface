"""Students often join mid-programme, or move intake. Tick off what's already behind them so This week starts clean.

Only ever adds ticks: anything the student already ticked stays, and nothing is unticked."""

from datetime import date

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session, selectinload

from app.api.assessments import assessment_due
from app.models import (
    Assessment, AssessmentSubmission, Intake, PrerequisiteCompletion, SubmodulePrerequisite, TaskCompletion, User,
    Week,
)
from app.pacing import week_slots
from app.schedule import TeachingWeek, locate


def prefill_past_work(db: Session, user: User, intake: Intake, today: date) -> int | None:
    """Tick tasks in past weeks, mark past-due assessments submitted and prerequisites of started submodules done.

    Returns the last week counted as past, or None when nothing is past yet."""
    weeks = [TeachingWeek(w.week_number, w.starts_on) for w in intake.weeks]
    cutoff = locate(weeks, today).cutoff_week
    past = [w.week_number for w in weeks if cutoff is not None and w.week_number < cutoff]
    if not past:
        return None

    content = db.scalars(select(Week).options(selectinload(Week.tasks))).all()
    past_slots = [(w, tasks) for n, w, tasks in week_slots(intake.study_mode, content) if n < cutoff]
    task_ids = list(dict.fromkeys(t.id for _, tasks in past_slots for t in tasks))
    started = {w.submodule_id for w, _ in past_slots}
    assessment_ids = [
        a.id for a in db.scalars(select(Assessment)) if (due := assessment_due(a, intake)) is not None and due < today
    ]
    prereq_ids = db.scalars(
        select(SubmodulePrerequisite.prerequisite_id)
        .where(SubmodulePrerequisite.submodule_id.in_(started))
        .distinct()
    ).all() if started else []
    # Existing ticks are left as they are; only missing ones are added.
    if task_ids:
        db.execute(
            insert(TaskCompletion).on_conflict_do_nothing(), [{"user_id": user.id, "task_id": i} for i in task_ids]
        )
    if assessment_ids:
        db.execute(
            insert(AssessmentSubmission).on_conflict_do_nothing(),
            [{"user_id": user.id, "assessment_id": i} for i in assessment_ids],
        )
    if prereq_ids:
        db.execute(
            insert(PrerequisiteCompletion).on_conflict_do_nothing(),
            [{"user_id": user.id, "prerequisite_id": i} for i in prereq_ids],
        )
    return max(past)
