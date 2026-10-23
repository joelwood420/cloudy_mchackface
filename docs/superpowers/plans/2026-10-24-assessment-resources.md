# Assessment Resources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each assessment carries a list of links (tutor recordings, code and data, tools, submitting), shown in full on the Assessments page and cut down to the current tasks on This week.

**Architecture:** Resources are seed reference data under each assessment (plus shared ones in `seed/resources.yaml`, expanded to one row per assessment at load time). `assessment_step` tasks link to their assessment and task number; a pure function picks which resources belong in a This week slot, so PT splitting falls out of the existing `week_slots`. The frontend renders one shared resource-columns component in a This week box, the assessments rail and the Assessments page.

**Tech Stack:** FastAPI, SQLAlchemy 2, Alembic, Pydantic, pytest (Postgres); React + Vite + TypeScript, TanStack Query, vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-24-assessment-resources-design.md`

## Global Constraints

- Work on branch `feat/assessment-resources` cut from `dev`; merge back into `dev` only when the owner asks. Never touch `main`.
- Links only. Never copy brief/rubric/handout text or link a file attachment (PDF/DOCX). Never store Teams/Calendly/Zoom links or training keys.
- Resource groups, exactly: `recording`, `code_data`, `tool`, `submitting`. UI labels: "Tutor recordings", "Code and data", "Tools", "Submitting".
- Resources have no ticks and never affect progress.
- Keys follow the seed key pattern `^[a-z0-9]+(-[a-z0-9]+)*$`, max 100; shared resources expand to key `<assessment-key>--<shared-key>` (double hyphen is outside the seed pattern on purpose, so it can't clash with a hand-written key; the DB column allows it).
- Mid-work, run only the tests for touched files (owner preference); the full suite runs once at the end. Local test DB: Docker `cloudy-test-pg` on port 55432 via `TEST_DATABASE_URL`.

## Review Focus

1. A PT half-week holding only "Watch the Assessment 3 tutor demo recordings" (no task number): the box must still list every A3 recording, not just untagged ones. (Task 4 test `test_box_shows_all_for_watch_step`.)
2. "All A3 resources →" when A3 is already ticked as submitted: the Assessments page hides submitted rows, so the link must open the Submitted list and the row's resources. (Task 7 test `opens a submitted assessment from the hash`.)
3. Re-seeding twice, or removing a shared resource from `resources.yaml`: rows must not duplicate and the removed one must disappear from every assessment. (Task 3 test `test_shared_resources_rerun_and_removal`.)
4. A slot whose steps belong to an assessment with no non-`submitting` resources (e.g. A7/A8, which only get the shared submitting links): no empty box. (Task 4 test `test_no_box_without_resources`.)
5. A seed typo: `tasks: [6]` on an A3 resource when A3 has no Task 6, or `assessment:` on a `lab` task. The loader must refuse with a clear message rather than silently showing nothing. (Task 2 tests.)

---

### Task 1: Database model and migration

**Files:**
- Modify: `backend/app/models.py` (Task, Assessment; new AssessmentResource)
- Create: `backend/alembic/versions/0012_assessment_resources.py`
- Modify: `.gitignore` (add `.superpowers/`), `CLAUDE.md` (migration note)
- Test: `backend/tests/test_migrations.py`, `backend/tests/test_models.py`

**Interfaces:**
- Produces:
  - `class AssessmentResource(Base)`, table `assessment_resources`: `id`, `key: str` (String(203), unique — room for `<100>--<100>`), `assessment_id` (FK assessments.id, ondelete CASCADE, index), `title: str` (String(300)), `url: str` (String(1000)), `group: str` (String(20), CheckConstraint `"group" IN ('recording','code_data','tool','submitting')` named `group`), `tasks: list[int]` (`ARRAY(SmallInteger)`, not null, server_default `'{}'`), `position: int`.
  - `Assessment.resources: Mapped[list[AssessmentResource]]` relationship, `order_by=AssessmentResource.position`, cascade delete-orphan, passive_deletes.
  - `Task.assessment_id: int | None` (FK assessments.id, ondelete SET NULL, index), `Task.assessment_task: int | None` (SmallInteger), `Task.shows_all_resources: bool` (not null, server_default false), `Task.assessment: Mapped[Assessment | None]` relationship, and property `Task.assessment_key -> str | None`.

- [ ] **Step 1: Write the failing tests**
  - `test_migrations.py`: extend the existing constraint assertion with `assert "assessment_resources_group_check" in checks`.
  - `test_models.py::test_assessment_resource_cascades`: add an Assessment with two resources (positions 1, 0), flush, assert `[r.key for r in a.resources]` is in position order; delete the assessment, assert no `AssessmentResource` rows remain.
  - `test_models.py::test_task_assessment_link_nulls_on_delete`: a Task with `assessment=a, assessment_task=3`; `t.assessment_key == a.key`; delete `a`, refresh, `t.assessment_id is None`.
- [ ] **Step 2: Run** `uv run pytest tests/test_migrations.py tests/test_models.py -v` → FAIL (no table / attribute).
- [ ] **Step 3: Implement** the model changes and migration `0012` (`down_revision = "0011"`), mirroring `0009`'s style; downgrade drops the table and the three task columns.
- [ ] **Step 4: Run** the same tests and `uv run alembic check` → PASS / "No new upgrade operations detected".
- [ ] **Step 5:** Add `.superpowers/` to `.gitignore`; add to CLAUDE.md's Commands bullets: "Migration 0012 adds assessment resources and links assessment steps to their assessment; re-run the seed loader after upgrading."
- [ ] **Step 6: Commit** `feat: assessment resources table and task→assessment link`

### Task 2: Seed schema and validation

**Files:**
- Modify: `backend/app/seed/schema.py`
- Modify: `backend/app/seed/loader.py` (`load_seed_dir`: new optional file, cross-file checks)
- Test: `backend/tests/test_seed_validation.py`

**Interfaces:**
- Produces (schema.py):
  - `ResourceGroup = Literal["recording", "code_data", "tool", "submitting"]`
  - `class SeedResource(_Strict)`: `key: Key`, `title: Title`, `group: ResourceGroup`, `url: Url`, `tasks: list[int] = []` (each ≥ 1, no duplicates).
  - `SeedAssessment.resources: list[SeedResource] = []`
  - `SeedTask` gains `assessment: Key | None = None`, `assessment_task: int | None = Field(default=None, ge=1)`, `shows_all_resources: bool = False`; validator: all three only allowed when `type == "assessment_step"`; `assessment_task`/`shows_all_resources` need `assessment`.
  - `class SeedSharedResource(_Strict)`: `key: Key`, `title`, `group`, `url`, `assessments: Literal["all"] | list[Key]`.
  - `class SeedResourceFile(_Strict)`: `resources: list[SeedSharedResource] = []`, `keys()`.
  - `SeedFile.keys()` also returns every resource key; `SeedBundle` gains `shared_resources: list[SeedSharedResource]`.
  - loader: `RESOURCES_FILE = "resources.yaml"` (optional; excluded from module files like the other two).
- Cross-file checks in `load_seed_dir` (add to `problems`, same message style as existing ones):
  - a task's `assessment` must be an assessment key in **the same module file**;
  - every number in a resource's `tasks` must equal some `assessment_task` of a step linked to that assessment (Review Focus 5) — message `"{file}: assessment {key}: resource {rkey} is tagged task {n}, but no step has assessment_task {n}"`;
  - a shared resource's assessment keys must exist in some module file;
  - shared resource keys must not clash with each other.

- [ ] **Step 1: Write failing tests** in `test_seed_validation.py`, building on the existing `VALID` YAML (add an `assessment_step` task linked to `ccc602-a3` with `assessment_task: 1`, and an A3 resource tagged `[1]`):
  - `test_valid_resources_load`: bundle loads; `bundle.modules[0].assessments[0].resources[0].tasks == [1]`.
  - `test_resource_task_without_step_is_rejected`: tag `[6]` → `SeedError` whose problems contain `"tagged task 6"`.
  - `test_assessment_on_non_step_task_is_rejected`: `assessment:` on a `learning_path` → error mentioning `assessment_step`.
  - `test_unknown_assessment_on_step_is_rejected`: `assessment: ccc602-a9` → error mentioning `ccc602-a9`.
  - `test_shared_resource_unknown_assessment_is_rejected` and `test_resources_file_is_optional` (no `resources.yaml` → loads, `shared_resources == []`).
- [ ] **Step 2: Run** `uv run pytest tests/test_seed_validation.py -v` → new tests FAIL.
- [ ] **Step 3: Implement** the schema classes and checks above.
- [ ] **Step 4: Run** the same file → PASS.
- [ ] **Step 5: Commit** `feat: seed schema for assessment resources`

### Task 3: Seed loader writes resources and step links

**Files:**
- Modify: `backend/app/seed/loader.py` (`apply_seed`), `backend/app/seed/__main__.py` (pass `bundle.shared_resources`)
- Test: `backend/tests/test_seed_apply.py`

**Interfaces:**
- Consumes: Task 1 model, Task 2 schema.
- Produces: `apply_seed(session, seeds, prerequisites=(), shared_resources: Sequence[SeedSharedResource] = ())`.
  - Per assessment: its own resources first (positions 0..n-1 in file order), then shared resources that apply (`"all"` or listing its key) in `resources.yaml` order, keyed `<assessment-key>--<shared-key>`.
  - `AssessmentResource` joins the upsert/`kept`/delete-not-kept loop like the other models.
  - Tasks: after assessments are upserted, set `task.assessment` from `st.assessment` (lookup via `existing[Assessment]`), plus `assessment_task`, `shows_all_resources`. Steps whose assessment is removed fall back to NULL via the FK.

- [ ] **Step 1: Write failing tests:**
  - `test_resources_and_step_links_are_written`: apply a seed with one A3 own resource + shared `all` resource; assert A3 has keys `["ccc602-a3-repo", "ccc602-a3--submission-format"]` in order and the step task's `assessment_key == "ccc602-a3"`, `assessment_task == 1`.
  - `test_shared_resources_rerun_and_removal` (Review Focus 3): apply twice → same row count and ids; apply again with the shared resource removed → no row with key ending `--submission-format`.
  - `test_shared_resource_listed_assessments_only`: shared with `assessments: [ccc602-a3]` doesn't appear on `ccc602-a4`.
- [ ] **Step 2: Run** `uv run pytest tests/test_seed_apply.py -v` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same file plus `tests/test_seed_files.py` → PASS.
- [ ] **Step 5: Commit** `feat: seed loader writes assessment resources`

### Task 4: API: resources on assessments, boxes on This week

**Files:**
- Create: `backend/app/resources.py` (pure selection logic)
- Modify: `backend/app/api/schemas.py`, `backend/app/api/assessments.py`, `backend/app/api/this_week.py`, `backend/app/api/modules.py` (eager loads only)
- Test: `backend/tests/test_resources.py` (pure), `backend/tests/test_this_week_api.py`, `backend/tests/test_assessments_api.py`

**Interfaces:**
- Produces (schemas.py):
  - `class ResourceOut(_Out)`: `key: str`, `title: str`, `url: str`, `group: str`, `tasks: list[int]`.
  - `AssessmentOut.resources: list[ResourceOut] = []` (filled in `assessment_out`, so `/api/assessments`, module page and both rails get it).
  - `TaskOut` gains `assessment_key: str | None = None`, `assessment_task: int | None = None`.
  - `class ResourceBoxOut(BaseModel)`: `assessment_key: str`, `assessment_short: str`, `task_numbers: list[int]`, `resources: list[ResourceOut]`.
  - `ThisWeekGroup.assessment_resources: list[ResourceBoxOut] = []`.
- Produces (resources.py):
  - `assessment_short(title: str) -> str`: `"Assessment 3: Azure…"` → `"A3"`; no `Assessment N` prefix → the title unchanged.
  - `resource_boxes(tasks: Sequence[Task]) -> list[ResourceBoxOut]`: for each distinct linked assessment among `tasks` with `type == "assessment_step"`, in first-appearance order: `task_numbers` = sorted distinct `assessment_task`s in the slot; resources = if any step for it has `shows_all_resources`, all non-`submitting`; else non-`submitting` ones whose `tasks` is empty or intersects `task_numbers`; keep `position` order; skip the box if no resources remain (Review Focus 4).
- `this_week.py`: `_group(..., with_resources: bool)`; `True` for the current week's groups, `False` for `ahead`. Eager-load `Week.tasks → Task.assessment → Assessment.resources`; also `Module.assessments → Assessment.resources` in all three assessment queries.

- [ ] **Step 1: Write failing tests:**
  - `test_resources.py` (build ORM objects in memory, no DB): `test_assessment_short` (`"Assessment 3: X"`→`"A3"`, `"Project"`→`"Project"`); `test_box_filters_by_slot_tasks` (A3 resources tagged [3], [4], [5], untagged, and a submitting one; slot with T3+T4 steps → keys tagged 3, 4 and untagged, `task_numbers == [3, 4]`, no submitting); `test_box_shows_all_for_watch_step` (Review Focus 1: slot holding only a `shows_all_resources` step → every non-submitting resource, `task_numbers == []`); `test_no_box_without_resources` (Review Focus 4); `test_two_assessments_two_boxes_in_order`.
  - `test_this_week_api.py::test_resource_box_in_current_week_only`: extend `content` with A3 resources and link `t11a` as A3 step T3 → week 11 group has one box with `assessment_short == "A3"`; `ahead` groups (when all done) have `assessment_resources == []`.
  - `test_this_week_api.py::test_pt_half_weeks_split_the_box`: PT intake (`PT_WEEKS`), content week 11 with steps T3, T4 → intake week 21 box has `task_numbers == [3]` and only T3 + untagged resources; week 22 has `[4]`.
  - `test_assessments_api.py::test_assessments_include_resources`: resources in position order with `group` and `tasks`.
- [ ] **Step 2: Run** `uv run pytest tests/test_resources.py tests/test_this_week_api.py tests/test_assessments_api.py -v` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same plus `tests/test_modules_api.py` → PASS.
- [ ] **Step 5: Commit** `feat: assessment resources in the API and This week boxes`

### Task 5: Seed content

**Files:**
- Modify: `seed/ccc601.yaml`, `seed/ccc602.yaml`, `seed/ccc603.yaml`
- Create: `seed/resources.yaml`
- Modify: `docs/portal-extras.md` (any URLs found on the portal)
- Test: `backend/tests/test_seed_files.py`

**Interfaces:**
- Consumes: Task 2 schema.

- [ ] **Step 1: Write failing tests** in `test_seed_files.py`:
  - `test_every_assessment_step_is_linked`: every `assessment_step` task in ccc601–603 has `assessment`; every title matching `Task (\d+) of Assessment` has `assessment_task` equal to that number; `ccc602-w10-a3-demo` and `ccc602-w13-a4-intro` have `shows_all_resources`.
  - `test_a3_recordings_tagged_by_task`: A3 resource URLs for d=48939 tagged `[3]`, d=48940–48942 tagged `[4]`, d=48943–48945 tagged `[5]`.
  - `test_resources_are_links_not_files`: no resource URL (own or shared) ends in `.pdf`, `.docx`, `.pptx` or contains `pluginfile.php`, `calendly`, `teams.microsoft`, `zoom.us`.
  - `test_shared_submitting_on_every_assessment`: `resources.yaml` has the submission-format post (`discuss.php?d=49398`) and the Kāpehu hub with `assessments: all`.
- [ ] **Step 2: Run** `uv run pytest tests/test_seed_files.py -v` → FAIL.
- [ ] **Step 3: Link every `assessment_step`** (`assessment`, `assessment_task` from the title's Task N, `shows_all_resources` on the two watch steps).
- [ ] **Step 4: Write `seed/resources.yaml`**: submission format (`submitting`, all), Kāpehu special consideration (`submitting`, all), diagram tools diagrams.net/draw.io, Lucid, Cloudcraft, Sketch (`tool`, A1 A4 A5 A6), AWS architecture icons (`tool`, A1 A4 A5 A6), Azure architecture icons (`tool`, A2 A3).
- [ ] **Step 5: Look up missing UPLearn URLs** in the owner's logged-in Chrome (owner OK'd; a handful of page visits, no scraping, read only what's needed): DP-900 tile recordings (section 9656), 00A Digital Skills screen-recording guides (section 18346), any referencing/APA page in 00A. Record each post/page URL in `docs/portal-extras.md`. Skip anything that's a file attachment.
- [ ] **Step 6: Add per-assessment resources** from `docs/portal-extras.md` per the spec's "Initial per-assessment content" list (A1–A6), tagging by task where the source says which task.
- [ ] **Step 7: Run** `uv run pytest tests/test_seed_files.py -v` and `uv run python -m app.seed` against the dev DB → PASS / loads cleanly.
- [ ] **Step 8: Commit** `content: assessment resources for A1–A6`

### Task 6: Frontend: types, resource columns, This week box, rail links

**Files:**
- Modify: `frontend/src/api.ts`
- Create: `frontend/src/components/ResourceColumns.tsx`, `frontend/src/components/thisweek/ResourceBox.tsx`
- Modify: `frontend/src/components/thisweek/WeekGroups.tsx`, `frontend/src/components/AssessmentsRail.tsx`, `frontend/src/index.css`
- Test: `frontend/src/components/thisweek/ResourceBox.test.tsx`, `frontend/src/components/AssessmentsRail.test.tsx`

**Interfaces:**
- Produces (api.ts): `type ResourceGroup = 'recording' | 'code_data' | 'tool' | 'submitting'`; `interface Resource { key; title; url; group: ResourceGroup; tasks: number[] }`; `Assessment.resources: Resource[]`; `Task.assessment_key: string | null`, `Task.assessment_task: number | null`; `interface ResourceBox { assessment_key; assessment_short; task_numbers: number[]; resources: Resource[] }`; `ThisWeekGroup.assessment_resources: ResourceBox[]`.
- Produces: `ResourceColumns({ resources, groups }: { resources: Resource[]; groups: ResourceGroup[] })` — one column per group that has resources, heading from the label map in Global Constraints, each link through `ExternalLink` (UPLearn URLs labelled via `uplearnLabel`), followed by its task label (`"T3"`, `"T3, T4"`) when `tasks` is non-empty.
- Produces: `resourceBoxHeading(short: string, numbers: number[]): string` — `[]` → `"What you need for A3"`, `[3]` → `"What you need for A3 Task 3"`, `[3, 4]` → `"What you need for A3 Tasks 3 and 4"`, `[2, 3, 4]` → `"…Tasks 2, 3 and 4"`.
- `ResourceBox` renders heading, `ResourceColumns` with `['recording', 'code_data', 'tool']`, and a router `Link` "All {short} resources →" to `/assessments#{assessment_key}`. `WeekGroup` renders one per `g.assessment_resources` after the task list.
- `AssessmentsRail`: under "Mark submitted", the `submitting` resources as plain `ExternalLink`s.
- CSS follows the mockup (`.superpowers/brainstorm/23452-1792785757/content/resources-v1.html`): accent-tint background, accent-line border, mono uppercase group headings, muted mono task labels ≥ 11px, columns stack below phone width. Use existing tokens from `index.css` only.

