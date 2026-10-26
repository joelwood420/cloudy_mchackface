# Email password reset

Date: 2026-10-27. Status: design, waiting for the owner's review.

## Why

A user who forgets their password can't get back in on their own. The only fix today is the owner running `app.reset_password` over `fly ssh` for them, and the login page says "ask the app's owner". With up to about 20 users that's workable but awkward, and it puts the owner in the middle of every lockout.

This adds the usual "Forgot your password?" flow: enter your email, get a link, set a new password. Success is a locked-out user getting back in without the owner doing anything.

## Goals

- "Forgot your password?" link on the login page, replacing the "ask the app's owner" line.
- A page to ask for a reset link by email.
- An email (sent through Brevo) with a link that lets the user set a new password.
- Setting the new password ends every session for that account, the same as the CLI reset.

## Non-goals

- No custom domain. Brevo sends from one verified address (the owner's). Some reset emails may land in spam; the "check your spam folder" line on the confirmation screen covers that.
- No email verification at sign-up, no "change email", no other emails (reminders, digests).
- No change-password screen in Settings for logged-in users. Separate feature if wanted.
- The CLI reset stays as it is, as a fallback.

## Anti-goals (a failure even if it works)

- Telling an attacker whether an email has an account. The request page gives the same answer, in roughly the same time, whether or not the account exists.
- A reset link that keeps working: after use, after an hour, or after a newer link is sent.
- Raw reset tokens anywhere they can leak: the database, server logs, or the `Referer` header.
- Reset links built from the request's `Host` header (lets an attacker point the link at their own site).
- Someone using the form to flood a user's inbox or burn through Brevo's 300-a-day free limit.
- The Brevo API key in the repo (the repo is public), or the owner's sender email in the repo.

## Decided

### Owner's setup (done or to do outside the code)

- `BREVO_API_KEY` is set in `backend/.env` and as a Fly secret (staged). Done.
- In Brevo, verify the sender address (Settings → Senders).
- Set `MAIL_FROM` (that sender address) in `backend/.env` and as a Fly secret. It's the owner's personal email, so it stays out of the public repo.

### Settings (`backend/app/config.py`)

- `brevo_api_key: str | None = None`
- `mail_from: str | None = None`
- `mail_from_name: str = "Cloudy McHackface"`
- `app_url: str = "http://localhost:5173"`: the base for links in emails. Prod sets `APP_URL = "https://cloudy-mchackface.fly.dev"` in `fly.toml` `[env]` (not secret).
- If `brevo_api_key` or `mail_from` is unset (local dev, tests, CI), nothing is sent and the reset link is written to the server log instead, at WARNING level, so local testing works without Brevo.
- `.env.example` gets the new keys with placeholder values.

### Data

New table `password_reset_tokens` (migration 0013):

- `token_hash` (sha256 hex of the raw token, primary key), `user_id` (FK to users, cascade delete, indexed), `expires_at` (timestamptz), `created_at`.
- Raw token: `secrets.token_urlsafe(32)`, reusing `hash_token` from `app/auth/sessions.py`.
- Lifetime: 1 hour.
- Asking for a new link deletes that user's older tokens, so only the newest link works.
- Using a link deletes all of that user's tokens.
- Expired rows for any user are deleted whenever someone asks for a link (cheap housekeeping; no cron).

### API (`backend/app/api/auth.py`)

`POST /api/auth/forgot-password` with `{email}`:

- Email is trimmed and lower-cased, same as sign-up and login.
- Rate limited with the existing `_limit` (IP and email limiters), plus a stricter limiter for sends: at most 3 reset emails per email address per hour. Over that limit, still return the normal 202 response but send nothing, so the limit doesn't reveal anything.
- If an account exists: create a token, then send the email in a FastAPI `BackgroundTasks` job so the response doesn't wait on Brevo (keeps timing the same either way).
- Always returns `202` with no body detail beyond a generic message.

`POST /api/auth/reset-password` with `{token, password}`:

- Password rules are the same as sign-up (8 to `MAX_PASSWORD_LENGTH` characters; reuse the existing validation).
- Rate limited by IP.
- Token missing, unknown or expired: `400` "This reset link has expired or has already been used. Ask for a new one."
- Otherwise: set the new password hash, delete all the user's sessions and reset tokens, commit. Returns `204`. It does not log the user in; the frontend sends them to the login page.

### Sending (`backend/app/mail.py`, new)

- One function, `send_password_reset(to_email, link)`, that POSTs to Brevo's transactional email API (`https://api.brevo.com/v3/smtp/email`, `api-key` header) with sender, recipient, subject, plain-text and simple HTML bodies.
- `httpx` moves from the dev dependency group to the main dependencies.
- Timeout of about 10 seconds. A failure is logged (status code and Brevo's error message, never the link or token) and swallowed; the user already got the generic response.
- Tests replace the sender with a fake that records calls; no test talks to Brevo.

### The email

- Subject: "Reset your Cloudy McHackface password".
- Body (plain and HTML versions): someone asked to reset the password for this email; the link; it works once and expires in an hour; if you didn't ask, ignore this email and your password stays the same.
- Link: `{app_url}/reset-password#token=<raw token>`. The token goes in the URL fragment, which browsers never send to the server or in `Referer`, so it stays out of access logs.

### Frontend

- **Login page:** the "There's no email reset yet…" line becomes a "Forgot your password?" link to `/forgot-password`.
- **`/forgot-password`:** same look as the login page. One email field and a "Send reset link" button. After submitting, whatever the answer: "If there's an account for that email, we've sent a link to reset your password. It expires in an hour. Check your spam folder if it doesn't arrive." Link back to login. 429 shows the existing "too many attempts" message.
- **`/reset-password`:** reads the token from the URL fragment, then removes it from the address bar (`history.replaceState`). One new-password field with the sign-up hint (at least 8 characters). On success, go to `/login` with a notice: "Password changed. Log in with your new password." On 400, show the expired-link message with a link to `/forgot-password`. No token in the URL: show the same expired-link message.
- Both routes are public, alongside `/login` and `/signup`.

### Docs

- `CLAUDE.md`: drop "There's no email reset yet", note the new settings and that the CLI reset still exists as a fallback.
- `app/reset_password.py` docstring: same update.

### Tests

- Backend: request for a real account creates one token and calls the fake sender with a link built from `app_url`; unknown email returns the same 202 and sends nothing; a second request makes the first token stop working; reset with a good token changes the password, ends sessions and deletes tokens; reusing a token, an expired token and a bad token all give 400; password length rules; send limit (fourth request in an hour sends nothing but still returns 202); no Brevo key means the link is logged instead of sent.
- Frontend: forgot page shows the same confirmation on success; reset page reads and clears the fragment, submits, redirects to login with the notice, and shows the expired message on 400.

## Calls made by Claude (owner to check)

- Link lifetime of 1 hour.
- No auto-login after reset; user goes to the login page.
- New password typed once (matching sign-up), not twice.
- Send limit of 3 emails per address per hour.
- Token in the URL fragment rather than a query string.
- `APP_URL` in `fly.toml` (a deploy config change), `MAIL_FROM` as a Fly secret.
- `httpx` as a runtime dependency rather than hand-rolling the request with `urllib`.

## Left to the builder

- Exact page copy beyond what's above, and component structure (reusing `AuthPage` pieces versus new pages).
- Exact limiter numbers for the reset-password endpoint.
- HTML email styling (keep it plain).
