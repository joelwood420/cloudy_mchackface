# Phase 3: This Week, Deadlines and Breaks — Design

Date: 2026-10-17
Status: approved in chat, pending spec review

## Goal

Give students a home screen that answers "what should I be doing right now?" without them having to know which week they're in. The portal is poorly organised; the app keeps students on track by working out the current week from their intake's dates, surfacing missed work, warning about breaks and holidays, and listing deadlines they haven't submitted.

Success: the owner opens the app and, with no setup, sees the right week's tasks, any unfinished tasks from earlier weeks, upcoming or overdue assessments, and a clear notice when a break is coming or under way.

## Decisions

| Topic | Decision |
|---|---|
| Current week | Worked out from the user's intake dates and today's date in NZ time. No manual override. Replaces the Phase 2 week picker. |
| Where dates live | New `seed/schedule.yaml`: intakes, each with week start dates and public holidays. Built so part-time intakes can be added later as more entries. |
| Intake per user | Every user has one intake; sign-up assigns the default (`2607-online-ccc-ft`). Study mode comes from the intake. |
| Missed tasks | The owner's "Malware detected" banner: "N unfinished tasks are lurking in Week X". "Quarantine them" opens those tasks for ticking. |
| Working ahead | When every task in the current week is ticked, show "You're ahead of schedule" and next week's tasks. |
| Assessments | Per-user "submitted" tick. Overdue only when the due date has passed and it isn't ticked. |
| Assessments on This week | Due in the next 28 days, plus overdue and not submitted. Full list on a new Assessments page. |
| Breaks | Derived from gaps between week start dates. Warn in the last two teaching weeks before one; dedicated screen during one. |
| Holidays | Listed per intake in `schedule.yaml`; shown on This week when one falls in the current week. |
| CCC604 | Seeded as a shell (module + A7, A8; no weeks). Shown greyed out with "Coming soon" wherever modules are listed. |
| Settings | Removed: nothing left to set. |
| Joining mid-programme | Sign-up pre-ticks tasks in past weeks, past-due assessments as submitted, and prerequisites of started submodules. New accounts only. |

## Data

### `seed/schedule.yaml` (required, like `prerequisites.yaml`)

```yaml
intakes:
  - key: 2607-online-ccc-ft
    title: "July 2026 intake, full-time (NZ4129)"
    study_mode: FT
    weeks:
      - { week_number: 1, starts_on: 2026-07-20 }
      # ... one entry per teaching week, 1–32
    holidays:
      - { date: 2026-10-26, name: "Labour Day" }
      # ... from docs/portal-extras.md, within the intake's dates
```

Dates come from the Programme Guide table in `docs/portal-extras.md`. Validation (all problems reported, nothing written on failure):

- intake keys unique; `study_mode` is `FT` or `PT`
- every `starts_on` is a Monday; week numbers unique and ascending; start dates strictly ascending and at least 7 days apart
- holiday dates unique within an intake
- every `week_number` used by a module seed file exists in every intake (catches typos like week 33)
- the loader refuses to delete an intake that any user is on

A teaching week runs Monday to Sunday (`starts_on` + 6 days). A **break** is any gap between one week's Sunday and the next week's Monday; its length in weeks is the gap divided by 7. (Derived dates are Mon–Sun, so the first break is Mon 14 Sep – Sun 27 Sep 2026.)

### Migration 0008

- `intakes` (id, key unique, title, study_mode with check `FT`/`PT`)
- `intake_weeks` (intake_id FK cascade, week_number, starts_on; unique (intake_id, week_number))
- `intake_holidays` (intake_id FK cascade, date, name; unique (intake_id, date))
- `assessment_submissions` (user_id FK cascade, assessment_id FK cascade, submitted_at; PK (user_id, assessment_id)), same pattern as `task_completions`
- `user_settings`: add `intake_id` (FK, not null after backfill); drop `current_week` and `study_mode`
- Backfill: the migration inserts the `2607-online-ccc-ft` intake row (key, title, study mode only) so existing users can point at it; the seed loader then fills its weeks and holidays. Existing ticks are untouched.

The default intake key lives in config (`DEFAULT_INTAKE_KEY`, default `2607-online-ccc-ft`). Sign-up sets it on the new user's settings.

