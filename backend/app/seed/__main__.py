import argparse
import sys
from pathlib import Path

from sqlalchemy.orm import Session

from app.seed.loader import SeedError, apply_seed, load_seed_dir

DEFAULT_SEED_DIR = Path(__file__).resolve().parents[3] / "seed"


def run(seed_dir: Path, session: Session) -> int:
    try:
        bundle = load_seed_dir(seed_dir)
    except SeedError as e:
        print("Seed validation failed; nothing was written:", file=sys.stderr)
        for problem in e.problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1
    apply_seed(session, bundle.modules, bundle.prerequisites)
    print(f"Seeded {len(bundle.modules)} module(s) and {len(bundle.prerequisites)} prerequisite(s) from {seed_dir}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.seed", description="Load seed YAML into the database.")
    parser.add_argument("seed_dir", nargs="?", default=str(DEFAULT_SEED_DIR))
    args = parser.parse_args(argv)

    from app.db import SessionLocal

    with SessionLocal.begin() as session:
        return run(Path(args.seed_dir), session)


if __name__ == "__main__":
    sys.exit(main())