- [ ] **Step 1: Write failing tests:**
  - `ResourceBox.test.tsx`: `resourceBoxHeading` cases above; renders group headings "Tutor recordings" and "Tools" but not "Submitting"; a resource tagged `[3]` shows `T3`; the "All A3 resources →" link has `href` `/assessments#ccc602-a3`.
  - `AssessmentsRail.test.tsx`: an assessment with a `submitting` resource "Format and file name" shows that link; a `tool` resource is not shown in the rail.
  - Update existing fixtures that build `Assessment`/`ThisWeekGroup`/`Task` objects to include the new fields (`resources: []`, `assessment_resources: []`, `assessment_key: null`, `assessment_task: null`).
- [ ] **Step 2: Run** `npx vitest run src/components/thisweek/ResourceBox.test.tsx src/components/AssessmentsRail.test.tsx` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** those plus `src/pages/ThisWeekPage.test.tsx`, then `npx tsc -b` → PASS.
- [ ] **Step 5: Commit** `feat: assessment resource box on This week and submitting links on the rail`

### Task 7: Frontend: Assessments page resources

**Files:**
- Modify: `frontend/src/pages/AssessmentsPage.tsx`, `frontend/src/index.css`
- Test: `frontend/src/pages/AssessmentsPage.test.tsx`