### `seed/ccc604.yaml`

Module only (key `ccc604`, code `CCC604`, title "Multi-Cloud Security Integration and Project Management", order 4, UPLearn link), no submodules, plus:

- A7 Multi-Cloud Security Integration Project, due 2027-04-18
- A8 Project Presentation, due 2027-04-23

The seed schema already allows a module with no submodules.

## Backend

### Today

A `today()` dependency returns the current date in `Pacific/Auckland`. Tests override it with a fixed date.

### Week logic (pure functions, tested first)

Given an intake's weeks and a date, return one of:

- `before_start`: before week 1's Monday; includes week 1's start date
- `teaching`: inside a week; includes the week number, start and end
- `break`: inside a gap; includes break start/end, which week of the break it is and how many weeks long, and the next week's number and start date
- `finished`: after the last week's Sunday

Also:

- **break coming up**: during a teaching week that is one of the last two before a gap, return that break's start, end, length in weeks, and the week number and start date after it
- **holidays this week**: holidays falling between the current teaching week's Monday and Sunday

### `GET /this-week`

Login required. Response:

```
{
  today: date,
  status: "before_start" | "teaching" | "break" | "finished",
  week: { week_number, starts_on, ends_on } | null,        // teaching only
  break: { starts_on, ends_on, week_of_break, length_weeks } | null,
  next_week: { week_number, starts_on } | null,            // before_start, break
  upcoming_break: { starts_on, ends_on, length_weeks, resumes_week, resumes_on } | null,
  holidays: [{ date, name }],
  groups: [ThisWeekGroup],          // current week's content
  ahead: { week_number, groups: [ThisWeekGroup] } | null,
  lurking: [{ week_number, tasks: [TaskOut + module_code] }],
  assessments: [AssessmentStatusOut],
  stats: { done: int, total: int, next_deadline_days: int | null }
}
```

- `ThisWeekGroup`: module key/code/title, submodule key/code/title, the week (`WeekOut`), and the submodule's unfinished prerequisites (`PrerequisiteOut`).
- `groups` is empty when the current week has no content (CCC604 weeks); the frontend shows the "not in the app yet" message.
- `lurking`: unticked tasks in weeks numbered below the current week. During a break, below the next week. When finished, all weeks. Prerequisites never count. Ordered by week number, then module, then task position.
- `ahead`: present only when the current week has at least one task and all are ticked. Holds the next week number's groups (may be empty if that week has no content yet).
- `assessments`: due within today..today+28 days (submitted or not), plus any with a due date before today that aren't submitted. Assessments with no due date are left out. Ordered by due date.
- `stats.done/total`: ticks in the current week (0/0 outside teaching weeks). `next_deadline_days`: days to the nearest not-submitted assessment due today or later.

### Assessments

- `AssessmentStatusOut`: `AssessmentOut` + `module_key`, `module_code`, `submitted: bool`, `status: "submitted" | "due_today" | "upcoming" | "overdue" | "no_date"`, `days_until: int | null`.
- `GET /assessments`: every assessment, grouped by module order then due date, with status.
- `PUT /assessments/{key}/submitted`, `DELETE /assessments/{key}/submitted`: idempotent, 204, 404 for an unknown key.
- Module detail's `assessments` gain `submitted` and `status` so the module page rail matches.

### Catch-up at sign-up

Students often join the app mid-programme. In the same transaction as creating the account, sign-up pre-ticks past work using the new user's intake and `today()`. The "cut-off week" is the current week when teaching, the next week during a break, beyond the last week when finished, and nothing before the start.

- **Tasks**: every task in weeks numbered below the cut-off week.
- **Assessments**: every assessment with a due date before today is marked submitted.
- **Prerequisites**: every prerequisite linked to a submodule whose first week is below the cut-off week is marked done.

The signup response adds `prefilled_through_week: int | null` (the last pre-ticked week; null when nothing was ticked). After sign-up the This week page shows a dismissible note: "We've marked weeks 1–10 as done. Untick anything you haven't finished." Existing accounts are not changed. Everything stays untickable as normal.

### Me and settings

- `GET /me` returns `email`, `study_mode` (from the intake) and `intake: { key, title }`. `current_week` is removed.
- `PATCH /me/settings` is removed.

### Modules list

