from pathlib import Path

import yaml
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Assessment, Module, Task, Week
from app.seed.schema import SeedFile


class SeedError(Exception):
    def __init__(self, problems: list[str]):
        self.problems = problems
        super().__init__("\n".join(problems))


def load_seed_dir(path: Path) -> list[SeedFile]:
    """Parse and validate every *.yaml file in `path`. Raises SeedError listing every problem."""
    files = sorted(path.glob("*.yaml"))
    if not files:
        raise SeedError([f"no .yaml files in {path}"])

    problems: list[str] = []
    parsed: list[tuple[str, SeedFile]] = []
    for file in files:
        try:
            data = yaml.safe_load(file.read_text(encoding="utf-8"))
            parsed.append((file.name, SeedFile.model_validate(data)))
        except yaml.YAMLError as e:
            problems.append(f"{file.name}: invalid YAML: {e}")
        except ValidationError as e:
            for err in e.errors():
                loc = ".".join(str(part) for part in err["loc"])
                problems.append(f"{file.name}: {loc}: {err['msg']}")

    seen: dict[str, str] = {}
    for name, seed in parsed:
        for key in seed.keys():
            if key in seen:
                problems.append(f"{name}: duplicate key '{key}' (also in {seen[key]})")
            else:
                seen[key] = name

    if problems:
        raise SeedError(problems)
    return [seed for _, seed in parsed]


def apply_seed(session: Session, seeds: list[SeedFile]) -> None:
    """Upsert all seed content by key and delete anything no longer in the seed files."""
    modules = {m.key: m for m in session.scalars(select(Module))}
    weeks = {w.key: w for w in session.scalars(select(Week))}
    tasks = {t.key: t for t in session.scalars(select(Task))}
    assessments = {a.key: a for a in session.scalars(select(Assessment))}
    kept: dict[str, set[str]] = {name: set() for name in ('modules', 'weeks', 'tasks', 'assessments')}

    for seed in seeds:
        sm = seed.module
        module = modules.get(sm.key) or Module(key=sm.key)
        module.code, module.title, module.position = sm.code, sm.title, sm.order
        module.uplearn_url = str(sm.uplearn_url) if sm.uplearn_url else None
        session.add(module)
        kept['modules'].add(sm.key)

        for w_pos, sw in enumerate(seed.weeks):
            week = weeks.get(sw.key) or Week(key=sw.key)
            session.add(week)
            week.module = module
            week.week_number, week.title, week.position = sw.week_number, sw.title, w_pos
            kept['weeks'].add(sw.key)

            for t_pos, st in enumerate(sw.tasks):
                task = tasks.get(st.key) or Task(key=st.key)
                session.add(task)
                task.week = week
                task.title, task.type, task.position = st.title, st.type, t_pos
                task.external_url = str(st.external_url) if st.external_url else None
                task.uplearn_url = str(st.uplearn_url) if st.uplearn_url else None
                task.note = st.note
                kept['tasks'].add(st.key)

        for sa in seed.assessments:
            assessment = assessments.get(sa.key) or Assessment(key=sa.key)
            session.add(assessment)
            assessment.module = module
            assessment.title, assessment.due_date = sa.title, sa.due_date
            assessment.uplearn_url = str(sa.uplearn_url) if sa.uplearn_url else None
            kept['assessments'].add(sa.key)

    session.flush()
    # Children of a deleted parent are removed by the parent's delete (ORM cascade + DB ON DELETE CASCADE),
    # so only delete objects whose parent is staying; each row is then deleted exactly once.
    doomed_modules = {k for k in modules if k not in kept["modules"]}
    doomed_weeks = {k for k, w in weeks.items() if k not in kept["weeks"] or w.module.key in doomed_modules}
    for key, task in tasks.items():
        if key not in kept["tasks"] and task.week.key not in doomed_weeks:
            session.delete(task)
    for key, assessment in assessments.items():
        if key not in kept["assessments"] and assessment.module.key not in doomed_modules:
            session.delete(assessment)
    for key, week in weeks.items():
        if key in doomed_weeks and week.module.key not in doomed_modules:
            session.delete(week)
    for key in doomed_modules:
        session.delete(modules[key])
    session.flush()