**Interfaces:**
- Consumes: `ResourceColumns` (Task 6).
- Each `AssessmentRow` `li` gets `id={a.key}`. When `a.resources.length > 0`, a disclosure button "Resources (N)" (`aria-expanded`, `aria-controls`) toggles `ResourceColumns` with all four groups. Open by default when `lead`, or when `location.hash === '#' + a.key`.
- On load with a hash matching a submitted assessment, set `showSubmitted` true; after render, `scrollIntoView` the matching row.

- [ ] **Step 1: Write failing tests:**
  - `shows resources open on the lead and collapsed elsewhere`: lead row shows "Tutor recordings"; another row shows button "Resources (2)" with `aria-expanded="false"`; clicking it reveals its links.
  - `opens the assessment named in the hash`: render at `/assessments#ccc602-a4` (not lead) → A4's resources visible.
  - `opens a submitted assessment from the hash` (Review Focus 2): A3 submitted, render at `/assessments#ccc602-a3` → Submitted list shown and A3's resources visible.
  - `has no resources button when there are none`.
- [ ] **Step 2: Run** `npx vitest run src/pages/AssessmentsPage.test.tsx` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same → PASS.
- [ ] **Step 5: Commit** `feat: resources on the Assessments page`

### Task 8: Full checks and a look in the browser

- [ ] **Step 1:** Backend: `uv run pytest` (full, against local Docker Postgres) and `uv run alembic check` → all pass.
- [ ] **Step 2:** Frontend: `npm run lint`, `npm test`, `npm run build` → pass (the two existing `App.tsx` lint warnings are known).
- [ ] **Step 3:** Run the app locally (`alembic upgrade head`, `python -m app.seed`, uvicorn + `npm run dev`), log in with a dev test account, and check week 11 This week shows the A3 box with T3/T4 recordings, "All A3 resources →" opens A3 on the Assessments page, and the layout holds at 375px wide.
- [ ] **Step 4:** Update CLAUDE.md "Status" line to mention assessment resources. Commit `docs: note assessment resources`.
