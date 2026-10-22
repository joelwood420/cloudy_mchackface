from datetime import timedelta

from app.pacing import due_date
from app.schedule import TeachingWeek
from app.seed.__main__ import DEFAULT_SEED_DIR
from app.seed.loader import load_seed_dir
from tests.conftest import PT_2609_WEEKS, PT_WEEKS

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


def intakes():
    return {i.key: i for i in bundle().intakes}


def starts(key):
    return {w.week_number: w.starts_on for w in intakes()[key].weeks}


def test_there_are_four_intakes():
    assert set(intakes()) == {"2607-online-ccc-ft", "2607-online-ccc-pt", "2609-online-ccc-ft", "2609-online-ccc-pt"}
    assert {k: i.study_mode for k, i in intakes().items()} == {
        "2607-online-ccc-ft": "FT", "2607-online-ccc-pt": "PT", "2609-online-ccc-ft": "FT", "2609-online-ccc-pt": "PT",
    }


def test_2607_full_time_intake():
    weeks = starts("2607-online-ccc-ft")
    assert list(weeks) == list(range(1, 33))
    assert str(weeks[1]) == "2026-07-20" and str(weeks[32]) == "2027-04-19"


def test_2607_part_time_intake():
    pt, ft = starts("2607-online-ccc-pt"), starts("2607-online-ccc-ft")
    assert list(pt) == list(range(1, 65))
    assert all(pt[n] == ft[n] for n in range(1, 33))
    assert str(pt[33]) == "2027-04-26" and str(pt[64]) == "2028-01-24"
    assert [(n, d) for n, d in pt.items()] == PT_WEEKS


def test_2609_part_time_intake():
    pt = starts("2609-online-ccc-pt")
    assert list(pt) == list(range(1, 65))
    assert [str(pt[n]) for n in (1, 13, 25, 53, 64)] == ["2026-09-28", "2027-01-18", "2027-05-10", "2028-01-17", "2028-04-03"]
    assert [(n, d) for n, d in pt.items()] == PT_2609_WEEKS


def test_2609_full_time_intake():
    ft = starts("2609-online-ccc-ft")
    assert list(ft) == list(range(1, 33))
    assert [str(ft[n]) for n in (1, 13, 17, 25, 32)] == ["2026-09-28", "2027-01-18", "2027-03-01", "2027-05-10", "2027-06-28"]


def test_every_holiday_falls_inside_its_intake():
    for intake in bundle().intakes:
        first, last = intake.weeks[0].starts_on, intake.weeks[-1].starts_on + timedelta(days=6)
        assert intake.holidays, intake.key
        assert all(first <= h.day <= last for h in intake.holidays), intake.key


def test_assessments_get_the_official_dates_in_each_intake():
    assessments = {a.key: a for s in bundle().modules for a in s.assessments}
    official = {
        "2607-online-ccc-ft": ["2026-08-16", "2026-09-13", "2026-10-25", "2026-11-22", "2026-12-20", "2027-02-07", "2027-04-18", "2027-04-23"],
        "2609-online-ccc-pt": ["2026-11-22", "2027-02-14", "2027-04-25", "2027-07-04", "2027-09-12", "2027-11-21", "2028-03-26", "2028-04-07"],
    }
    for key, expected in official.items():
        intake = intakes()[key]
        weeks = [TeachingWeek(w.week_number, w.starts_on) for w in intake.weeks]
        got = [
            str(due_date(weeks, intake.study_mode, assessments[f"{m}-a{n}"].due_week, assessments[f"{m}-a{n}"].due_weekday))
            for n, m in zip(range(1, 9), ["ccc601"] * 2 + ["ccc602"] * 2 + ["ccc603"] * 2 + ["ccc604"] * 2)
        ]
        assert got == expected, key


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
