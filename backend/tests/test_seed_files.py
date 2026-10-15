from app.seed.__main__ import DEFAULT_SEED_DIR
from app.seed.loader import load_seed_dir


def test_repo_seed_files_are_valid():
    seeds = load_seed_dir(DEFAULT_SEED_DIR)
    assert seeds, "expected at least one seed file"


def test_ccc602_covers_full_time_weeks_9_to_16():
    seeds = {s.module.key: s for s in load_seed_dir(DEFAULT_SEED_DIR)}
    ccc602 = seeds["ccc602"]
    assert [w.week_number for w in ccc602.weeks] == list(range(9, 17))
    assert all(w.tasks for w in ccc602.weeks), "every week should list at least one task"
