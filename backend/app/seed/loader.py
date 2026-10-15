from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

import yaml
from pydantic import BaseModel, ValidationError
from sqlalchemy import delete, insert, select
from sqlalchemy.orm import Session

from app.models import Assessment, Module, Prerequisite, Submodule, SubmodulePrerequisite, Task, Week
from app.seed.schema import SeedFile, SeedPrerequisite, SeedPrerequisiteFile

PREREQUISITES_FILE = "prerequisites.yaml"


class SeedError(Exception):
    def __init__(self, problems: list[str]):
        self.problems = problems
        super().__init__("\n".join(problems))


@dataclass
class SeedBundle:
    modules: list[SeedFile]
    prerequisites: list[SeedPrerequisite]


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
    module_files = [f for f in files if f.name != PREREQUISITES_FILE]
    if not module_files:
        raise SeedError([f"no module files in {path} (only {PREREQUISITES_FILE})"])

    problems: list[str] = []
    prereq_path = path / PREREQUISITES_FILE
    prereq_file: SeedPrerequisiteFile | None = None
    prereqs_ok = True
    if prereq_path.exists():
        prereq_file = _parse(prereq_path, SeedPrerequisiteFile, problems)
        prereqs_ok = prereq_file is not None
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
    if prereqs_ok:
        known = set(prereq_file.keys()) if prereq_file else set()
        for name, seed in modules:
            for i, sub in enumerate(seed.submodules):
                for key in sub.prerequisites:
                    if key not in known:
                        problems.append(
                            f"{name}: submodules.{i}.prerequisites: unknown prerequisite '{key}' "
                            f"(submodule {sub.key}; define it in {PREREQUISITES_FILE})"
                        )

    if problems:
        raise SeedError(problems)
    return SeedBundle([seed for _, seed in modules], prereq_file.prerequisites if prereq_file else [])


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
    for seed in seeds:
        sm = seed.module
        module = upsert(Module, sm.key)
        module.code, module.title, module.position = sm.code, sm.title, sm.order
        module.uplearn_url = _url(sm.uplearn_url)

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
            assessment.title, assessment.due_date = sa.title, sa.due_date
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
    session.flush()
    # Bulk deletes bypass the identity map; drop cached state so later reads see the database.
    session.expire_all()
