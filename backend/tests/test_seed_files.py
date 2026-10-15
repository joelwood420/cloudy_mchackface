from app.seed.__main__ import DEFAULT_SEED_DIR
from app.seed.loader import load_seed_dir


def test_repo_seed_files_are_valid():
    seeds = load_seed_dir(DEFAULT_SEED_DIR)
    assert seeds, "expected at least one seed file"


def test_ccc602_has_portal_link():
    seeds = {s.module.key: s for s in load_seed_dir(DEFAULT_SEED_DIR)}
    assert str(seeds["ccc602"].module.uplearn_url) == "https://yoobee.uplearn.education/course/view.php?id=548"


def test_ccc602_covers_full_time_weeks_9_to_16():
    seeds = {s.module.key: s for s in load_seed_dir(DEFAULT_SEED_DIR)}
    ccc602 = seeds["ccc602"]
    assert [w.week_number for w in ccc602.weeks] == list(range(9, 17))
    assert all(w.tasks for w in ccc602.weeks), "every week should list at least one task"


def test_lab_notes_point_to_access_without_secrets():
    seeds = {s.module.key: s for s in load_seed_dir(DEFAULT_SEED_DIR)}
    tasks = {t.key: t for s in seeds.values() for w in s.weeks for t in w.tasks}
    assert "Teams tutor-only channel" in tasks["ccc602-w09-dp900-labs"].note
    assert "AWS Academy" in tasks["ccc602-w13-dea-lab-athena"].note
    assert "AWS Academy" in tasks["ccc603-w18-lab-kms"].note
    for t in tasks.values():
        assert t.note is None or not any(s in t.note.lower() for s in ("http", "calendly", "teams.microsoft"))
