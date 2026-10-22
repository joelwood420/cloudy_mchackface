from dataclasses import asdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.assessments import assessment_due, assessment_out, submitted_ids
from app.api.modules import _done_prerequisite_ids, _done_task_ids, schedule_post_urls
from app.api.schemas import (
    AheadOut, AssessmentStatusOut, CurrentBreakOut, HolidayOut, LurkingTaskOut, LurkingWeekOut, NextWeekOut,
    PrerequisiteOut, StatsOut, SubmoduleRef, TaskOut, ThisWeekGroup, ThisWeekOut, UpcomingBreakOut, WeekOut,
    WeekSpanOut,
)
from app.auth.deps import current_user
from app.clock import today
from app.db import get_db
from app.models import Module, Submodule, SubmodulePrerequisite, Task, User, Week
from app.pacing import StudyMode, week_slots
from app.schedule import TeachingWeek, locate, upcoming_break

router = APIRouter(tags=["this-week"])

ASSESSMENT_WINDOW = timedelta(days=28)


def _group(
    mode: StudyMode, number: int, week: Week, tasks: list[Task], done: set[int], done_prereqs: set[int],
    posts: dict[tuple[int, int], str],
) -> ThisWeekGroup:
    """One module's slice of intake week `number`: the content week, cut down to the tasks that land in it."""
    week_out = WeekOut.model_validate(week).model_copy(
        update={
            # A PT content week shows up as two intake weeks; key them apart, like the module page does.
            "key": week.key if mode == "FT" else f"{week.key}-{number}",
            "week_number": number,
            "tasks": [TaskOut.model_validate(t) for t in tasks],
        }
    )
    for task, task_out in zip(tasks, week_out.tasks):
        task_out.done = task.id in done
    week_out.schedule_post_url = posts.get((week.module_id, number))
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
    posts = schedule_post_urls(db, user)

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
    slots = week_slots(intake.study_mode, content)

    def groups_for(number: int) -> list[ThisWeekGroup]:
        return [_group(intake.study_mode, n, w, tasks, done, done_prereqs, posts) for n, w, tasks in slots if n == number]

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
        for n, w, tasks in slots:
            if n < pos.cutoff_week:
                for task in tasks:
                    if task.id not in done:
                        lurking.setdefault(n, []).append(
                            LurkingTaskOut(
                                **TaskOut.model_validate(task).model_dump(), module_code=w.module.code,
                                submodule_code=w.submodule.code, submodule_uplearn_url=w.submodule.uplearn_url,
                                schedule_post_url=posts.get((w.module_id, n)),
                            )
                        )

    modules = db.scalars(select(Module).options(selectinload(Module.assessments)).order_by(Module.position)).all()
    dated = [(m, a, due) for m in modules for a in m.assessments if (due := assessment_due(a, intake)) is not None]
    shown = [
        AssessmentStatusOut(**assessment_out(a, submitted, today_, due).model_dump(), module_key=m.key, module_code=m.code)
        for m, a, due in dated
        if today_ <= due <= today_ + ASSESSMENT_WINDOW or (due < today_ and a.id not in submitted)
    ]
    position = {m.key: m.position for m in modules}
    shown.sort(key=lambda a: (a.due_date, position[a.module_key], a.title))
    upcoming = [(due - today_).days for _, a, due in dated if due >= today_ and a.id not in submitted]

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
