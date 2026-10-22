# Part-time study and intake choice: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Offer four intakes (July 2026 FT/PT, Sept 2026 FT/PT). Students pick one at sign-up and can change it in Settings. Every calendar-driven view works for part-time students.

**Architecture:** Content stays numbered in FT weeks. One pure module, `app/pacing.py`, maps content weeks and tasks onto an intake's own weeks (FT 1:1; PT week 2n−1 gets the first half of content week n's tasks and 2n gets the rest), and works out due dates. Every API that compares week numbers goes through it. Assessments store `due_week` + `due_weekday` instead of a fixed date.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, pytest (backend); React, Vite, TypeScript, TanStack Query, vitest (frontend).

**Spec:** `docs/superpowers/specs/2026-10-22-part-time-intake-design.md`

## Global Constraints

- Work on branch `feat/part-time-intake` cut from `dev`. Never commit to `main`.
- FT behaviour unchanged: every existing test passes, with fixtures changed only from `due_date=` to `due_week=` and from sign-up bodies to include `intake_key`.
- Never remove a tick on intake change. Inserts use `on_conflict_do_nothing`.
- No tutor names or emails, no Programme Guide text, no PDF in the repo. Only dates.
- Intake keys: `2607-online-ccc-ft` (existing), `2607-online-ccc-pt`, `2609-online-ccc-ft`, `2609-online-ccc-pt`.
- Copy is plain English, in the same tone as the existing pages.
- Mid-work runs only the tests for touched files. The full backend suite plus frontend lint, test and build run at the end.

## Review Focus

1. **A PT content week with an odd task count, or a single task.** The odd PT week gets `ceil(k/2)` tasks. The even week can be empty, and This week must not crash or show an empty group. Test in Task 1 and Task 4.
2. **Switching intake when the user already has ticks.** Catch-up must not raise an IntegrityError, and must not remove anything. Test in Task 5.
3. **Sign-up with a missing or unknown `intake_key`.** Expect 422 with a clear message, and no user created. Test in Task 5.
4. **An assessment with `due_week` beyond a short intake, or no `due_week`.** The due date is `None` (status `no_date`), never an exception. Test in Task 1.
5. **A PT user on the module page.** Week labels use PT numbers and "Jump to week" finds the current PT week. Test in Task 4 (API) and Task 6 (frontend).

---

### Task 1: `app/pacing.py`, pure mapping functions

**Files:**
- Create: `backend/app/pacing.py`
- Test: `backend/tests/test_pacing.py`

**Interfaces:**
- Produces:
  - `StudyMode = Literal["FT", "PT"]`
  - `split_week(mode: StudyMode, week_number: int, tasks: Sequence[T]) -> list[tuple[int, list[T]]]`. FT gives `[(n, tasks)]`. PT gives `[(2n-1, tasks[:ceil(k/2)]), (2n, tasks[ceil(k/2):])]`, and both pairs are always returned, even when empty.
  - `intake_weeks(mode: StudyMode, week_number: int) -> list[int]`. FT gives `[n]`. PT gives `[2n-1, 2n]`.
  - `due_date(weeks: Sequence[TeachingWeek], mode: StudyMode, due_week: int | None, due_weekday: int) -> date | None`. The intake week is `due_week` (FT) or `2*due_week` (PT), and the result is its `starts_on + due_weekday` days, where `due_weekday` runs 0=Mon to 6=Sun. Return `None` if `due_week` is None or the intake has no such week.

