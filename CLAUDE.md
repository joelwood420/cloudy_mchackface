# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A study tracker for the Yoobee Colleges **Diploma in Cloud Computing and Cyber Security (Level 6)**. The Yoobee UPLearn portal (https://yoobee.uplearn.education/, a Moodle site) is hard to navigate, so this app shows week by week what to work on, upcoming assessments, and progress bars per course and for the whole programme. It's built for the owner first, with the aim of opening it to other students later.

Status: Phase 2 done — accounts, task and prerequisite ticking, real progress bars and a current-week setting; CCC601–603 seeded with submodules.

## Stack and layout

Full design: `docs/superpowers/specs/2026-10-15-yoobee-study-guide-design.md`.

Monorepo, built and run locally first; Fly.io deployment comes later (phase 5):

- `frontend/`: React + Vite + TypeScript, TanStack Query. Vite proxies `/api` to the backend in dev.
- `backend/`: FastAPI, SQLAlchemy, Alembic, pytest. Serves the API under `/api`.
- `seed/`: YAML content files, one per module plus `prerequisites.yaml` (shared one-off setup steps), loaded by a CLI seed loader.
- Database: Neon. Dev branch via `DATABASE_URL`, separate test branch via `TEST_DATABASE_URL`, both in git-ignored `backend/.env`.

Structure is **Module → Submodule (certification track) → Week → Task**, one tick per task. Submodules list shared prerequisites by key; prerequisites are never counted in progress. Every seed item has a stable `key`; the loader upserts by key so re-seeding doesn't break users' ticks. Progress is computed from completions, never stored.

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
```

- On a fresh database run `uv run alembic upgrade head` before the seed loader.
- `uv run python -m app.seed [dir]` deletes any module not present in that folder.
- Migration 0005 clears content tables; re-run the seed loader after upgrading an older database.
- Set COOKIE_SECURE=true in backend/.env once the app is served over HTTPS.

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

1. **This week:** the current week's modules (with Microsoft Learn/AWS links), labs and live sessions.
2. **Progress bars:** per course and for the whole programme, driven by items the user ticks off.
3. **Deadlines:** upcoming assessments and due dates.

- The owner studies **full-time**, so seed data comes from the FT schedule posts. Keep study mode (FT/PT) as a per-user setting in the model so part-time students can be added later.
- Each user picks their **current week manually**; it is not derived from dates. Assessments still show real due dates.
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
- How portal data gets into the app is still open: Claude collecting it in browser sessions and importing it, or an automated sync through Moodle. Don't build automated scraping or portal login handling without checking with the owner first.

## Yoobee policy constraints

Source: https://www.yoobee.ac.nz/policies-and-procedures (reviewed 2026-10-15: Academic Integrity and AI Policy v3.0, effective 15/09/2025, plus its Procedure, the Learner Rights & Responsibilities Code and the Ethics Policy).

- **No assessment help that does the work.** The policy allows AI for planning, summarising (with sources cited), explaining, technical help and handling tedious tasks. It treats AI-generated assessment content presented as the student's own as misconduct, up to serious misconduct. Any AI feature in the app must teach, quiz or explain, never write assessment answers, reports or code to submit.
- **Academic file sharing is a named breach.** Students making study or assessment materials available to others is treated as both an IP and an academic-integrity issue. In a multi-user version, never let users upload or share assessment briefs, handouts, their submissions or marked work. Shared data is limited to the schedule structure and public links.
- **Misuse of Yoobee systems is not acceptable** under the Learner Code. Automated scraping or bulk access to UPLearn needs Yoobee's OK first.
- **Ethics Policy** only matters if the app collects data about other students for research (surveys, usage studies). Don't build that without ethics approval.
- Before opening the app to other students, the owner should confirm with their tutor or programme lead.
