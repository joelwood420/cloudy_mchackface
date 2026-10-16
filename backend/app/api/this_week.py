from dataclasses import asdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.assessments import assessment_out, submitted_ids
from app.api.modules import _done_prerequisite_ids, _done_task_ids
from app.api.schemas import (
    AheadOut, AssessmentStatusOut, CurrentBreakOut, HolidayOut, LurkingTaskOut, LurkingWeekOut, NextWeekOut,
    PrerequisiteOut, StatsOut, SubmoduleRef, TaskOut, ThisWeekGroup, ThisWeekOut, UpcomingBreakOut, WeekOut,
    WeekSpanOut,
)
from app.auth.deps import current_user
from app.clock import today
from app.db import get_db
from app.models import Module, Submodule, SubmodulePrerequisite, User, Week
from app.schedule import TeachingWeek, locate, upcoming_break

router = APIRouter(tags=["this-week"])

ASSESSMENT_WINDOW = timedelta(days=28)


def _group(week: Week, done: set[int], done_prereqs: set[int]) -> ThisWeekGroup:
    week_out = WeekOut.model_validate(week)
    for task, task_out in zip(week.tasks, week_out.tasks):
        task_out.done = task.id in done
    m, s = week.module, week.submodule
    return ThisWeekGroup(
        module_key=m.key, module_code=m.code, module_title=m.title, module_uplearn_url=m.uplearn_url,
        submodule=SubmoduleRef.model_validate(s),
        week=week_out,
        prerequisites=[
            PrerequisiteOut.model_validate(link.prerequisite)
            for link in s.prerequisite_links
            if link.prerequisite_id not in done_prereqs
        ],
    )


@router.get("/this-week", response_model=ThisWeekOut)
def this_week(
    user: User = Depends(current_user), db: Session = Depends(get_db), today_: date = Depends(today)
) -> ThisWeekOut:
    intake = user.settings.intake
    weeks = [TeachingWeek(w.week_number, w.starts_on) for w in intake.weeks]
    pos = locate(weeks, today_)
    done, done_prereqs, submitted = _done_task_ids(db, user), _done_prerequisite_ids(db, user), submitted_ids(db, user)

    content = db.scalars(
        select(Week)
        .join(Module)
        .options(
            selectinload(Week.tasks),
            selectinload(Week.module),
            selectinload(Week.submodule)
            .selectinload(Submodule.prerequisite_links)
            .selectinload(SubmodulePrerequisite.prerequisite),
        )
        .order_by(Module.position, Week.position)
    ).all()

    def groups_for(number: int) -> list[ThisWeekGroup]:
        return [_group(w, done, done_prereqs) for w in content if w.week_number == number]

    groups = groups_for(pos.week.week_number) if pos.week else []
    tasks_now = [t for g in groups for t in g.week.tasks]

    ahead = None
    if pos.week and tasks_now and all(t.done for t in tasks_now):
        i = weeks.index(pos.week)
        if i + 1 < len(weeks):
            nxt = weeks[i + 1].week_number
            ahead = AheadOut(week_number=nxt, groups=groups_for(nxt))

    lurking: dict[int, list[LurkingTaskOut]] = {}
    if pos.cutoff_week is not None:
        for w in content:
            if w.week_number < pos.cutoff_week:
                for task in w.tasks:
                    if task.id not in done:
                        lurking.setdefault(w.week_number, []).append(
                            LurkingTaskOut(**TaskOut.model_validate(task).model_dump(), module_code=w.module.code)
                        )

    modules = db.scalars(select(Module).options(selectinload(Module.assessments)).order_by(Module.position)).all()
    shown = [
        AssessmentStatusOut(**assessment_out(a, submitted, today_).model_dump(), module_key=m.key, module_code=m.code)
        for m in modules
        for a in m.assessments
        if a.due_date is not None
        and (today_ <= a.due_date <= today_ + ASSESSMENT_WINDOW or (a.due_date < today_ and a.id not in submitted))
    ]
    position = {m.key: m.position for m in modules}
    shown.sort(key=lambda a: (a.due_date, position[a.module_key], a.title))
    upcoming = [
        (a.due_date - today_).days
        for m in modules
        for a in m.assessments
        if a.due_date is not None and a.due_date >= today_ and a.id not in submitted
    ]

    brk = upcoming_break(weeks, today_)
    return ThisWeekOut(
        today=today_,
        status=pos.status,
        week=WeekSpanOut(week_number=pos.week.week_number, starts_on=pos.week.starts_on, ends_on=pos.week.ends_on)
        if pos.week else None,
        current_break=CurrentBreakOut(
            starts_on=pos.brk.starts_on, ends_on=pos.brk.ends_on,
            week_of_break=pos.week_of_break, length_weeks=pos.brk.length_weeks,
        ) if pos.brk else None,
        next_week=NextWeekOut(week_number=pos.next_week.week_number, starts_on=pos.next_week.starts_on)
        if pos.next_week else None,
        upcoming_break=UpcomingBreakOut(**asdict(brk)) if brk else None,
        holidays=[
            HolidayOut.model_validate(h) for h in intake.holidays
            if pos.week and pos.week.starts_on <= h.day <= pos.week.ends_on
        ],
        groups=groups,
        ahead=ahead,
        lurking=[LurkingWeekOut(week_number=n, tasks=tasks) for n, tasks in sorted(lurking.items())],
        assessments=shown,
        stats=StatsOut(
            done=sum(1 for t in tasks_now if t.done), total=len(tasks_now),
            next_deadline_days=min(upcoming, default=None),
        ),
    )
