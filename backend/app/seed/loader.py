from pathlib import Path

import yaml
from pydantic import ValidationError

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
