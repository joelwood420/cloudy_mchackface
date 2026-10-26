# Email Password Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user who forgot their password get a reset link by email (via Brevo) and set a new one.

**Architecture:** A `password_reset_tokens` table holds sha256 hashes of single-use, 1-hour tokens. Two public endpoints in `app/api/auth.py` create and redeem them; `app/mail.py` sends through Brevo's HTTP API in a background task, or logs the link when Brevo isn't configured. Two new public React pages share the login page's layout.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, httpx, pytest; React, React Router, TanStack Query, vitest.

**Spec:** `docs/superpowers/specs/2026-10-27-email-password-reset-design.md`

## Global Constraints

- Token lifetime 1 hour; `secrets.token_urlsafe(32)`; stored as `hash_token(token)` from `app/auth/sessions.py`.
- Link: `{app_url}/reset-password#token=<raw>`; never built from the request.
- Send limit: 3 reset emails per address per hour; over it, still 202, nothing sent.
- Forgot response: 202 and the same body whether or not the account exists.
- Expired/used/unknown token: 400 `This reset link has expired or has already been used. Ask for a new one.`
- Password rules: `MIN_PASSWORD_LENGTH`..`MAX_PASSWORD_LENGTH` from `app/auth/passwords.py`.
- Never log the token or link except in the "Brevo not configured" fallback.
- `backend/.env` holds a real `BREVO_API_KEY`: tests must never reach Brevo.

## Review Focus

- Tests run with the real `.env` (Brevo key present): an autouse fixture must replace the sender, or the suite emails real people. Task 2 adds it to `conftest.py`.
- Email in a different case/whitespace on the forgot form still finds the account (the `Email` schema type normalises). Task 2 test.
- Two links requested back to back: only the second works. Task 2 test.
- Reset while logged in elsewhere: all sessions end, including the current browser's. Task 2 test.
- Visiting `/reset-password` with no fragment (e.g. link mangled by a mail client): shows the expired message, not a blank form that fails later. Task 3 test.

---

### Task 1: Settings, model, migration, mail module

**Files:**
- Modify: `backend/app/config.py`, `backend/app/models.py`, `backend/pyproject.toml` (+ `uv.lock`), `backend/.env.example`
- Create: `backend/alembic/versions/0013_password_reset_tokens.py`, `backend/app/mail.py`
- Test: `backend/tests/test_mail.py`, `backend/tests/test_migrations.py` (existing test covers the model/migration match)

**Interfaces:**
- Produces: `Settings.brevo_api_key: str | None`, `Settings.mail_from: str | None`, `Settings.mail_from_name: str = "Cloudy McHackface"`, `Settings.app_url: str = "http://localhost:5173"`.
- Produces: `models.PasswordResetToken(token_hash: str PK(64), user_id: int FK users.id CASCADE indexed, created_at, expires_at)`.
- Produces: `app.mail.send_password_reset(to_email: str, link: str) -> None`; `app.mail.BREVO_URL = "https://api.brevo.com/v3/smtp/email"`.

- [ ] **Step 1: Tests in `tests/test_mail.py`**
  - `test_logs_the_link_when_brevo_is_not_configured`: with settings lacking key → no HTTP call (monkeypatch `httpx.post` to fail), link appears in `caplog` at WARNING.
  - `test_posts_to_brevo`: with key + mail_from set, `httpx.post` is called once with `BREVO_URL`, header `api-key`, JSON `sender == {"email": ..., "name": "Cloudy McHackface"}`, `to == [{"email": to}]`, subject `Reset your Cloudy McHackface password`, link in both `textContent` and `htmlContent`.
  - `test_brevo_failure_is_logged_without_the_link`: `httpx.post` returns 401 → no exception, log has the status, log does not contain the link.
- [ ] **Step 2: Run, expect failures.** `TEST_DATABASE_URL=postgresql://ci:ci@localhost:55432/studyguide_test uv run pytest tests/test_mail.py -v`
- [ ] **Step 3: Implement.** Settings fields; model; migration 0013 (revises 0012); `uv add httpx` (remove from dev group); `.env.example` keys `BREVO_API_KEY=`, `MAIL_FROM=`, `APP_URL=http://localhost:5173`. `send_password_reset` reads `get_settings()`, timeout 10s, catches `httpx.HTTPError` and non-2xx.
- [ ] **Step 4: Run `tests/test_mail.py tests/test_migrations.py`, expect pass.**
- [ ] **Step 5: Commit** `feat: Brevo mail sender and password reset token table`

### Task 2: Forgot and reset endpoints

**Files:**
- Modify: `backend/app/api/auth.py`, `backend/app/api/schemas.py`, `backend/app/auth/ratelimit.py`, `backend/tests/conftest.py`
- Create: `backend/app/auth/password_reset.py`
- Test: `backend/tests/test_password_reset_api.py`