- [ ] **Step 1: Write the failing tests** in `tests/test_pacing.py`:
  - `split_week("FT", 3, [a,b,c]) == [(3, [a,b,c])]`
  - `split_week("PT", 3, [a,b,c]) == [(5, [a,b]), (6, [c])]`
  - `split_week("PT", 1, [a]) == [(1, [a]), (2, [])]`
  - `split_week("PT", 2, []) == [(3, []), (4, [])]`
  - `intake_weeks("PT", 8) == [15, 16]`
  - Using `FT_WEEKS` from conftest: `due_date(FT_WEEKS, "FT", 4, 6) == date(2026, 8, 16)` and `due_date(FT_WEEKS, "FT", 32, 4) == date(2027, 4, 23)`.
  - Using a PT list built from the 2609 PT weeks (week 1 is 28 Sep 2026, plus the breaks in the spec; a helper is fine): `due_date(pt, "PT", 4, 6) == date(2026, 11, 22)`, `due_date(pt, "PT", 31, 6) == date(2028, 3, 26)` and `due_date(pt, "PT", 32, 4) == date(2028, 4, 7)`.
  - `due_date(FT_WEEKS, "FT", None, 6) is None` and `due_date(FT_WEEKS, "PT", 20, 6) is None` (week 40 doesn't exist).
- [ ] **Step 2:** Run `uv run pytest tests/test_pacing.py -v`. Expect FAIL (import error).
- [ ] **Step 3:** Implement `app/pacing.py`. Keep it pure, with no DB imports apart from `TeachingWeek` from `app.schedule`. Give it a module docstring explaining the FT/PT mapping.
- [ ] **Step 4:** Run the same command. Expect PASS.
- [ ] **Step 5:** Commit: `feat: pacing module maps content weeks onto FT and PT intakes`.

### Task 2: Assessments use `due_week` / `due_weekday`

**Files:**
- Modify: `backend/app/models.py` (Assessment), `backend/app/seed/schema.py` (SeedAssessment), `backend/app/seed/loader.py`, `backend/app/api/assessments.py`, `backend/app/api/this_week.py` (assessment list), `backend/app/api/modules.py` (assessments), `backend/app/catchup.py` (past-due), `backend/app/api/schemas.py` (unchanged output: `due_date` stays in `AssessmentOut`, now computed)
- Create: `backend/alembic/versions/0010_assessment_due_week.py`
- Modify seed: `seed/ccc601.yaml`, `ccc602.yaml`, `ccc603.yaml`, `ccc604.yaml`
- Test: update `tests/test_assessments_api.py`, `test_catchup.py`, `test_models.py`, `test_modules_api.py`, `test_seed_apply.py`, `test_seed_files.py`, `test_seed_validation.py`, `test_this_week_api.py`, `test_migrations.py` if it lists columns

**Interfaces:**
- Consumes: `pacing.due_date`
- Produces:
  - `Assessment.due_week: int | None` and `Assessment.due_weekday: int` (default 6, server default 6, check constraint 0–6). `due_date` column removed.
  - `assessment_due(a: Assessment, intake: Intake) -> date | None` in `app/api/assessments.py`, wrapping `pacing.due_date` with the intake's weeks and study mode.
  - `assessment_out(a, submitted, today, due: date | None)`. The caller passes the computed due date. `_sort_key` likewise takes the due date.
  - Seed YAML: `due_week: int >= 1` (optional) and `due_weekday: mon|tue|wed|thu|fri|sat|sun` (optional, default `sun`). Mapped to 0–6 when loading.

- [ ] **Step 1: Update the tests first.** Convert fixtures from `due_date=X` to `due_week=N`, where N is the FT_WEEKS week whose Sunday is X (16 Aug→4, 13 Sep→8, 11 Oct→10, 25 Oct→12, 22 Nov→16). Dates that aren't a week's Sunday (`test_catchup`'s 1 Oct and 14 Oct) move to the nearest week's Sunday, and the test's `today` moves with them so the test still checks the same thing.. Keep every expected `"due_date"` in API responses the same where possible. Add these tests:
  - `test_seed_validation`: `due_weekday: fri` parses to 4. A missing weekday defaults to 6. `due_week: 0` is rejected.
  - `test_seed_validation`: the loader rejects `due_week: 33`, with a message naming the assessment key (valid range is 1–32, from the shortest FT-equivalent intake length: an FT intake's week count, or a PT intake's week count ÷ 2).
  - `test_seed_files`: real seed A1–A8 have `due_week` 4, 8, 12, 16, 20, 24, 31, 32, and A8 has weekday 4.
  - `test_assessments_api`: a PT user (intake study_mode PT with PT weeks) sees A1 with `due_week` 4 due on the Sunday of their week 8.
- [ ] **Step 2:** Run the touched test files. Expect FAIL.
- [ ] **Step 3:** Write migration 0010. Add `due_week` (nullable int) and `due_weekday` (smallint, not null, server default 6, check `due_weekday BETWEEN 0 AND 6`), then drop `due_date`. Downgrade reverses this (with `due_date` nullable and its data lost; say so in the docstring). Update the model.
- [ ] **Step 4:** Update the seed schema and loader. Also change the loader's existing check "content week has dates in every intake": for a PT intake, content week n needs intake week 2n. Use `pacing.intake_weeks`.
- [ ] **Step 5:** Convert the four seed files: A1 4, A2 8, A3 12, A4 16, A5 20, A6 24, A7 31, A8 32 + `due_weekday: fri`. Keep the comments.
- [ ] **Step 6:** Switch `assessments.py`, `modules.py`, `this_week.py` and `catchup.py` to the computed due date for the user's intake. `catchup` marks submitted where the computed date is `< today`.
- [ ] **Step 7:** Run the touched test files plus `uv run alembic check` against the dev DB, after `uv run alembic upgrade head`. Expect PASS and "No new upgrade operations detected".
- [ ] **Step 8:** Commit: `feat: assessments are due by week, dated per intake`.

### Task 3: Schedule data for the three new intakes

**Files:**
- Modify: `seed/schedule.yaml`
- Test: `backend/tests/test_seed_files.py`

**Interfaces:** data only. Keys and titles come from the spec §1.

- [ ] **Step 1: Write failing tests** in `test_seed_files.py`:
  - There are 4 intakes with the keys from Global Constraints.
  - `2607-online-ccc-pt` has 64 weeks. Weeks 1–32 equal the 2607 FT weeks, week 33 starts 2027-04-26, and week 64 starts 2028-01-24.
  - `2609-online-ccc-pt` has 64 weeks. Week 1 starts 2026-09-28, week 13 starts 2027-01-18, week 25 starts 2027-05-10, week 53 starts 2028-01-17 and week 64 starts 2028-04-03.
  - `2609-online-ccc-ft` has 32 weeks. Week 1 starts 2026-09-28, week 13 starts 2027-01-18, week 17 starts 2027-03-01, week 25 starts 2027-05-10 and week 32 starts 2027-06-28.
  - Every holiday in each intake falls between its first week's Monday and its last week's Sunday.
- [ ] **Step 2:** Run `uv run pytest tests/test_seed_files.py -v`. Expect FAIL.
- [ ] **Step 3:** Add the intakes to `seed/schedule.yaml`, using the break rules in spec §1. Generate the dates with a throwaway script, not by hand. Add a source comment to each intake. 2607 PT weeks 33–64 are inferred from the 2609 guide and the official end date. 2609 PT comes from the 2609 PT Programme Guide supplied by the owner on 2026-10-22. 2609 FT is derived from it. Holidays (observed dates):
  - 2026: 26 Oct Labour, 25 Dec Christmas, 28 Dec Boxing (obs)
  - 2027: 1 Jan New Year, 4 Jan Day after New Year (obs), 1 Feb Auckland Anniversary (obs), 8 Feb Waitangi (obs), 26 Mar Good Friday, 29 Mar Easter Monday, 26 Apr ANZAC (obs), 7 Jun King's Birthday, 25 Jun Matariki, 25 Oct Labour, 27 Dec Christmas (obs), 28 Dec Boxing (obs)
  - 2028: 3 Jan New Year (obs), 4 Jan Day after New Year (obs), 31 Jan Auckland Anniversary (obs), 7 Feb Waitangi (obs)

  Include only the holidays inside each intake's span. Leave the 2607 FT list unchanged.
- [ ] **Step 4:** Run the test file plus `uv run python -m app.seed` against the dev DB. Expect PASS and a clean load.
- [ ] **Step 5:** Commit: `feat: add July 2026 PT and Sept 2026 FT/PT intakes`.

### Task 4: PT-aware This week, module pages and catch-up

**Files:**
- Modify: `backend/app/api/this_week.py`, `backend/app/api/modules.py`, `backend/app/catchup.py`
- Test: `backend/tests/test_this_week_api.py`, `test_modules_api.py`, `test_catchup.py`

**Interfaces:**
- Consumes: `pacing.split_week`, `pacing.intake_weeks`
- Produces (API shape is unchanged; only numbering differs for PT):
  - This week: `groups` holds only the tasks `split_week` assigns to the current intake week. A group whose split is empty is omitted. `week.week_number` in each group is the **intake** week number. `ahead` and `lurking` use intake week numbers. The schedule-post lookup key is `(module_id, intake week number)`.
  - Module detail: for PT, each content week is returned as its split weeks, with `week_number` = PT week and `key` = `f"{week.key}-{intake_week}"` (FT keeps the plain key). Empty splits are omitted. `SubmoduleOut.first_week` and `last_week`, and `ModuleSummary.week_numbers`, use intake numbering. `ModuleSummary.week_count` counts intake weeks that have tasks.
  - `prefill_past_work(db, user, intake, today) -> int | None`: same contract. Tasks come from splits whose intake week is `< cutoff`. Prerequisites are those of submodules with any such split. All three inserts are `on_conflict_do_nothing`.

- [ ] **Step 1: Write failing tests.** Add a PT intake fixture helper to conftest: `add_schedule(db, intake, weeks=...)` with `intake.study_mode = "PT"` and 64 weeks, e.g. 2607 PT. Then:
  - This week, PT user, today in PT week 5 (17 Aug 2026), content week 3 with tasks [a,b,c]: groups show a and b with `week.week_number == 5`. In PT week 6, c is shown.
  - This week, PT, content week 1 has one task. In PT week 2 that module has no group and the response is 200.
  - Lurking for PT lists week numbers in PT numbering.
  - Module detail for PT: content week 3 becomes weeks 5 and 6 with keys `w3-5` and `w3-6`. `first_week` and `last_week` are in PT numbering.
  - Catch-up for PT on 2 Oct 2026 (PT week 9, cutoff 9): ticks the tasks of content weeks 1–4 only.
  - Catch-up run twice for the same user doesn't raise, and leaves an existing manual tick in place.
- [ ] **Step 2:** Run the three files. Expect the new tests to FAIL and the old ones to PASS.
- [ ] **Step 3:** Implement, keeping FT output identical.
- [ ] **Step 4:** Run the three files. Expect PASS.
- [ ] **Step 5:** Commit: `feat: part-time weeks on This week, module pages and catch-up`.

### Task 5: Intakes API, sign-up choice, settings endpoint

**Files:**
- Create: `backend/app/api/settings.py` (router: `GET /intakes`, `PUT /me/settings`), registered in `backend/app/main.py` the way the other routers are
- Modify: `backend/app/api/auth.py`, `backend/app/api/schemas.py`, `backend/app/config.py` (remove `default_intake_key`), `backend/tests/conftest.py`
- Test: `backend/tests/test_settings_api.py`, `test_auth_api.py`

**Interfaces:**
- Produces:
  - `GET /api/intakes` (no auth) returns `list[IntakeOption]` with `{key, title, study_mode}`. Order is by first week's `starts_on`, then study_mode (FT before PT), then key. Intakes with no weeks are excluded.
  - `SignupIn.intake_key: str` (required). An unknown key returns 422 `"Pick your intake from the list."` and no user is created.
  - `PUT /api/me/settings` with body `SettingsIn {intake_key: str}` returns `MeOut`. Unknown key gives 422 with the same message. It sets the intake, runs `prefill_past_work` for the new intake and commits.
  - conftest: the `intake` fixture uses the key `"2607-online-ccc-ft"`, and `signup_body` adds `intake_key="2607-online-ccc-ft"` by default.

- [ ] **Step 1: Write failing tests:**
  - `GET /api/intakes` ordering, without auth.
  - Sign-up without `intake_key` gives 422. Sign-up with an unknown key gives 422 and no user row. Sign-up with a valid PT key gives `study_mode == "PT"`.
  - `PUT /api/me/settings` while logged out gives 401. A PT→FT switch on a date where FT is further ahead ticks the extra past tasks. A FT→PT switch keeps all ticks (count unchanged). An unknown key gives 422.
- [ ] **Step 2:** Run the files. Expect FAIL.
- [ ] **Step 3:** Implement. Remove `default_intake_key` and the `NO_SCHEDULE` path; an unknown or missing intake is the 422.
- [ ] **Step 4:** Run the files plus `test_auth_api.py`. Expect PASS.
- [ ] **Step 5:** Commit: `feat: choose intake at sign-up and change it in settings`.

### Task 6: Frontend sign-up dropdown, Settings page, sidebar link

**Files:**
- Modify: `frontend/src/api.ts`, `frontend/src/pages/AuthPage.tsx`, `frontend/src/App.tsx`, `frontend/src/components/Sidebar.tsx`
- Create: `frontend/src/pages/SettingsPage.tsx`, `frontend/src/hooks/useIntakes.ts`
- Test: `frontend/src/pages/AuthPage.test.tsx`, `frontend/src/pages/SettingsPage.test.tsx`, `frontend/src/components/Sidebar.test.tsx`

**Interfaces:**
- Consumes: Task 5's endpoints.
- Produces:
  - `api.ts`: `IntakeOption {key; title; study_mode}`, `fetchIntakes()`, `signup(email, password, intakeKey)`, `updateSettings(intakeKey): Promise<Me>`. `Me.intake` gains `study_mode`, matching `IntakeOut` (add `study_mode` to `IntakeOut` in schemas if it's not there).
  - `useIntakes()`: `useQuery({queryKey: ['intakes'], queryFn: fetchIntakes, staleTime: Infinity})`.

- [ ] **Step 1: Write failing tests:**
  - AuthPage signup shows a required "Intake" select with options from the mocked `/api/intakes` and no option preselected (placeholder "Choose your intake"). Submitting without one shows "Choose your intake." and makes no request. Submitting sends `intake_key`. Login mode has no select.
  - SettingsPage shows the current intake selected, and Save calls `PUT /api/me/settings`. On success it shows "Saved. You're now on <title>." and sets the `['me']` data. The `this-week`, `modules`, `module` and `assessments` queries are invalidated.
  - Sidebar has a "Settings" link to `/settings` with `aria-current="page"` when active.
- [ ] **Step 2:** Run `npx vitest run src/pages/AuthPage.test.tsx src/pages/SettingsPage.test.tsx src/components/Sidebar.test.tsx`. Expect FAIL.
- [ ] **Step 3:** Implement. The Settings page has heading "Settings", a "Your intake" select, and the helper text "Changing your intake moves you to that intake's weeks and due dates. Your ticks stay." Use existing classes (`card`, `form`, `field`, `button-primary`) and `usePageTitle('Settings')`. Put the sidebar link in the footer next to the Disclaimer link.
- [ ] **Step 4:** Run the same command. Expect PASS.
- [ ] **Step 5:** Commit: `feat: intake picker at sign-up and a Settings page`.

### Task 7: Docs and full verification

**Files:**
- Modify: `CLAUDE.md` (Status line, the "Migration 0008 moves existing users" note, a new note that migration 0010 needs a re-seed, the MVP scope bullet about intakes), `docs/superpowers/specs/2026-10-22-part-time-intake-design.md` §6 (module page: PT weeks are split, not labelled "Weeks 17–18"; Claude's call), `README.md` if it mentions full-time only.

- [ ] **Step 1:** Make the doc edits.
- [ ] **Step 2:** Run the full checks: `cd backend && uv run pytest` and `uv run alembic check`, then `cd frontend && npm run lint && npm test && npm run build`. Expect everything green.
- [ ] **Step 3:** Commit: `docs: part-time and intake choice`.
