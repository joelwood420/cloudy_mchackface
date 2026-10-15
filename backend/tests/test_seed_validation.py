from pathlib import Path

import pytest

from app.seed.loader import SeedError, load_seed_dir

VALID = """\
module:
  key: ccc602
  code: CCC602
  title: Data Engineering in the Public Cloud
  order: 2
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


def write(dir: Path, name: str, text: str) -> None:
    (dir / name).write_bytes(text.encode("utf-8"))


def test_valid_file_loads_with_utf8_text(tmp_path):
    write(tmp_path, "ccc602.yaml", VALID)
    [seed] = load_seed_dir(tmp_path)
    assert seed.module.key == "ccc602"
    assert seed.weeks[0].title == "DP-900 Learning Paths 1–4 · Ngā pūkenga"
    assert seed.weeks[1].tasks == []
    assert str(seed.assessments[0].due_date) == "2026-10-25"


def test_empty_directory_is_an_error(tmp_path):
    with pytest.raises(SeedError) as exc:
        load_seed_dir(tmp_path)
    assert "no .yaml files" in exc.value.problems[0]


def test_duplicate_key_across_files_names_both_files(tmp_path):
    write(tmp_path, "a.yaml", VALID)
    write(tmp_path, "b.yaml", VALID.replace("key: ccc602\n", "key: other\n"))
    with pytest.raises(SeedError) as exc:
        load_seed_dir(tmp_path)
    joined = "\n".join(exc.value.problems)
    assert "duplicate key 'ccc602-w09'" in joined
    assert "a.yaml" in joined and "b.yaml" in joined


def test_bad_task_type_is_reported_with_file_and_location(tmp_path):
    write(tmp_path, "ccc602.yaml", VALID.replace("type: learning_path", "type: video"))
    with pytest.raises(SeedError) as exc:
        load_seed_dir(tmp_path)
    assert any(p.startswith("ccc602.yaml: weeks.0.tasks.0.type") for p in exc.value.problems)


def test_task_without_any_url_is_rejected(tmp_path):
    text = VALID.replace(
        "        external_url: https://learn.microsoft.com/en-us/training/paths/azure-data-fundamentals-explore-core-data-concepts/\n",
        "",
    )
    write(tmp_path, "ccc602.yaml", text)
    with pytest.raises(SeedError) as exc:
        load_seed_dir(tmp_path)
    assert any("external_url or uplearn_url" in p for p in exc.value.problems)


def test_bad_url_and_bad_key_are_rejected(tmp_path):
    text = VALID.replace("https://learn.microsoft.com", "not-a-url").replace("key: ccc602-w10", "key: CCC602 W10")
    write(tmp_path, "ccc602.yaml", text)
    with pytest.raises(SeedError) as exc:
        load_seed_dir(tmp_path)
    joined = "\n".join(exc.value.problems)
    assert "external_url" in joined
    assert "weeks.1.key" in joined


def test_invalid_yaml_is_reported(tmp_path):
    write(tmp_path, "broken.yaml", "module: [unclosed")
    with pytest.raises(SeedError) as exc:
        load_seed_dir(tmp_path)
    assert exc.value.problems[0].startswith("broken.yaml: invalid YAML")


def test_unknown_field_is_rejected(tmp_path):
    write(tmp_path, "ccc602.yaml", VALID.replace("  order: 2\n", "  order: 2\n  colour: red\n"))
    with pytest.raises(SeedError) as exc:
        load_seed_dir(tmp_path)
    assert any("module.colour" in p for p in exc.value.problems)
