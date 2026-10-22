from app.seed.__main__ import DEFAULT_SEED_DIR
from app.seed.loader import load_seed_dir

FORBIDDEN_IN_NOTES = ("http", "calendly", "teams.microsoft", "zoom.us")


def bundle():
    return load_seed_dir(DEFAULT_SEED_DIR)


def modules():
    return {s.module.key: s for s in bundle().modules}


def test_repo_seed_files_are_valid():
    b = bundle()
    assert b.modules, "expected at least one module file"
    assert b.prerequisites, "expected seed/prerequisites.yaml"


def test_every_module_has_submodules():
    assert all(s.submodules for s in bundle().modules if s.module.key != "ccc604")


def test_ccc602_has_portal_link():
    assert str(modules()["ccc602"].module.uplearn_url) == "https://yoobee.uplearn.education/course/view.php?id=548"


def test_ccc602_covers_full_time_weeks_9_to_16():
    weeks = modules()["ccc602"].all_weeks()
    assert [w.week_number for w in weeks] == list(range(9, 17))
    assert all(w.tasks for w in weeks), "every week should list at least one task"


def test_notes_point_to_access_without_secrets():
    b = bundle()
    tasks = {t.key: t for s in b.modules for w in s.all_weeks() for t in w.tasks}
    prereqs = {p.key: p for p in b.prerequisites}
    assert "AWS Academy" in tasks["ccc602-w13-dea-lab-athena"].note
    assert "AWS Academy" in tasks["ccc603-w18-lab-kms"].note
    assert "Teams tutor-only channel" in prereqs["skillable-dp900"].note

    notes = [t.note for t in tasks.values()] + [p.note for p in prereqs.values()]
    for note in filter(None, notes):
        assert not any(s in note.lower() for s in FORBIDDEN_IN_NOTES), note


def test_schedule_is_the_2607_full_time_intake():
    [intake] = bundle().intakes
    assert intake.key == "2607-online-ccc-ft"
    assert [w.week_number for w in intake.weeks] == list(range(1, 33))
    assert str(intake.weeks[0].starts_on) == "2026-07-20" and str(intake.weeks[-1].starts_on) == "2027-04-19"


def test_ccc604_is_a_shell_with_its_two_deadlines():
    ccc604 = modules()["ccc604"]
    assert ccc604.submodules == []
    assert [a.key for a in ccc604.assessments] == ["ccc604-a7", "ccc604-a8"]


def test_assessments_are_due_by_content_week():
    due = {a.key: (a.due_week, a.due_weekday) for s in bundle().modules for a in s.assessments}
    assert due == {
        "ccc601-a1": (4, 6), "ccc601-a2": (8, 6), "ccc602-a3": (12, 6), "ccc602-a4": (16, 6),
        "ccc603-a5": (20, 6), "ccc603-a6": (24, 6), "ccc604-a7": (31, 6), "ccc604-a8": (32, 4),
    }


def test_every_seeded_week_links_its_ft_schedule_post():
    for key in ("ccc601", "ccc602", "ccc603"):
        seed = modules()[key]
        posts = {p.week_number for p in seed.schedule_posts if p.study_mode == "FT"}
        assert posts == {w.week_number for w in seed.all_weeks()}, key
        assert all(str(p.url).startswith("https://yoobee.uplearn.education/mod/forum/discuss.php?d=") for p in seed.schedule_posts)
