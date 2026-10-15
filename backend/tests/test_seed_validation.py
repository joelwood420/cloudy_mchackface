from pathlib import Path

import pytest

from app.seed.loader import SeedError, load_seed_dir

VALID = """\
module:
  key: ccc602
  code: CCC602
  title: Data Engineering in the Public Cloud
  order: 2
submodules:
  - key: ccc602-dp900
    code: DP-900
    title: Microsoft Azure Data Fundamentals
    uplearn_url: https://yoobee.uplearn.education/course/section.php?id=9001
    prerequisites:
      - azure-account
    weeks:
      - key: ccc602-w09
        week_number: 9
        title: "DP-900 Learning Paths 1–4 · Ngā pūkenga"
        tasks:
          - key: ccc602-w09-lp1
            title: Explore core data concepts
            type: learning_path
            external_url: https://learn.microsoft.com/en-us/training/paths/azure-data-fundamentals-explore-core-data-concepts/
      - key: ccc602-w10
        week_number: 10
        title: Empty week
assessments:
  - key: ccc602-a3
    title: "Assessment 3: Azure Practical Scenario Evaluation"
    due_date: 2026-10-25
    uplearn_url: https://yoobee.uplearn.education/course/section.php?id=9649
"""

PREREQS = """\
prerequisites:
  - key: azure-account
    title: Create an Azure free account
    note: Use a personal email
    external_url: https://azure.microsoft.com/free
"""

SECOND_SUBMODULE = """\
  - key: ccc602-dea
    code: DEA-C01
    title: AWS Data Engineer
    weeks:
      - key: ccc602-w13
        week_number: 13
        title: DEA week
"""


def write(dir: Path, name: str, text: str) -> None:
    (dir / name).write_bytes(text.encode("utf-8"))


def write_valid(dir: Path, module: str = VALID, prereqs: str | None = PREREQS) -> None:
    write(dir, "ccc602.yaml", module)
    if prereqs is not None:
        write(dir, "prerequisites.yaml", prereqs)


def problems(dir: Path) -> list[str]:
    with pytest.raises(SeedError) as exc:
        load_seed_dir(dir)
    return exc.value.problems


def with_second_submodule(text: str = SECOND_SUBMODULE) -> str:
    return VALID.replace("assessments:\n", text + "assessments:\n")


def test_valid_files_load_with_utf8_text(tmp_path):
    write_valid(tmp_path)
    bundle = load_seed_dir(tmp_path)
    [seed] = bundle.modules
    assert seed.module.key == "ccc602"
    assert seed.submodules[0].code == "DP-900"
    assert seed.submodules[0].prerequisites == ["azure-account"]
    assert seed.all_weeks()[0].title == "DP-900 Learning Paths 1–4 · Ngā pūkenga"
    assert seed.all_weeks()[1].tasks == []
    assert str(seed.assessments[0].due_date) == "2026-10-25"
    assert [p.key for p in bundle.prerequisites] == ["azure-account"]


def test_empty_directory_is_an_error(tmp_path):
    assert "no .yaml files" in problems(tmp_path)[0]


def test_prerequisites_file_alone_is_an_error(tmp_path):
    write(tmp_path, "prerequisites.yaml", PREREQS)
    assert "no module files" in problems(tmp_path)[0]


def test_duplicate_key_across_module_files_names_both_files(tmp_path):
    write_valid(tmp_path)
    write(tmp_path, "b.yaml", VALID.replace("key: ccc602\n", "key: other\n"))
    joined = "\n".join(problems(tmp_path))
    assert "duplicate key 'ccc602-w09'" in joined
    assert "ccc602.yaml" in joined and "b.yaml" in joined


def test_duplicate_key_across_prerequisites_and_a_module(tmp_path):
    write_valid(tmp_path, prereqs=PREREQS + "  - key: ccc602-dp900\n    title: Clash\n    external_url: https://x.test\n")
    joined = "\n".join(problems(tmp_path))
    assert "duplicate key 'ccc602-dp900'" in joined
    assert "prerequisites.yaml" in joined


def test_unknown_prerequisite_names_file_and_submodule(tmp_path):
    write_valid(tmp_path, module=VALID.replace("      - azure-account\n", "      - azure-acount\n"))
    assert any(
        p.startswith("ccc602.yaml: submodules.0.prerequisites") and "unknown prerequisite 'azure-acount'" in p
        for p in problems(tmp_path)
    )


def test_missing_prerequisites_file_makes_references_unknown(tmp_path):
    write_valid(tmp_path, prereqs=None)
    assert any("unknown prerequisite 'azure-account'" in p for p in problems(tmp_path))


def test_prerequisite_listed_twice_in_a_submodule_is_rejected(tmp_path):
    write_valid(tmp_path, module=VALID.replace("      - azure-account\n", "      - azure-account\n      - azure-account\n"))
    assert any("submodules.0" in p and "more than once" in p for p in problems(tmp_path))


def test_prerequisite_without_a_url_is_rejected(tmp_path):
    write_valid(tmp_path, prereqs=PREREQS.replace("    external_url: https://azure.microsoft.com/free\n", ""))
    assert any(
        p.startswith("prerequisites.yaml: prerequisites.0") and "external_url or uplearn_url" in p
        for p in problems(tmp_path)
    )


