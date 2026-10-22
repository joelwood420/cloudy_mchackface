from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

import yaml
from pydantic import BaseModel, ValidationError
from sqlalchemy import delete, insert, select
from sqlalchemy.orm import Session

from app.models import (
    Assessment,
    Intake,
    IntakeHoliday,
    IntakeWeek,
    Module,
    Prerequisite,
    SchedulePost,
    Submodule,
    SubmodulePrerequisite,
    Task,
    UserSettings,
    Week,
)
from app.pacing import intake_weeks
from app.seed.schema import SeedFile, SeedIntake, SeedPrerequisite, SeedPrerequisiteFile, SeedScheduleFile

PREREQUISITES_FILE = "prerequisites.yaml"
SCHEDULE_FILE = "schedule.yaml"


class SeedError(Exception):
    def __init__(self, problems: list[str]):
        self.problems = problems
        super().__init__("\n".join(problems))


@dataclass
class SeedBundle:
    modules: list[SeedFile]
    prerequisites: list[SeedPrerequisite]
    intakes: list[SeedIntake]


def _parse(file: Path, schema: type[BaseModel], problems: list[str]) -> BaseModel | None:
    try:
        return schema.model_validate(yaml.safe_load(file.read_text(encoding="utf-8")))
    except yaml.YAMLError as e:
        problems.append(f"{file.name}: invalid YAML: {e}")
    except ValidationError as e:
        for err in e.errors():
            loc = ".".join(str(part) for part in err["loc"])
            problems.append(f"{file.name}: {loc}: {err['msg']}")
    return None


