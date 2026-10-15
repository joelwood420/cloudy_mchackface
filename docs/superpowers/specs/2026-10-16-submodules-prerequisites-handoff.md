# Handoff: submodules and prerequisites

**Status:** the seed files are done, on branch `worktree-submodules-seed`. Backend, API and frontend support is **not built**; that work is described below.
**Written:** 2026-10-16, by the seed/content session. The owner approved the design in chat.
**Read first:** `CLAUDE.md`, `docs/superpowers/specs/2026-10-15-yoobee-study-guide-design.md`.

## Why

Each course (module) is really a set of certification tracks, e.g. CCC601 is AWS Cloud Practitioner → AWS Architect → AZ-900 → AZ-104. Each track needs one-off setup before you can study: accept an AWS Academy invite, register for a Skillable class, create an Azure account, and so on. Those setup steps were hidden inside weeks as ordinary tasks, so they inflated progress and repeated (the Azure account appeared in several places).

## Decisions (agreed with the owner)

1. **New level: Module → Submodule → Week → Task.** Every week belongs to exactly one submodule. Week numbers stay programme-wide (1–24).
2. **Prerequisites** are one-off setup items attached to submodules.
   - **Shared:** each one is defined once and can be attached to many submodules (e.g. `azure-account` is used by AZ-900, AZ-104, DP-900 and DP-203). Tick it once and it's done everywhere.
   - **Tickable, but never counted in progress bars** (task progress maths stays exactly as it is).
   - Ticking arrives with accounts/ticking (Phase 2). Until then prerequisites are display-only.
3. **Data model option A:** separate `prerequisites` table plus a `submodule_prerequisites` join table. Not stored as tasks.
4. Each prerequisite links to where you do it (`external_url`) and to the UPLearn how-to post (`uplearn_url`). Most of those posts include a video walkthrough.
5. Assessments stay attached to the module. "Complete Task N of Assessment M" items stay as tasks in their weeks.

## Seed format (already written)

Files: `seed/ccc601.yaml`, `seed/ccc602.yaml`, `seed/ccc603.yaml`, **new** `seed/prerequisites.yaml`.

```yaml
# seed/prerequisites.yaml  (different top-level shape from module files)
prerequisites:
  - key: azure-account
    title: "Create an Azure free account (personal email)"
    note: "$200 credit for 30 days, then pay-as-you-go. ..."
    external_url: https://azure.microsoft.com/free
    uplearn_url: https://yoobee.uplearn.education/mod/forum/discuss.php?d=49395

# seed/ccc601.yaml
module:
  key: ccc601
  code: CCC601
  title: "Public Cloud Administration"
  order: 1
  uplearn_url: https://yoobee.uplearn.education/course/view.php?id=552
submodules:
  - key: ccc601-az104
    code: "AZ-104"
    title: "Microsoft Azure Administrator"
    uplearn_url: https://yoobee.uplearn.education/course/section.php?id=9681
    prerequisites:            # keys from prerequisites.yaml, in display order
      - azure-account
      - skillable-az104
    weeks:
      - key: ccc601-w06
        week_number: 6
        title: "AZ-104 Modules 0–4"
        tasks:               # unchanged task shape: key, title, type, note?, external_url?, uplearn_url?
          - key: ...
assessments: [...]           # unchanged
```

Field rules:
- **Submodule:** `key`, `code` (≤20 chars, e.g. `AZ-104`, `Fortinet`), `title`, `uplearn_url` (optional, the UPLearn tile), `prerequisites` (list of keys, may be empty), `weeks`. Position = order in the file.
- **Prerequisite:** `key`, `title`, `note` (optional, ≤300 chars), `external_url` (optional), `uplearn_url` (optional). Needs at least one URL.
- Module files no longer have a top-level `weeks:`, only `submodules:`.

Content today: 3 modules, 9 submodules, 24 weeks, 162 tasks, 12 prerequisites.

| Submodule | Weeks | Prerequisites |
|---|---|---|
| ccc601-clf (CLF-C02) | 1–2 | programme-start, aws-academy-cloud-foundations, aws-console-account, aws-budget |
| ccc601-saa (SAA-C03) | 3–4 | aws-academy-cloud-architecting, aws-console-account, aws-budget |
| ccc601-az900 (AZ-900) | 5 | azure-account, skillable-az900 |
| ccc601-az104 (AZ-104) | 6–8 | azure-account, skillable-az104 |
| ccc602-dp900 (DP-900) | 9 | azure-account, skillable-dp900 |
| ccc602-dp203 (DP-203) | 10–12 | azure-account |
| ccc602-dea (DEA-C01) | 13–16 | aws-academy-data-engineering, aws-console-account, aws-budget |
| ccc603-scs (SCS-C02) | 17–18 | aws-academy-security, aws-console-account, aws-budget |
| ccc603-fortinet (Fortinet) | 19–24 | forticloud-account |

Removed tasks (they became prerequisites): `ccc601-w01-setup`, `ccc601-w05-azure-account`, `ccc601-w05-skillable-register`, `ccc602-w09-dp900-labs`, `ccc603-w17-fortinet-account`. Re-seeding deletes these rows and any completions on them (no users exist yet).

Known quirk: the FT schedule interleaves CCC603, so week 20 (Assessment 5, AWS security) sits in the Fortinet submodule, because weeks must be contiguous per submodule (19 = Fortinet fundamentals, 20 = A5, 21–24 = Fortinet). Acceptable for now.

## Work to do

