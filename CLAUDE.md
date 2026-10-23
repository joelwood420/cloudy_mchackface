# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A study tracker for the Yoobee Colleges **Diploma in Cloud Computing and Cyber Security (Level 6)**. The Yoobee UPLearn portal (https://yoobee.uplearn.education/, a Moodle site) is hard to navigate, so this app shows week by week what to work on, upcoming assessments, and progress bars per course and for the whole programme. It's built for the owner first, with the aim of opening it to other students later.

Status: Phase 3 done: This week home screen (week worked out from the intake's dates), lurking-task banner, break and holiday notices, assessments with a submitted tick, catch-up ticks at sign-up; CCC601–603 seeded, CCC604 a shell. Part-time and intake choice done: four intakes (July and Sept 2026, FT and PT), picked at sign-up and changed in Settings. Assessment resources done: each assessment has links (tutor recordings, code and data, tools, submitting) from `seed/ccc60X.yaml` plus shared ones in `seed/resources.yaml`; This week shows the ones for the current assessment tasks, the Assessments page shows them all.

## Stack and layout

Full design: `docs/superpowers/specs/2026-10-15-yoobee-study-guide-design.md`.

Monorepo. Runs locally for development; deployed to Fly.io as one container (`Dockerfile`, `fly.toml`, app `cloudy-mchackface`, region `syd`) where FastAPI also serves the built frontend:

- `frontend/`: React + Vite + TypeScript, TanStack Query. Vite proxies `/api` to the backend in dev.
- `backend/`: FastAPI, SQLAlchemy, Alembic, pytest. Serves the API under `/api`.
- `seed/`: YAML content files, one per module plus `prerequisites.yaml` (shared one-off setup steps), `resources.yaml` (assessment links shared between assessments, optional) and `schedule.yaml` (each intake's week start dates and public holidays), loaded by a CLI seed loader.
- Database: Neon. Dev branch via `DATABASE_URL`, separate test branch via `TEST_DATABASE_URL`, both in git-ignored `backend/.env` (Neon project `green-thunder-35736067`, US East; its `production` branch is unused). Prod is a separate Neon project in Sydney (`delicate-fire-20993762`); its URL lives only as the Fly secret `DATABASE_URL`. CI tests use their own Postgres container, not Neon.

Structure is **Module → Submodule (certification track) → Week → Task**, one tick per task. Submodules list shared prerequisites by key; prerequisites are never counted in progress. Every seed item has a stable `key`; the loader upserts by key so re-seeding doesn't break users' ticks. Progress is computed from completions, never stored.

## Branches and pushing

The repo is public. `main` is production: every push to it runs `.github/workflows/deploy.yml` (CI again, then `flyctl deploy`, whose release command migrates and seeds the prod DB); `dev` is where work happens. GitHub rulesets enforce the server side: `main` only takes PRs from `dev` that pass CI (`source-branch`, `backend`, `frontend` in `.github/workflows/ci.yml`), and neither branch can be deleted or force-pushed.

- Never commit to `main` locally or push to it. All work goes on `dev`, or on a feature branch cut from `dev` and merged back into `dev`.
- Never open a PR into `main` from anything but `dev`, and never merge a PR into `main`. Open the `dev` → `main` PR only when the owner asks; the owner reviews and merges it.
- Push to `dev` (or push a feature branch) only when the owner asks. Before pushing `dev`, run the same checks CI runs (backend pytest, frontend lint, test and build).
- Never delete, force-push or rewrite history on `dev` or `main`. Feature branches can be deleted once merged into `dev`, after checking with the owner.
- After the owner merges a PR, bring `dev` up to date: `git switch dev && git pull --ff-only origin main && git push`. `main` requires PRs to be up to date, so the next PR is blocked until `dev` contains `main`'s merge commit.
- Don't change rulesets, branch protection, repo visibility, Actions secrets or deploy settings without asking.

## Commands

Backend (run in `backend/`; needs `backend/.env`, see `.env.example`):

```bash
uv sync                                    # install deps
uv run uvicorn app.main:app --reload       # API on :8000
uv run pytest                              # all tests (uses TEST_DATABASE_URL)
uv run pytest tests/test_seed_apply.py::test_rerun_is_idempotent -v   # single test
uv run alembic upgrade head                # apply migrations to DATABASE_URL
uv run alembic check                       # confirm models match migrations
uv run python -m app.seed                  # validate + load seed/*.yaml
uv run python -m app.reset_password EMAIL # set a new password (prompts; ends that account's sessions)
```

- On a fresh database run `uv run alembic upgrade head` before the seed loader.
- `uv run python -m app.seed [dir]` deletes any module not present in that folder.
- Migration 0005 clears content tables; re-run the seed loader after upgrading an older database.
- The seed loader requires `schedule.yaml` and refuses to drop an intake that users are on. Migration 0008 moves existing users onto `2607-online-ccc-ft`.
- Migration 0010 replaces assessments' `due_date` with `due_week` + `due_weekday`; re-run the seed loader after upgrading.
- Migration 0011 adds `users.intake_confirmed_at`. Accounts from before intake choice are NULL and get asked for their intake on their next visit; that first choice clears their task ticks and submissions and re-does catch-up for the chosen intake.
- Migration 0012 adds assessment resources and links assessment steps to their assessment; re-run the seed loader after upgrading.
- Tests can run against a local Postgres in Docker instead of Neon (much faster): set `TEST_DATABASE_URL` to its URL on the command line.
- On Fly, `fly.toml` sets COOKIE_SECURE and TRUST_FLY_CLIENT_IP (rate limit by the real client IP). Leave both off locally.
- Prod runs on one machine (`--ha=false`) because the login rate limiter is in memory.
- There's no email reset yet. To reset a prod password: `fly ssh console -a cloudy-mchackface --pty -C "sh -c 'cd /app/backend && /opt/venv/bin/python -m app.reset_password EMAIL'"`.

Frontend (run in `frontend/`):

```bash
npm install
npm run dev                                # http://localhost:5173, proxies /api to :8000
npm test                                   # vitest
npx vitest run src/pages/ModulePage.test.tsx   # single file
npm run build                              # type check + build
npm run lint                               # oxlint
```

## MVP scope

1. **This week** (the home page): the current week's modules (with Microsoft Learn/AWS links), labs and live sessions.
2. **Progress bars:** per course and for the whole programme, driven by items the user ticks off.
3. **Deadlines:** upcoming assessments and due dates.

- Seed content is numbered in **full-time** weeks (from the FT schedule posts). A part-time intake takes two weeks per content week, with each week's tasks split in half (`backend/app/pacing.py`). Assessments are due by content week, and dates are worked out per intake. Spec: `docs/superpowers/specs/2026-10-22-part-time-intake-design.md`.
- The **current week is worked out** from the user's intake (`seed/schedule.yaml`) and today's date in NZ time. There is no manual override. Students pick their intake at sign-up and can change it in Settings; changing it only ever adds catch-up ticks, never removes any (except an older account's first confirmation, above). Breaks are the gaps between week start dates. New accounts get past weeks' tasks and past-due assessments pre-ticked; prerequisites are never pre-ticked.
- **User accounts from day one**: email + password built into FastAPI (argon2, DB-backed sessions, HTTP-only cookie). Course structure is shared reference data; completion state and settings are per user.
- Out of scope for now: certification tracking, AI study helper, automated portal sync.
- UI follows the "Module timeline" design (docs/superpowers/specs/2026-10-15-ui-redesign-design.md); module pages need a login; progress comes from each user's ticks.

## Domain

The programme is a set of UPLearn courses, each split into weeks or sections containing activities and assessments with due dates. Courses in the portal so far:

- 00A - Onboarding
- 00 - Programme Overview: Cloud Computing and Cyber Security (Level 6)
- 01 - Public Cloud Administration
- 02 - Data Engineering in the Public Cloud
- 03 - Cyber Security in the Cloud
- 04 - Multi-Cloud Security Integration and Project Management

Core data model: programme → courses → weeks → items (learning path, lab, live session, assessment), each with a due date, a completion status and a link to where the work is done.

### How the portal is structured

UPLearn is mostly a wrapper around external learning. Using course 02 (CCC602) as the example:

- **Tiles per certification track**, e.g. `DP_900_Microsoft Azure Data Fundamentals`, `Azure Data Engineer Associates`, `DEA_C01_AWS Certified Data Engineer Associate`. Each tile lists modules as a short title, bullet topics and a "Go to" URL, mostly to `learn.microsoft.com/en-us/training/paths/...` (and AWS equivalents).
- **Course schedule** tile with full-time and part-time versions. Each is a forum with one post per week, titled like `01_FT_Week_09_CCC602_...`. The post says which modules to cover that week, lab access, and assessment reminders. These posts are the main source for the week-by-week view.
- **Assessments** tile with Moodle assignments (e.g. Assessment 3: Azure Practical Scenario Evaluation; Assessment 4: Scenario-Based Activity Design and Implementation (AWS)). Due dates are in the programme guide or the portal calendar ("Upcoming events" on the dashboard).
- Labs run on Skillable (`msle.learnondemand.net`) with a tutor-supplied training key; Azure work uses a personal free-tier account (30-day credit window).

## Portal data rules

- Store **structure, metadata and public links**: course, week and module names, topic bullets, due dates, completion state, links to Microsoft Learn/AWS, and links back to the UPLearn page. This mirrors what the portal itself does.
- Don't copy Yoobee-owned files or text (assessment handouts and briefs, rubrics, tutor posts in full) into the app. Link to them on UPLearn instead.
- Never store or display lab training keys, Teams/Calendly links from tutors, the owner's portal login, or other students' data.
- How portal data gets into the app is still open: the owner recording it from their own portal notes, or an automated sync through Moodle. Don't build automated scraping or portal login handling without checking with the owner first.

## Yoobee policy constraints

Source: https://www.yoobee.ac.nz/policies-and-procedures (reviewed 2026-10-15: Academic Integrity and AI Policy v3.0, effective 15/09/2025, plus its Procedure, the Learner Rights & Responsibilities Code and the Ethics Policy).

- **No assessment help that does the work.** The policy allows AI for planning, summarising (with sources cited), explaining, technical help and handling tedious tasks. It treats AI-generated assessment content presented as the student's own as misconduct, up to serious misconduct. Any AI feature in the app must teach, quiz or explain, never write assessment answers, reports or code to submit.
- **Academic file sharing is a named breach.** Students making study or assessment materials available to others is treated as both an IP and an academic-integrity issue. In a multi-user version, never let users upload or share assessment briefs, handouts, their submissions or marked work. Shared data is limited to the schedule structure and public links.
- **Misuse of Yoobee systems is not acceptable** under the Learner Code. Automated scraping or bulk access to UPLearn needs Yoobee's OK first.
- **Ethics Policy** only matters if the app collects data about other students for research (surveys, usage studies). Don't build that without ethics approval.
- Before opening the app to other students, the owner should confirm with their tutor or programme lead.