def load_seed_dir(path: Path) -> SeedBundle:
    """Parse and validate seed/prerequisites.yaml and every module file in `path`.

    Raises SeedError listing every problem, so nothing is written unless everything is valid."""
    files = sorted(path.glob("*.yaml"))
    if not files:
        raise SeedError([f"no .yaml files in {path}"])
    module_files = [f for f in files if f.name not in (PREREQUISITES_FILE, SCHEDULE_FILE)]
    if not module_files:
        raise SeedError([f"no module files in {path}"])

    # Required: without it every prerequisite (and anything per-user pointing at one) would be deleted.
    prereq_path = path / PREREQUISITES_FILE
    if not prereq_path.exists():
        raise SeedError([f"{PREREQUISITES_FILE}: file not found in {path}"])

    schedule_path = path / SCHEDULE_FILE
    if not schedule_path.exists():
        raise SeedError([f"{SCHEDULE_FILE}: file not found in {path}"])

    problems: list[str] = []
    prereq_file = _parse(prereq_path, SeedPrerequisiteFile, problems)
    schedule = _parse(schedule_path, SeedScheduleFile, problems)
    modules = [(f.name, seed) for f in module_files if (seed := _parse(f, SeedFile, problems)) is not None]

    named: list[tuple[str, SeedFile | SeedPrerequisiteFile]] = list(modules)
    if prereq_file is not None:
        named.insert(0, (PREREQUISITES_FILE, prereq_file))
    seen: dict[str, str] = {}
    for name, seed in named:
        for key in seed.keys():
            if key in seen:
                problems.append(f"{name}: duplicate key '{key}' (also in {seen[key]})")
            else:
                seen[key] = name

    # Only check references when the prerequisites file itself was readable; otherwise every one would fail.
    if prereq_file is not None:
        known = set(prereq_file.keys())
        for name, seed in modules:
            for i, sub in enumerate(seed.submodules):
                for key in sub.prerequisites:
                    if key not in known:
                        problems.append(
                            f"{name}: submodules.{i}.prerequisites: unknown prerequisite '{key}' "
                            f"(submodule {sub.key}; define it in {PREREQUISITES_FILE})"
                        )

    if schedule is not None:
        for name, seed in modules:
            for week in seed.all_weeks():
                for si in schedule.intakes:
                    have = {w.week_number for w in si.weeks}
                    if not set(intake_weeks(si.study_mode, week.week_number)) <= have:
                        problems.append(
                            f"{name}: week {week.week_number} ({week.key}) has no dates in intake {si.key} ({SCHEDULE_FILE})"
                        )
        # Content weeks the shortest intake covers: a PT intake takes two of its weeks per content week.
        last = min(len(si.weeks) // (1 if si.study_mode == "FT" else 2) for si in schedule.intakes)
        for name, seed in modules:
            for a in seed.assessments:
                if a.due_week is not None and a.due_week > last:
                    problems.append(
                        f"{name}: assessment {a.key}: due_week {a.due_week} is past week {last}, "
                        f"the last week of the shortest intake ({SCHEDULE_FILE})"
                    )

    if problems:
        raise SeedError(problems)
    return SeedBundle(
        [seed for _, seed in modules],
        prereq_file.prerequisites if prereq_file else [],
        schedule.intakes if schedule else [],
    )


def apply_schedule(session: Session, intakes: Sequence[SeedIntake]) -> None:
    """Upsert intakes by key and rewrite their weeks and holidays. Refuses, before writing anything,
    to drop an intake that users are on."""
    wanted = {si.key for si in intakes}
    in_use = session.scalars(
        select(Intake.key).join(UserSettings, UserSettings.intake_id == Intake.id).where(Intake.key.not_in(wanted)).distinct()
    ).all()
    if in_use:
        raise SeedError(
            [f"{SCHEDULE_FILE}: intake '{key}' is missing but users are on it; keep it in the file" for key in sorted(in_use)]
        )

    existing = {row.key: row for row in session.scalars(select(Intake))}
    rows = []
    for si in intakes:
        row = existing.get(si.key)
        if row is None:
            row = Intake(key=si.key)
            session.add(row)
        row.title, row.study_mode = si.title, si.study_mode
        rows.append((row, si))
    session.flush()

    # Weeks and holidays carry no per-user data: delete and re-insert, so the same primary key never clashes.
    ids = [row.id for row, _ in rows]
    session.execute(delete(IntakeWeek).where(IntakeWeek.intake_id.in_(ids)))
    session.execute(delete(IntakeHoliday).where(IntakeHoliday.intake_id.in_(ids)))
    weeks = [{"intake_id": row.id, "week_number": w.week_number, "starts_on": w.starts_on} for row, si in rows for w in si.weeks]
    holidays = [{"intake_id": row.id, "day": h.day, "name": h.name} for row, si in rows for h in si.holidays]
    if weeks:
        session.execute(insert(IntakeWeek), weeks)
    if holidays:
        session.execute(insert(IntakeHoliday), holidays)
    session.execute(delete(Intake).where(Intake.key.not_in(list(wanted))).execution_options(synchronize_session=False))
    session.flush()
    session.expire_all()


def _url(value) -> str | None:
    return str(value) if value else None


def apply_seed(session: Session, seeds: list[SeedFile], prerequisites: Sequence[SeedPrerequisite] = ()) -> None:
    """Upsert all seed content by key, then delete anything no longer in the seed files.

    Rows keep their ids across re-seeds, so anything per-user that points at a task or prerequisite survives."""
    models = (Prerequisite, Module, Submodule, Week, Task, Assessment)
    existing = {model: {row.key: row for row in session.scalars(select(model))} for model in models}
    kept: dict[type, set[str]] = {model: set() for model in models}

    def upsert(model, key):
        row = existing[model].get(key)
        if row is None:
            row = existing[model][key] = model(key=key)
            session.add(row)
        kept[model].add(key)
        return row

    for sp in prerequisites:
        prereq = upsert(Prerequisite, sp.key)
        prereq.title, prereq.note = sp.title, sp.note
        prereq.external_url, prereq.uplearn_url = _url(sp.external_url), _url(sp.uplearn_url)

    wanted_links: list[tuple[Submodule, str, int]] = []
    wanted_posts: list[tuple[Module, SeedFile]] = []
    for seed in seeds:
        sm = seed.module
        module = upsert(Module, sm.key)
        module.code, module.title, module.position = sm.code, sm.title, sm.order
        module.uplearn_url = _url(sm.uplearn_url)
        wanted_posts.append((module, seed))

        week_position = 0  # module-wide, so the flat week list comes out in submodule order
        for s_pos, ss in enumerate(seed.submodules):
            submodule = upsert(Submodule, ss.key)
            submodule.module = module
            submodule.code, submodule.title, submodule.position = ss.code, ss.title, s_pos
            submodule.uplearn_url = _url(ss.uplearn_url)
            wanted_links += [(submodule, key, pos) for pos, key in enumerate(ss.prerequisites)]

            for sw in ss.weeks:
                week = upsert(Week, sw.key)
                week.module, week.submodule = module, submodule
                week.week_number, week.title, week.position = sw.week_number, sw.title, week_position
                week_position += 1

                for t_pos, st in enumerate(sw.tasks):
                    task = upsert(Task, st.key)
                    task.week = week
                    task.title, task.type, task.position = st.title, st.type, t_pos
                    task.external_url, task.uplearn_url = _url(st.external_url), _url(st.uplearn_url)
                    task.note = st.note

        for sa in seed.assessments:
            assessment = upsert(Assessment, sa.key)
            assessment.module = module
            assessment.title, assessment.due_week, assessment.due_weekday = sa.title, sa.due_week, sa.due_weekday
            assessment.uplearn_url = _url(sa.uplearn_url)

    session.flush()

    # One statement per table: rows under a removed parent go with it via ON DELETE CASCADE.
    for model in (Module, Submodule, Week, Task, Assessment, Prerequisite):
        session.execute(
            delete(model).where(model.key.not_in(list(kept[model]))).execution_options(synchronize_session=False)
        )

    # Links carry no per-user data, so rebuild them from the seed files every time.
    session.execute(delete(SubmodulePrerequisite))
    rows = [
        {"submodule_id": sub.id, "prerequisite_id": existing[Prerequisite][key].id, "position": pos}
        for sub, key, pos in wanted_links
    ]
    if rows:
        session.execute(insert(SubmodulePrerequisite), rows)

    # Schedule posts are links only, with no per-user data: rebuild them the same way.
    session.execute(delete(SchedulePost))
    posts = [
        {"module_id": module.id, "study_mode": p.study_mode, "week_number": p.week_number, "url": str(p.url)}
        for module, seed in wanted_posts
        for p in seed.schedule_posts
    ]
    if posts:
        session.execute(insert(SchedulePost), posts)
    session.flush()
    # Bulk deletes bypass the identity map; drop cached state so later reads see the database.
    session.expire_all()
