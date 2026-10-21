# Part-time study and intake choice

Date: 2026-10-22. Status: approved design, not yet planned.

## Why

The app only works for the owner's own cohort (July 2026, full-time). The aim is to open it to other students, and the first step is part-time students on the same intake. A student picks their intake at sign-up and can change it later in Settings.

The app is a **guide, not a source of truth**. Getting a PT student to roughly the right week with roughly the right tasks is good enough. Exact matching with the portal is not a goal.

## Goals

1. Add a **July 2026 part-time** intake next to the existing July 2026 full-time one.
2. **Sign-up** asks which intake the student is on (a dropdown of intakes from `schedule.yaml`).
3. A new **Settings** page lets the student change intake later.
4. Everything that depends on the calendar works for PT: This week, lurking tasks, breaks, holidays, catch-up ticks, assessment due dates, and the module page's "Jump to week".

## Non-goals

- Other intakes (Feb 2027 and so on). Their break dates aren't public (only in each intake's Programme Guide), and the Feb 2027 intake starts in the middle of the owner's Feb break, so breaks are not shared across all intakes. They get added later as data in `schedule.yaml`, with no code changes.
- A manual "current week" override. That's still out, as in CLAUDE.md.
- Scraping UPLearn for dates.
- PT-specific task content. PT reuses the FT tasks (see below).

## Anti-goals

- Never remove a student's ticks when they change intake.
- Never store or show tutor text, Programme Guide content or other students' data (CLAUDE.md portal rules).

## Facts this is built on

From `docs/portal-extras.md` and the owner:

- FT is 32 teaching weeks at 37.5 h/week. PT is 64 teaching weeks at 19 h/week. PT covers the same content at half the pace.
- FT and PT on the same intake **share one calendar of breaks**. Check: the owner's A2 (end of FT week 8) and a same-intake PT student's A1 (end of PT week 8) were both due Sun 13 Sep 2026.
- July 2026 intake: FT runs 20 Jul 2026 – 25 Apr 2027, PT runs 20 Jul 2026 – 30 Jan 2028.

## Design

### 1. The PT intake (data)

Add `2607-online-ccc-pt` to `seed/schedule.yaml` (title "July 2026 intake, part-time (NZ4129)", `study_mode: PT`) with 64 weeks:

- **PT weeks 1–32** use the same start dates as FT weeks 1–32 (20 Jul 2026 – 19 Apr 2027), so they share the breaks from the owner's Programme Guide.
- **PT weeks 33–64** start 26 Apr 2027. There are no published break dates for this stretch, so assume three breaks that repeat the 2026–27 pattern. Weeks starting on these Mondays are breaks:
  - mid-year: 5, 12 and 19 Jul 2027
  - September: 13 and 20 Sep 2027
  - Christmas: 20 Dec 2027, 27 Dec 2027 and 3 Jan 2028

  Under this assumption week 64 starts 24 Jan 2028 and ends Sun 30 Jan 2028, which matches the official PT end date. *(Owner's call to approximate; placement is Claude's call.)* Add a YAML comment saying these are assumed.
- **Holidays**: the FT list plus the NZ public holidays that fall in weeks 33–64. For 2027–28 these are ANZAC Day (observed) 26 Apr 2027, King's Birthday 7 Jun, Matariki 25 Jun, Labour Day 25 Oct, Christmas (observed) 27 Dec, Boxing Day (observed) 28 Dec, and New Year's (observed) 3–4 Jan 2028. Check each date against an official NZ source before seeding.

### 2. Mapping PT weeks to content

Content (`Week.week_number`) stays numbered in FT weeks. Nothing in the module YAML files changes.