`ModuleSummary` gets no new field; a module with `week_count == 0` is treated as "coming soon" by the frontend. It contributes nothing to progress totals.

## Frontend

### Routes and navigation

- `/`: This week (new home)
- `/modules`: Modules list (moved from `/`); `/modules/:key` unchanged
- `/assessments`: new
- `/settings`: removed (falls through to Not found); `SettingsPage` and its test deleted
- Sidebar: "This week" and "Assessments" become live links; Settings link removed; "Coming soon" modules greyed and not links. Footer shows "Week 11 · 12–18 Oct", "On break until 10 Jan", "Starts Mon 20 Jul" or "Programme finished" from `/this-week`.

### This week page

Top to bottom:

1. **Header**: "Week 11", the date range, the module(s) this week, and a progress bar for `stats.done/total`.
2. **Upcoming break banner** (when `upcoming_break`): "Break coming up: 2 weeks, Mon 14 Sep – Sun 27 Sep. Week 9 starts Mon 28 Sep."
3. **Holiday note** per holiday: "Labour Day, Mon 26 Oct: campus closed."
4. **Malware banner** (when `lurking` is not empty), styled from the owner's design canvas ("Module timeline" artboard): dark card, bug icon, "MALWARE DETECTED", "N unfinished tasks are lurking in Week 9, 10." The "Quarantine them" button opens a list of those tasks grouped by week, with the normal tick rows.
5. **This week's tasks**: one block per group (submodule), unfinished prerequisites first in the existing "Before you start" box, then the task checklist. Same components and tick hook as the module page, so progress everywhere updates together.
6. **Ahead of schedule** (when `ahead`): "You're ahead of schedule 🎉" then "Next up · Week 12" with its groups, or "Week 12 isn't in the app yet" if empty.
7. **Assessments rail**: the module page's rail, extended with a status chip (Submitted / Due today / Due in N days / Overdue) and a "Mark submitted" checkbox.

Other states replace items 1, 5 and 6:

- **Break**: "You're on break 🌴 until Sun 10 Jan (week 2 of 3)", a line suggesting rest or clearing lurking tasks, and when the next week starts. Banner and rail still show.
- **Before start**: "The programme starts Mon 20 Jul." plus the rail.
- **Finished**: "You've reached the end of the programme." plus banner and rail.
- **No content this week**: header as normal, then "Content for this week isn't in the app yet." with the module's UPLearn link.

### Assessments page

A1–A8 grouped by module: title, due date, status chip, "Mark submitted" checkbox, UPLearn link. Ticking uses an optimistic update and refreshes `this-week`, `assessments` and the affected module, the same way task ticks do.

### Modules list

A module with no weeks shows as a greyed card with a "Coming soon" badge, no progress bar and no link.

## Errors

Same as now: 401 sends the user to login; 404 for unknown assessment keys; the page shows a short message with retry. A failed submitted tick rolls back and shows an inline error, matching task ticks.

## Testing

Logic written test-first.

- **Backend**: week status for each case (week 1 Monday, a Sunday, the Monday rollover, every break, before start, after end, NZ date near midnight UTC); upcoming break window (two weeks before, not three); holidays in week; lurking (including break and finished); ahead (all ticked, empty week never ahead); assessment window and status; submit/unsubmit idempotency and 404; `/me` shape; sign-up catch-up in each status (teaching, break, before start, finished), including `prefilled_through_week` and that only started submodules' prerequisites are ticked; schedule validation (non-Monday, duplicate, out of order, unknown week number, deleting an in-use intake); migration upgrade with existing users.
- **Frontend**: Vitest for every This week state (teaching, ahead, break, upcoming break, holiday, no content, before start, finished), banner and "Quarantine them", submitted tick with rollback, Assessments page, "Coming soon" card, sidebar footer text, the post-sign-up catch-up note.
- **End to end**: a browser check of the running app against the dev database.

## Docs

- CLAUDE.md: replace "Each user picks their current week manually" with the schedule/intake rule; add `seed/schedule.yaml` to the layout; update status line.
- Main design spec: update the API table and the Phases list.

## Out of scope

Part-time intake data (waiting on dates from Yoobee), an intake picker, manual week override, break dividers on the module timeline, iCal import, task time estimates ("hrs left").