def test_submodule_weeks_must_be_consecutive(tmp_path):
    write_valid(tmp_path, module=VALID.replace("week_number: 10", "week_number: 12"))
    assert any(p.startswith("ccc602.yaml: submodules.0") and "consecutive" in p for p in problems(tmp_path))


def test_submodule_weeks_must_ascend(tmp_path):
    write_valid(tmp_path, module=VALID.replace("week_number: 10", "week_number: 8"))
    assert any("consecutive" in p for p in problems(tmp_path))


def test_week_number_used_twice_in_a_module_is_rejected(tmp_path):
    write_valid(tmp_path, module=with_second_submodule(SECOND_SUBMODULE.replace("week_number: 13", "week_number: 9")))
    assert any(p.startswith("ccc602.yaml") and "week_number 9" in p for p in problems(tmp_path))


def test_two_submodules_with_their_own_weeks_load(tmp_path):
    write_valid(tmp_path, module=with_second_submodule())
    [seed] = load_seed_dir(tmp_path).modules
    assert [w.week_number for w in seed.all_weeks()] == [9, 10, 13]


def test_two_modules_may_share_a_week_number(tmp_path):
    write_valid(tmp_path)
    write(tmp_path, "b.yaml", VALID.replace("key: ccc602", "key: other"))  # renames every key, keeps week numbers
    assert len(load_seed_dir(tmp_path).modules) == 2


def test_old_top_level_weeks_is_rejected(tmp_path):
    write_valid(tmp_path, module=VALID + "weeks: []\n")
    assert any(p.startswith("ccc602.yaml: weeks") for p in problems(tmp_path))


def test_bad_task_type_is_reported_with_file_and_location(tmp_path):
    write_valid(tmp_path, module=VALID.replace("type: learning_path", "type: video"))
    assert any(p.startswith("ccc602.yaml: submodules.0.weeks.0.tasks.0.type") for p in problems(tmp_path))


def test_task_without_any_url_is_rejected(tmp_path):
    text = VALID.replace(
        "            external_url: https://learn.microsoft.com/en-us/training/paths/azure-data-fundamentals-explore-core-data-concepts/\n",
        "",
    )
    write_valid(tmp_path, module=text)
    assert any("external_url or uplearn_url" in p for p in problems(tmp_path))


def test_bad_url_and_bad_key_are_rejected(tmp_path):
    text = VALID.replace("https://learn.microsoft.com", "not-a-url").replace("key: ccc602-w10", "key: CCC602 W10")
    write_valid(tmp_path, module=text)
    joined = "\n".join(problems(tmp_path))
    assert "external_url" in joined
    assert "submodules.0.weeks.1.key" in joined


def test_invalid_yaml_is_reported(tmp_path):
    write_valid(tmp_path)
    write(tmp_path, "broken.yaml", "module: [unclosed")
    assert any(p.startswith("broken.yaml: invalid YAML") for p in problems(tmp_path))


def test_unknown_field_is_rejected(tmp_path):
    write_valid(tmp_path, module=VALID.replace("  order: 2\n", "  order: 2\n  colour: red\n"))
    assert any("module.colour" in p for p in problems(tmp_path))


def test_task_note_is_optional_and_length_limited(tmp_path):
    with_note = VALID.replace(
        "            type: learning_path\n", "            type: learning_path\n            note: Use your personal email\n", 1
    )
    write_valid(tmp_path, module=with_note)
    [seed] = load_seed_dir(tmp_path).modules
    assert seed.all_weeks()[0].tasks[0].note == "Use your personal email"

    write_valid(tmp_path, module=with_note.replace("Use your personal email", "x" * 301))
    assert problems(tmp_path)


def test_titles_fit_their_columns(tmp_path):
    write_valid(tmp_path, module=VALID.replace("title: Empty week", "title: " + "w" * 201))
    assert any(p.startswith("ccc602.yaml: submodules.0.weeks.1.title") for p in problems(tmp_path))

    write_valid(tmp_path, module=VALID.replace("title: Data Engineering in the Public Cloud", "title: " + "m" * 201))
    assert any(p.startswith("ccc602.yaml: module.title") for p in problems(tmp_path))

    write_valid(tmp_path, module=VALID.replace("title: Microsoft Azure Data Fundamentals", "title: " + "s" * 301))
    assert any(p.startswith("ccc602.yaml: submodules.0.title") for p in problems(tmp_path))


def test_task_title_may_use_its_full_column(tmp_path):
    write_valid(tmp_path, module=VALID.replace("title: Explore core data concepts", "title: " + "t" * 300))
    [seed] = load_seed_dir(tmp_path).modules
    assert len(seed.all_weeks()[0].tasks[0].title) == 300


def test_url_longer_than_its_column_is_rejected(tmp_path):
    long_url = "https://learn.microsoft.com/" + "a" * 1000
    write_valid(tmp_path, module=VALID.replace(
        "https://learn.microsoft.com/en-us/training/paths/azure-data-fundamentals-explore-core-data-concepts/", long_url
    ))
    assert any("submodules.0.weeks.0.tasks.0.external_url" in p for p in problems(tmp_path))


def test_submodule_code_fits_its_column(tmp_path):
    write_valid(tmp_path, module=VALID.replace("code: DP-900", "code: " + "C" * 21))
    assert any(p.startswith("ccc602.yaml: submodules.0.code") for p in problems(tmp_path))
