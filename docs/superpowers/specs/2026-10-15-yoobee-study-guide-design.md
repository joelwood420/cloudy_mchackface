# Yoobee Study Guide — Design

Date: 2026-10-15
Status: approved in chat, pending spec review

## Goal

A friendlier week-by-week guide for the Yoobee Level 6 Diploma in Cloud Computing and Cyber Security. Students see each module broken into weeks, each week broken into tasks, tick tasks off, and see progress roll up. The app links out to where work is done (Microsoft Learn, AWS, Skillable, UPLearn); it does not host course content or take submissions.

Success: the owner can open the app, pick their current week, see exactly what to do, tick it off, and see progress per week, per module and for the whole programme.

## Scope

In scope (phases 1–4, all local):

- Module → week → task structure, loaded from seed files
- Email/password accounts
- Ticking tasks, choosing current week, progress bars
- "This week" view with upcoming assessment due dates
- Full-time schedule content for all six modules

Out of scope for now: Fly deployment, part-time schedules, password reset email, admin screen, certification tracking, AI study helper, automated portal sync, Microsoft sign-in.

Constraints from Yoobee policy (see CLAUDE.md): store structure, metadata and public links only; no Yoobee-owned files or assessment content; no sharing of student work.

## Decisions

| Topic | Decision |
|---|---|
| Structure | Module → Week → Task; one tick per task |
| Current week | Chosen manually by each student |
| Content source | Seed files in the repo, written from the owner's own portal notes |
| Auth | Email + password built into FastAPI |
| Database | Neon (dev branch locally, separate test branch for tests) |
| Delivery | Thin slice first: one module end to end, then widen |
| Environment | Local only until phase 5 |

## Architecture

```
browser ── React (Vite dev server :5173) ──/api proxy──► FastAPI (:8000) ──► Neon Postgres
                                                              ▲
                                           seed/*.yaml ── seed loader (CLI command)
```

- `frontend/`: React + Vite + TypeScript, TanStack Query for data fetching. Vite proxies `/api` to the backend in development.
- `backend/`: FastAPI, SQLAlchemy, Alembic migrations, pytest.
- `seed/`: YAML content files, one per module.

## Data model

Shared content (written only by the seed loader):

- `modules`: key, code (e.g. CCC602), title, order
- `weeks`: key, module_id, week_number (programme-wide, e.g. 9), title, order
- `tasks`: key, week_id, title, type (`learning_path` | `lab` | `assessment_step`), external_url, uplearn_url (nullable), order
- `assessments`: key, module_id, title, due_date (nullable), uplearn_url

Per user:

- `users`: id, email (unique, lowercased), password_hash, created_at
- `sessions`: token_hash, user_id, created_at, expires_at
- `task_completions`: user_id, task_id, completed_at (unique on user_id + task_id)
- `user_settings`: user_id, intake (study mode comes from the intake)

Rules:

- Every seed item has a stable, human-readable `key` (e.g. `ccc602-w09-dp900-lp1`). The loader upserts by key, so re-running it updates content without breaking completions. Items removed from seed files are deleted along with their completions.
- Progress is computed, never stored: completed tasks ÷ total tasks, at week, module and programme level. An empty week or module shows 0%.

## Seed file format

```yaml
module:
  key: ccc602
  code: CCC602
  title: Data Engineering in the Public Cloud
  order: 2
weeks:
  - key: ccc602-w09
    week_number: 9
    title: DP-900 Learning Paths 1–4
    tasks:
      - key: ccc602-w09-dp900-lp1
        title: "Explore core data concepts"
        type: learning_path
        external_url: https://learn.microsoft.com/en-us/training/paths/azure-data-fundamentals-explore-core-data-concepts/
assessments:
  - key: ccc602-a3
    title: "Assessment 3: Azure Practical Scenario Evaluation"
    due_date: 2026-10-25
    uplearn_url: https://yoobee.uplearn.education/...
```

The loader validates all files before writing (required fields, duplicate keys, URL format, task types) and writes nothing if any check fails.

## Screens

1. Sign up / Log in
2. Modules: card per module with progress bar
3. Module page: weeks in order with progress bars, expandable task checklists with tick boxes and "Open" links
4. This week: tasks for the chosen week across modules, plus upcoming assessments (the home page)
5. Assessments: every assessment with a submitted tick

## API

All routes under `/api`. Login required except signup, login and (in phase 1 only) module reads.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/signup` | Create account, start session |
| POST | `/auth/login` | Start session |
| POST | `/auth/logout` | End session |
| GET | `/me` | Current user and settings |
| GET | `/modules` | Modules with the user's progress |
| GET | `/modules/{key}` | Weeks, tasks, user's ticks and progress |
| PUT | `/tasks/{key}/complete` | Tick (idempotent) |
| DELETE | `/tasks/{key}/complete` | Untick (idempotent) |
| GET | `/this-week` | Current week (from the intake's dates), lurking tasks, breaks, holidays, deadlines |
| GET | `/assessments` | Every assessment with the user's submitted state |
| PUT, DELETE | `/assessments/{key}/submitted` | Mark submitted / not submitted (idempotent) |

## Security

- Passwords hashed with argon2; minimum length 10.
- Sessions: random token in an HTTP-only, SameSite=Lax cookie; only a hash of the token is stored. Sessions expire after 30 days.
- Login and signup are rate-limited per IP and per email.
- Auth errors don't reveal whether an email is registered.
- `DATABASE_URL` and other secrets live in `backend/.env` (git-ignored); `backend/.env.example` holds placeholders.

## Errors

- API: 401 not logged in, 404 unknown key, 409 email taken on signup (generic message), 422 invalid input. Frontend shows a short message with retry.
- Seed loader: validates first, reports every problem with file and key, exits non-zero without writing.

## Testing

- Backend: pytest against a dedicated Neon test branch (`TEST_DATABASE_URL`). Covers auth, sessions, ticking, progress maths and seed validation/upsert.
- Frontend: Vitest + React Testing Library for progress bars and the task checklist.
- Logic (progress maths, seed validation, auth) is written test-first.

## Phases

1. **Skeleton + one module**: repo layout, FastAPI + Neon + Alembic, seed format and loader, CCC602 seeded, read-only module and week browsing without login.
2. **Accounts + ticking**: signup/login/logout, ticking tasks, current week setting, progress bars at all levels.
3. **This week + deadlines** (done): "This week" home screen with upcoming assessments. See `2026-10-17-phase-3-this-week-design.md`.
4. **All content**: seed the remaining five modules from the FT schedule.
5. **Later**: Fly.io deployment, part-time schedules, password reset email, check with tutor before sharing, admin screen, certification tracking.
