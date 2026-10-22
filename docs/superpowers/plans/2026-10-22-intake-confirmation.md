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
2. **Backend: start ticks over on first confirmation** (owner, 2026-10-22).
   - When an unconfirmed user saves any intake, including the one they're already on, delete all their task ticks and assessment submissions, then pre-tick everything in their past weeks for the chosen intake.
   - Prerequisite ticks are kept.
   - **Prerequisites are never pre-ticked anywhere:** not at sign-up, not on an intake change, not at confirmation. This is done in `app/catchup.py`.
   - Once a user is confirmed, intake changes only ever add ticks.
3. **Frontend: `IntakeGate`.**
   - Like `DisclaimerGate`, but it sits inside the logged-in app (under `RequireAuth`).
   - If `me.intake_confirmed` is false, show a card titled "Which intake are you on?". It holds the intake dropdown (from `useIntakes`), preselected to the current intake, and a "Confirm" button that calls `updateSettings`.
   - On success, set `['me']` and invalidate `this-week`, `modules`, `module` and `assessments`, like `SettingsPage` does.
4. **Tests.**
   - Backend (done, `tests/test_settings_api.py`, `test_migrations.py`, `test_catchup.py`):
     - Existing users are unconfirmed after the migration.
     - Sign-up is confirmed.
     - First confirmation starts the ticks over (same or different intake) and keeps prerequisite ticks.
     - After confirmation, changing again never removes ticks.
   - Frontend:
     - The gate shows only when unconfirmed, and confirming calls PUT and lets the student through.
5. **Docs.** Add a line to CLAUDE.md under the migrations notes. Update the PR #13 description with a short section on this.

## Checks before pushing

- Backend: `cd backend && TEST_DATABASE_URL=postgresql://ci:ci@localhost:55432/studyguide_test uv run pytest` and `uv run alembic check`. Start Docker first with `docker start cloudy-test-pg`.
- Frontend: `cd frontend && npm run lint && npm test && npm run build`.
- Apply `uv run alembic upgrade head` to the dev DB.

## Progress

- [x] 1 backend confirmation field
- [x] 2 start ticks over + no prerequisite pre-ticks
- [ ] 3 frontend gate
- [ ] 4 tests
- [ ] 5 docs + merge into dev + push + PR description
