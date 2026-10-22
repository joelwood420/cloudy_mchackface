"""Students often join mid-programme, or move intake. Tick off what's already behind them so This week starts clean.

Only ever adds ticks: anything the student already ticked stays, and nothing is unticked. The one exception is
reset_ticks, for accounts confirming their intake for the first time. Prerequisites (one-off setup steps) are
never pre-ticked: only the student knows whether they've made the account or accepted the invite."""

from datetime import date

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session, selectinload

from app.api.assessments import assessment_due
from app.models import Assessment, AssessmentSubmission, Intake, TaskCompletion, User, Week
from app.pacing import week_slots
from app.schedule import TeachingWeek, locate


def reset_ticks(db: Session, user: User) -> None:
    """Clear every task tick and assessment submission, so catch-up can start over for the intake just chosen.

    Used once, when an account made before intake choice (caught up against July FT) confirms its intake.
    Prerequisite ticks stay: they don't depend on the intake."""
    db.execute(delete(TaskCompletion).where(TaskCompletion.user_id == user.id))
    db.execute(delete(AssessmentSubmission).where(AssessmentSubmission.user_id == user.id))


def prefill_past_work(db: Session, user: User, intake: Intake, today: date) -> int | None:
    """Tick tasks in past weeks and mark past-due assessments submitted.

    Returns the last week counted as past, or None when nothing is past yet."""
    weeks = [TeachingWeek(w.week_number, w.starts_on) for w in intake.weeks]
    cutoff = locate(weeks, today).cutoff_week
    past = [w.week_number for w in weeks if cutoff is not None and w.week_number < cutoff]
    if not past:
        return None

    content = db.scalars(select(Week).options(selectinload(Week.tasks))).all()
    task_ids = list(dict.fromkeys(
        t.id for n, _, tasks in week_slots(intake.study_mode, content) if n < cutoff for t in tasks
    ))
    assessment_ids = [
        a.id for a in db.scalars(select(Assessment)) if (due := assessment_due(a, intake)) is not None and due < today
    ]
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
    return max(past)