- PT week `p` shows content week `n = ceil(p / 2)`.
- Within each content `Week` row (one per submodule), split tasks by `position`. The **odd** PT week (2n−1) gets the first `ceil(k/2)` tasks and the **even** PT week (2n) gets the rest. A row with one task falls entirely in the odd week. *(Owner's call: "doesn't need to be perfect.")*
- Put this mapping in one place: a pure function next to `app/schedule.py` that takes a study mode and returns which task ids (and which content weeks) belong to a given intake week. Everything else calls it, not `Week.week_number < cutoff` directly.

Callers that currently compare `Week.week_number` with the intake's week number and need to go through the mapping:

- `api/this_week.py`: current week groups, `ahead`, lurking tasks (lurking is listed per **PT** week number for PT users)
- `catchup.py`: tasks and prerequisites behind the cutoff
- `api/modules.py` and the module page's "Jump to week" (see 6)

FT behaviour must stay byte-for-byte the same; the existing tests are the guard.

### 3. Assessment due dates per intake

`Assessment.due_date` is a fixed FT date today. Change the seed to give each assessment a **`due_week`** (the FT content week whose Sunday it's due on), and work the due date out from the user's intake:

- FT: the end (Sunday) of intake week `due_week`
- PT: the end of intake week `2 × due_week`

An optional **`due_weekday`** (`mon` … `sun`, default `sun`) covers assessments that aren't due on a Sunday. The PT date uses the same weekday in PT week `2 × due_week`.

Current assessments convert as follows. Each date was checked against `schedule.yaml`:

| Assessment | Old `due_date` | `due_week` | `due_weekday` | PT due |
|---|---|---|---|---|
| A1 | 16 Aug 2026 | 4 | (sun) | 13 Sep 2026 |
| A2 | 13 Sep 2026 | 8 | (sun) | 22 Nov 2026 |
| A3 | | 12 | (sun) | end of PT wk 24 |
| A4 | | 16 | (sun) | end of PT wk 32 |
| A5 | | 20 | (sun) | end of PT wk 40 |
| A6 | | 24 | (sun) | end of PT wk 48 |
| A7 | 18 Apr 2027 | 31 | (sun) | end of PT wk 62 |
| A8 | Fri 23 Apr 2027 | 32 | fri | Fri 28 Jan 2028 |

FT dates must come out exactly as they are today.

Update `seed/ccc60x.yaml`, the seed schema and loader, the assessments API, This week's assessment list and `catchup.py`, which marks past-due assessments submitted. The seed loader checks that every `due_week` exists in **every intake's FT-equivalent range**, which is 1–32: an FT intake's week count, or half a PT intake's. It does not check the module's own weeks, because CCC604 is still a shell with no weeks. Assessments with no due date stay undated.

*(Claude's call: replacing `due_date` with `due_week` and `due_weekday`.)*

### 4. Sign-up

- New public endpoint `GET /api/intakes`: list of `{key, title, study_mode}`, ordered by title.
- `SignupIn` gets a required `intake_key`, and an unknown key returns 422. `default_intake_key` in config is no longer used for sign-up; remove it if nothing else uses it.
- `AuthPage` (signup mode) shows an intake dropdown, with nothing preselected and the field required.
- Catch-up pre-ticking runs against the chosen intake, as now.

### 5. Settings page

- New route `/settings` with a link in the app header. It shows the current intake in a dropdown and a Save button.
- New endpoint `PUT /api/me/settings` `{intake_key}`. It updates `UserSettings.intake_id`, then runs catch-up for the new intake.
- **Catch-up on change (owner's call):** tick anything that's now in the past for the new intake, and **never remove a tick**. Going PT → FT may tick extra tasks; going FT → PT ticks nothing new. `prefill_past_work` has to skip rows that already exist (insert … on conflict do nothing), because existing users already have ticks.
- After saving, invalidate the TanStack Query caches for me, this-week, modules and assessments so every page recalculates.
- Plain copy on the page, for example: "Changing your intake moves you to that intake's week and due dates. Your ticks stay."

### 6. Module page for PT users

The module page lists content weeks (FT numbering). For PT users, label each content week with its PT weeks ("Weeks 17–18"), and make "Jump to week" find the content week that holds the user's current PT week. FT users see exactly what they see now. *(Claude's call.)*

### 7. Weekly forum links

The PT forum post ids aren't recorded per week (only ranges in `portal-extras.md`). PT users get no weekly schedule-post link for now. `schedule_post_urls` already filters by study mode, so this needs no code. Add PT posts to the seed later if the owner records them. *(Claude's call.)*

### 8. Existing users and migration

Existing users stay on `2607-online-ccc-ft`. The migration needs no data changes beyond what the `due_week` schema change requires (`assessments.due_date` dropped or kept as a cache, builder's call). Run `alembic check` as usual.

## Left to the builder

- Exact API and component shapes, file names, and whether the mapping function returns task ids or (week, task-slice) pairs.
- Whether `due_date` stays as a column or is computed only in the API.
- Header link placement and Settings page styling, which should follow the existing "Module timeline" UI.
- Test layout. Each of these needs a test: PT current week and split, PT lurking, PT assessment due dates, sign-up with an intake, Settings change with catch-up that never unticks, and the FT behaviour unchanged.
