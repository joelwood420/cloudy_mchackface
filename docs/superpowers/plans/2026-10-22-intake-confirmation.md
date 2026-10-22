# Intake confirmation prompt: plan and handoff

Status: in progress on branch `feat/intake-confirm` (from `dev`). When it's done, merge it into `dev` and push `dev`; that updates PR #13 (`dev` → `main`). Never merge into `main`. The owner does that.

## Why

Before PR #13, every account was put on July 2026 FT automatically. A few part-time students have already signed up and are on the wrong intake. At sign-up, the app also ticked off every week that was past on the FT calendar, which is about twice as far as a PT student has reached.

## What to build

1. **Backend: track confirmation.**
   - Migration `0011`: `users.intake_confirmed_at` (timestamptz, nullable). Existing accounts stay NULL, meaning unconfirmed.
   - Sign-up sets it to now, because the student picked an intake on the form.
   - `PUT /api/me/settings` sets it to now.
   - `MeOut` gains `intake_confirmed: bool`.
2. **Backend: redo sign-up ticks on first confirmation.**
   - When an unconfirmed user saves an intake that differs from their current one, delete the ticks catch-up added at sign-up, then run catch-up for the new intake.
   - Catch-up ticks are the rows written in the sign-up transaction. Their `completed_at` / `submitted_at` equals `users.created_at`, because Postgres `now()` is the transaction start time. That covers `task_completions`, `assessment_submissions` and `prerequisite_completions`.
   - Ticks the student made later have later timestamps, so they stay.
   - Confirming the same intake changes no ticks. Once a user is confirmed, never delete ticks again (the existing rule).
3. **Frontend: `IntakeGate`.**
   - Like `DisclaimerGate`, but it sits inside the logged-in app (under `RequireAuth`).
   - If `me.intake_confirmed` is false, show a card titled "Which intake are you on?". It holds the intake dropdown (from `useIntakes`), preselected to the current intake, and a "Confirm" button that calls `updateSettings`.
   - On success, set `['me']` and invalidate `this-week`, `modules`, `module` and `assessments`, like `SettingsPage` does.
4. **Tests.**
   - Backend:
     - Existing users are unconfirmed after the migration.
     - Sign-up is confirmed.
     - Confirming a different intake removes the sign-up ticks and re-ticks for the new intake, but keeps a manual tick made later.
     - Confirming the same intake keeps every tick.
     - After confirmation, changing again never removes ticks.
   - Frontend:
     - The gate shows only when unconfirmed, and confirming calls PUT and lets the student through.
5. **Docs.** Add a line to CLAUDE.md under the migrations notes. Update the PR #13 description with a short section on this.

## Checks before pushing

- Backend: `cd backend && TEST_DATABASE_URL=postgresql://ci:ci@localhost:55432/studyguide_test uv run pytest` and `uv run alembic check`. Start Docker first with `docker start cloudy-test-pg`.
- Frontend: `cd frontend && npm run lint && npm test && npm run build`.
- Apply `uv run alembic upgrade head` to the dev DB.

## Progress

- [ ] 1 backend confirmation field
- [ ] 2 redo sign-up ticks
- [ ] 3 frontend gate
- [ ] 4 tests
- [ ] 5 docs + merge into dev + push + PR description