### 1. Seed schema and loader (`backend/app/seed/`)
- `schema.py`: add `SeedPrerequisite`, `SeedPrerequisiteFile` (`prerequisites: list[SeedPrerequisite]`) and `SeedSubmodule` (with `prerequisites: list[Key]`, `weeks: list[SeedWeek]`). `SeedFile` replaces `weeks` with `submodules`. Keep `extra="forbid"`.
- `loader.load_seed_dir`: load `prerequisites.yaml` with the prerequisite schema and every other `*.yaml` as a module file. Validate:
  - Keys are unique across **all** files, including prerequisite and submodule keys. The existing duplicate check must include them.
  - Every submodule prerequisite key exists in `prerequisites.yaml` (error names the file and the submodule key).
  - Week numbers are unique within a module, and a submodule's weeks are contiguous and ascending.
  - Every prerequisite has a URL. Unused prerequisites are allowed.
  - Still all-or-nothing: report every problem and write nothing.
- `apply_seed`: upsert by key, in this order: prerequisites, modules, submodules, weeks, tasks, links. Delete rows (and their join rows) whose keys disappeared, matching the current behaviour for weeks and tasks.
- CLI `python -m app.seed` is unchanged.

### 2. Database (`backend/app/models.py` + Alembic)
- `submodules`: id, key (unique), module_id → modules (CASCADE), code String(20), title String(300), uplearn_url String(1000) null, position int.
- `weeks`: add `submodule_id` → submodules (CASCADE). **Recommendation:** keep `weeks.module_id` for now, with the loader setting both and checking they agree. `Module.weeks`, the list endpoint counts and the existing tests then keep working. Drop it later if it gets in the way.
- `prerequisites`: id, key (unique), title String(300), note String(300) null, external_url String(1000) null, uplearn_url String(1000) null.
- `submodule_prerequisites`: submodule_id (CASCADE), prerequisite_id (CASCADE), position; primary key (submodule_id, prerequisite_id).
- Migration: next number after whatever the auth work adds (main is at `0003_task_note`). `weeks.submodule_id` can't be NOT NULL while old rows exist. Either delete content rows in the migration (all content is re-seedable; check completions first) or add it nullable and tighten it after re-seeding.
- **Phase 2 (with ticking):** `prerequisite_completions` (user_id, prerequisite_id, completed_at, unique on the pair). Keep it separate from `task_completions` so progress maths never sees it.

### 3. API (`backend/app/api/`)
- `GET /api/modules/{key}`: **keep the flat `weeks` list** (no breaking change). Add `submodule_key` to each week and add:
  ```json
  "submodules": [{
    "key": "ccc601-az104", "code": "AZ-104", "title": "Microsoft Azure Administrator",
    "uplearn_url": "...", "first_week": 6, "last_week": 8,
    "prerequisites": [{"key": "azure-account", "title": "...", "note": "...", "external_url": "...", "uplearn_url": "..."}]
  }]
  ```
  After Phase 2, each prerequisite also gets `completed: bool` for the logged-in user.
- `GET /api/modules`: add `submodule_count`.
- Phase 2: `PUT` / `DELETE /api/prerequisites/{key}/complete` (idempotent, 404 on unknown key, 401 when logged out), mirroring the task tick endpoints.

### 4. Frontend (`frontend/src/`)
- Module page: group the weekly timeline under submodule headings, e.g. "AZ-104 · Microsoft Azure Administrator · Weeks 6–8".
- Under each heading, a **"Before you start"** box listing the submodule's prerequisites. Each item shows title, note, a "Do it" link (`external_url`) and a "Watch the guide" link (`uplearn_url`). Ticks come with Phase 2.
- A shared prerequisite appears under every submodule that uses it, with the same tick state.
- "This week" (Phase 3): while the current week falls inside a submodule, show that submodule's unticked prerequisites at the top.
- Progress bars: unchanged, tasks only.

### 5. Tests to update or add
- `backend/tests/test_seed_files.py` fails against the new seeds until the schema is updated. Add checks: every module has submodules, CCC602 covers weeks 9–16, every prerequisite key resolves, no prerequisite note contains a URL, Calendly or Teams link.
- `test_seed_validation.py`: unknown prerequisite key, duplicate keys across the prerequisites and module files, non-contiguous submodule weeks, prerequisite with no URL.
- `test_seed_apply.py`: submodule and prerequisite upsert by key; removing a prerequisite deletes its links; a shared prerequisite is stored once and linked twice.
- `test_modules_api.py`: `submodules` payload, `submodule_key` on weeks, `submodule_count`.
- Frontend: the module page renders submodule headings and the prerequisite box (fixtures in `ModulePage.test.tsx`).

## Suggested order

1. Merge `worktree-submodules-seed` (seed files + this doc). Backend seed tests fail until step 2 is done, so do steps 1–3 on one branch and merge them together.
2. Seed schema, loader and validation tests (TDD).
3. Models, migration, `apply_seed` and apply tests. Run against the Neon test branch.
4. API and API tests. Run the migration on dev, then `uv run python -m app.seed`.
5. Frontend grouping and the prerequisite box.
6. Phase 2: prerequisite ticking alongside task ticking.

## Rules that still apply

- Prerequisites hold **pointers only**: never a training key, password, or Teams/Calendly/Zoom link (CLAUDE.md "Portal data rules").
- No Yoobee-owned text copied in: titles and notes are written in our own words.
- Personal assessment copies live in git-ignored `docs/assessments/`. Never commit them.
- More portal detail (dates, IDs, how-to post index, Skillable classes): `docs/portal-extras.md`.