**Interfaces:**
- Consumes: Task 1's model and `send_password_reset`.
- Produces: `password_reset.RESET_LIFETIME = timedelta(hours=1)`; `create_reset_token(db, user, now=None) -> str` (deletes user's older tokens and all expired tokens; caller commits); `redeem_reset_token(db, token, password, now=None) -> bool` (sets hash, deletes user's sessions and tokens; caller commits).
- Produces: `ratelimit.reset_send_limiter = RateLimiter(limit=3, window=60 * 60)`.
- Produces: `POST /api/auth/forgot-password` `{email}` → 202 `{"detail": "If there's an account for that email, we've sent a reset link."}`; `POST /api/auth/reset-password` `{token, password}` → 204 or 400.
- Produces (conftest): autouse fixture `sent_emails` that monkeypatches `app.api.auth.send_password_reset` with a recorder (list of `(to, link)`), and resets `reset_send_limiter` alongside the others.

- [ ] **Step 1: Tests in `tests/test_password_reset_api.py`** (token taken from the recorded link after `#token=`):
  - `test_forgot_sends_a_link_built_from_app_url` (link starts with `get_settings().app_url + "/reset-password#token="`; email given as `"  JOEL@example.com "`)
  - `test_unknown_email_gets_the_same_answer_and_no_email`
  - `test_reset_changes_password_and_ends_every_session` (user_client's own `/api/me` is 401 after; new password logs in, old doesn't)
  - `test_link_works_once`, `test_newer_link_replaces_older`, `test_expired_link_is_refused` (set `expires_at` in the past on the row), `test_bad_token_is_refused` (all 400 with the exact message)
  - `test_reset_enforces_password_length` (7 chars → 422)
  - `test_fourth_request_in_an_hour_sends_nothing` (4 × 202, 3 emails)
- [ ] **Step 2: Run, expect failures.**
- [ ] **Step 3: Implement.** Schemas `ForgotPasswordIn(email: Email)`, `ResetPasswordIn(token: str 1..200, password: same constraints as SignupIn)`. Forgot uses `_limit`, looks up the user, checks `reset_send_limiter.hit(f"reset:{email}")`, creates the token, commits, `background_tasks.add_task(send_password_reset, email, link)`. Reset limits by IP only (`ip_limiter`).
- [ ] **Step 4: Run `tests/test_password_reset_api.py tests/test_auth_api.py tests/test_reset_password.py`, expect pass.**
- [ ] **Step 5: Commit** `feat: forgot-password and reset-password endpoints`

### Task 3: Frontend pages

**Files:**
- Modify: `frontend/src/api.ts`, `frontend/src/App.tsx`, `frontend/src/pages/AuthPage.tsx`, `frontend/src/index.css` (only if a notice style is missing)
- Create: `frontend/src/pages/PasswordResetPages.tsx`
- Test: `frontend/src/pages/PasswordResetPages.test.tsx`, `frontend/src/pages/AuthPage.test.tsx`

**Interfaces:**
- Produces: `requestPasswordReset(email: string): Promise<unknown>`, `resetPassword(token: string, password: string): Promise<void>` in `api.ts`.
- Produces: `AuthShell({ greeting, title, mode, children })` and `FieldError` exported from `AuthPage.tsx`; `ForgotPasswordPage`, `ResetPasswordPage` exported from `PasswordResetPages.tsx`; public routes `/forgot-password`, `/reset-password`.
- Login page reads `location.state.notice` (string) and shows it above the form.

- [ ] **Step 1: Tests**
  - Login page has link "Forgot your password?" → `/forgot-password`; old "ask the app's owner" text gone.
  - Forgot: type email, submit → POST body `{email}`; shows "If there's an account for that email, we've sent a link to reset your password. It expires in an hour. Check your spam folder if it doesn't arrive."
  - Reset: `renderAt('/reset-password#token=abc')` → submit new password → POST `{token: 'abc', password}`; lands on login showing "Password changed. Log in with your new password."; `window.location.hash` is empty after load.
  - Reset 400 → shows the server message and a link to `/forgot-password`.
  - Reset with no fragment → expired message and link, no form.
- [ ] **Step 2: Run `npx vitest run src/pages/PasswordResetPages.test.tsx src/pages/AuthPage.test.tsx`, expect failures.**
- [ ] **Step 3: Implement.** Extract the page shell from `AuthPage` into `AuthShell`; new pages use it. Reset page reads the token once into state on mount and clears it with `history.replaceState(null, '', location.pathname)`.
- [ ] **Step 4: Run the tests, `npm run lint`, `npm run build`; expect pass.**
- [ ] **Step 5: Commit** `feat: forgot and reset password pages`

### Task 4: Docs and deploy config

**Files:** `CLAUDE.md`, `backend/app/reset_password.py` (docstring), `fly.toml` (`APP_URL = "https://cloudy-mchackface.fly.dev"` under `[env]`)

- [ ] **Step 1:** Update the docs: email reset exists; CLI stays as fallback; new settings; `BREVO_API_KEY` and `MAIL_FROM` are Fly secrets.
- [ ] **Step 2:** Commit `docs: email password reset`
