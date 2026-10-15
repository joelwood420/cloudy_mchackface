# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the frontend to the "Module timeline" design (sidebar shell, progress card, weekly timeline, assessments rail) without ticking or current-week features, and add a per-module portal link.

**Architecture:** Backend gains one nullable column (`modules.uplearn_url`) through migration, seed and API. Frontend gets design tokens in `index.css`, small shared pieces (`format.ts`, `ProgressBar`, `ExternalLink`), an `AppShell` layout route with a `Sidebar`, a restyled `ModulesPage`, and a `ModulePage` composed of `ModuleHeader`, `ProgressCard`, `WeekTimeline`/`WeekCard`/`TaskRow` and `AssessmentsRail`.

**Tech Stack:** FastAPI, SQLAlchemy 2, Alembic, Pydantic 2, pytest; React, Vite, TypeScript, TanStack Query, React Router, Vitest, React Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-15-ui-redesign-design.md`

## Global Constraints

- Tick boxes are rendered **disabled**. No ticking, no browser storage, no current-week logic, no status chips, no "Jump to this week".
- Every progress bar shows 0; the progress card shows the note `Progress tracking arrives with sign-in.` exactly.
- Week counts come from data: summary line format `Weeks 9–16 · 8 weeks · 40 tasks` (en dash between week numbers, middle dot separators).
- External links: `target="_blank" rel="noopener noreferrer"`.
- Colours and fonts only from the tokens in `frontend/src/index.css` (Task 2). Fonts: Schibsted Grotesk, IBM Plex Sans, IBM Plex Mono via Google Fonts.
- Interactive targets ≥ 44px; real `<button>`, `<a>`, `<input>`+`<label>`; decorative SVGs `aria-hidden="true"`.
- `backend/.env` holds secrets: never print, read aloud or commit it.
- Commit messages end with a blank line then `Co-Authored-By: Claude <model name> <noreply@anthropic.com>`.
- Backend commands run from `backend/` (`uv run ...`), frontend from `frontend/` (`npm ...`), Git Bash on Windows.

## Review Focus

1. A week with zero tasks must expand to "No tasks listed for this week." rather than an empty panel. Pinned in Task 5.
2. An assessment due today, tomorrow, or already past must read "Due today", "1 day", "N days overdue" — never "0 days" or "-2 days" — and must not shift a day across time zones. Pinned in Task 4.
3. A module with no `uplearn_url` must hide "Open in Yoobee portal", not render a dead link. Pinned in Tasks 4 and 5.
4. The sidebar's module list failing must not break or add an error to the page. Pinned in Task 3.
5. Two links with the same visible name (sidebar module link and module card link) must not make pages ambiguous to assistive tech: page tests scope queries to `main`/`navigation`. Pinned in Task 3.

## File Structure

```
backend/
  alembic/versions/0002_module_uplearn_url.py   new column
  app/models.py                                 Module.uplearn_url
  app/seed/schema.py                            SeedModule.uplearn_url
  app/seed/loader.py                            write it
  app/api/schemas.py, app/api/modules.py        return it
  tests/...                                     updated/new tests
seed/ccc602.yaml                                module.uplearn_url
frontend/
  index.html                                    Google Fonts links
  src/index.css                                 tokens + all styles (replaced)
  src/api.ts                                    uplearn_url on module types
  src/format.ts (+ format.test.ts)              dates, plurals, countdown, summary
  src/components/ProgressBar.tsx (+ test)
  src/components/ExternalLink.tsx
  src/components/AppShell.tsx
  src/components/Sidebar.tsx (+ Sidebar.test.tsx)
  src/components/AssessmentsRail.tsx (+ test)
  src/components/module/ModuleHeader.tsx
  src/components/module/ProgressCard.tsx
  src/components/module/WeekTimeline.tsx        WeekTimeline, WeekCard, TaskRow
  src/pages/ModulesPage.tsx (+ test)            restyled
  src/pages/ModulePage.tsx (+ test)             recomposed
  src/pages/NotFoundPage.tsx (+ test)
  src/App.tsx                                   AppShell layout route
  src/test/utils.tsx                            mockApi()
```

---

### Task 1: Module portal link (backend + seed)

**Files:**
- Create: `backend/alembic/versions/0002_module_uplearn_url.py`
- Modify: `backend/app/models.py`, `backend/app/seed/schema.py`, `backend/app/seed/loader.py`, `backend/app/api/schemas.py`, `backend/app/api/modules.py`, `seed/ccc602.yaml`
- Test: `backend/tests/test_modules_api.py`, `backend/tests/test_seed_apply.py`, `backend/tests/test_seed_files.py`

**Interfaces:**
- Produces: `Module.uplearn_url: str | None`; `SeedModule.uplearn_url: HttpUrl | None`; JSON field `uplearn_url` (string or null) on every item of `GET /api/modules` and on `GET /api/modules/{key}`.

- [ ] **Step 1: Write the failing tests**

In `backend/tests/test_modules_api.py`:
- In `add_content`, construct the CCC602 module with `uplearn_url="https://up.test/602"`: `Module(key="ccc602", code="CCC602", title="Data Engineering", position=2, uplearn_url="https://up.test/602")`.
- Replace the expected list in `test_list_modules_in_order_with_counts` with:

```python
    assert response.json() == [
        {"key": "ccc601", "code": "CCC601", "title": "Public Cloud Administration", "week_count": 0, "task_count": 0, "uplearn_url": None},
        {"key": "ccc602", "code": "CCC602", "title": "Data Engineering", "week_count": 2, "task_count": 2, "uplearn_url": "https://up.test/602"},
    ]
```

- In `test_module_detail`, add after `body = ...`:

```python
    assert body["uplearn_url"] == "https://up.test/602"
```

Append to `backend/tests/test_seed_apply.py`:

```python
def test_module_uplearn_url_is_stored_and_cleared(db):
    with_link = SeedFile.model_validate(
        {
            "module": {
                "key": "ccc602", "code": "CCC602", "title": "Data Engineering", "order": 2,
                "uplearn_url": "https://yoobee.uplearn.education/course/view.php?id=548",
            }
        }
    )
    apply_seed(db, [with_link])
    assert db.scalars(select(Module.uplearn_url)).one() == "https://yoobee.uplearn.education/course/view.php?id=548"

    apply_seed(db, [seed([])])
    assert db.scalars(select(Module.uplearn_url)).one() is None
```

Append to `backend/tests/test_seed_files.py`:

```python
def test_ccc602_has_portal_link():
    seeds = {s.module.key: s for s in load_seed_dir(DEFAULT_SEED_DIR)}
    assert str(seeds["ccc602"].module.uplearn_url) == "https://yoobee.uplearn.education/course/view.php?id=548"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest -q`
Expected: failures in the three files (`TypeError: 'uplearn_url' is an invalid keyword argument for Module`, extra-field validation error, missing key).

- [ ] **Step 3: Implement**

`backend/app/models.py`, in `class Module`, after `position: Mapped[int]`:

```python
    uplearn_url: Mapped[str | None] = mapped_column(String(1000))
```

`backend/alembic/versions/0002_module_uplearn_url.py`:

```python
"""module uplearn url

Revision ID: 0002
Revises: 0001
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("modules", sa.Column("uplearn_url", sa.String(1000), nullable=True))


def downgrade() -> None:
    op.drop_column("modules", "uplearn_url")
```

`backend/app/seed/schema.py`, in `class SeedModule`, after `order: int`:

```python
    uplearn_url: HttpUrl | None = None
```

`backend/app/seed/loader.py`, directly after the line `module.code, module.title, module.position = sm.code, sm.title, sm.order`:

```python
        module.uplearn_url = str(sm.uplearn_url) if sm.uplearn_url else None
```

`backend/app/api/schemas.py`: add `uplearn_url: str | None` as the last field of `ModuleSummary` and add `uplearn_url: str | None` after `title: str` in `ModuleDetail`.

`backend/app/api/modules.py`, in `list_modules`, add `uplearn_url=m.uplearn_url,` to the `ModuleSummary(...)` call after `task_count=...`.

`seed/ccc602.yaml`, in the `module:` block after `order: 2`:

```yaml
  uplearn_url: https://yoobee.uplearn.education/course/view.php?id=548
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest -q`
Expected: all pass, no SAWarnings.

- [ ] **Step 5: Migrate and re-seed the dev branch**

Run: `uv run alembic upgrade head` then `uv run alembic check`
Expected: check prints `No new upgrade operations detected.`

Run: `uv run python -m app.seed`
Expected: `Seeded 1 module(s) from ...seed`

- [ ] **Step 6: Commit**

```bash
git add backend seed/ccc602.yaml
git commit -m "feat: per-module UPLearn portal link"
```

---

### Task 2: Frontend foundations (tokens, fonts, format helpers, ProgressBar, test helper)

**Files:**
- Modify: `frontend/index.html`, `frontend/src/index.css` (replace), `frontend/src/api.ts`, `frontend/src/test/utils.tsx`, `frontend/src/pages/ModulePage.tsx` (import only)
- Create: `frontend/src/format.ts`, `frontend/src/format.test.ts`, `frontend/src/components/ProgressBar.tsx`, `frontend/src/components/ProgressBar.test.tsx`, `frontend/src/components/ExternalLink.tsx`

**Interfaces:**
- Produces: `format.ts` exports `formatDueDate(iso: string): string`, `plural(n: number, word: string): string`, `weekSummary(weekNumbers: number[], taskCount: number): string`, `daysUntil(iso: string, today: Date): number`, `countdownLabel(days: number): string`, `countdownTone(days: number): '' | 'is-soon' | 'is-overdue'`. `ProgressBar({ value, label, size? })` with `size: 'sm' | 'md' | 'lg'` (default `'md'`). `ExternalLink({ href, children })`. `test/utils.tsx` adds `mockApi(routes)`. `ModuleSummary` and `ModuleDetail` gain `uplearn_url: string | null`.

- [ ] **Step 1: Write the failing tests**

`frontend/src/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { countdownLabel, countdownTone, daysUntil, formatDueDate, plural, weekSummary } from './format'

describe('format', () => {
  it('formats due dates without shifting the day', () => {
    expect(formatDueDate('2026-10-25')).toMatch(/25 Oct 2026/)
    expect(formatDueDate('2026-01-01')).toMatch(/1 Jan 2026/)
  })

  it('pluralises', () => {
    expect(plural(1, 'week')).toBe('1 week')
    expect(plural(0, 'task')).toBe('0 tasks')
    expect(plural(8, 'week')).toBe('8 weeks')
  })

  it("summarises a module's weeks", () => {
    expect(weekSummary([9, 10, 11, 12, 13, 14, 15, 16], 40)).toBe('Weeks 9–16 · 8 weeks · 40 tasks')
    expect(weekSummary([3], 1)).toBe('Week 3 · 1 week · 1 task')
    expect(weekSummary([], 0)).toBe('No weeks yet')
  })

  it('counts calendar days until a due date', () => {
    const lateEvening = new Date(2026, 9, 15, 23, 30)
    expect(daysUntil('2026-10-25', lateEvening)).toBe(10)
    expect(daysUntil('2026-10-15', lateEvening)).toBe(0)
    expect(daysUntil('2026-10-16', lateEvening)).toBe(1)
    expect(daysUntil('2026-10-12', lateEvening)).toBe(-3)
  })

  it('words the countdown', () => {
    expect(countdownLabel(10)).toBe('10 days')
    expect(countdownLabel(1)).toBe('1 day')
    expect(countdownLabel(0)).toBe('Due today')
    expect(countdownLabel(-1)).toBe('1 day overdue')
    expect(countdownLabel(-3)).toBe('3 days overdue')
  })

  it('picks a tone for the countdown', () => {
    expect(countdownTone(8)).toBe('')
    expect(countdownTone(7)).toBe('is-soon')
    expect(countdownTone(0)).toBe('is-soon')
    expect(countdownTone(-1)).toBe('is-overdue')
  })
})
```

`frontend/src/components/ProgressBar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('exposes an accessible, clamped, rounded value', () => {
    const { rerender } = render(<ProgressBar value={37.6} label="Module progress" />)
    const bar = screen.getByRole('progressbar', { name: 'Module progress' })
    expect(bar).toHaveAttribute('aria-valuenow', '38')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
    expect(bar.firstElementChild).toHaveStyle({ width: '38%' })

    rerender(<ProgressBar value={140} label="Module progress" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')

    rerender(<ProgressBar value={-5} label="Module progress" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('applies the size class', () => {
    render(<ProgressBar value={0} label="Week 9 progress" size="sm" />)
    expect(screen.getByRole('progressbar')).toHaveClass('progress', 'progress-sm')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./format` and `./ProgressBar`.

- [ ] **Step 3: Implement**

`frontend/src/format.ts`:

```ts
/** Format a YYYY-MM-DD date in local time so it never shifts a day. */
export function formatDueDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function plural(n: number, word: string): string {
  return `${n} ${n === 1 ? word : `${word}s`}`
}

export function weekSummary(weekNumbers: number[], taskCount: number): string {
  if (weekNumbers.length === 0) return 'No weeks yet'
  const first = Math.min(...weekNumbers)
  const last = Math.max(...weekNumbers)
  const range = first === last ? `Week ${first}` : `Weeks ${first}–${last}`
  return `${range} · ${plural(weekNumbers.length, 'week')} · ${plural(taskCount, 'task')}`
}

/** Whole calendar days from `today` to a YYYY-MM-DD date (negative when past). */
export function daysUntil(iso: string, today: Date): number {
  const [year, month, day] = iso.split('-').map(Number)
  const due = Date.UTC(year, month - 1, day)
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((due - now) / 86_400_000)
}

export function countdownLabel(days: number): string {
  if (days < 0) return `${plural(-days, 'day')} overdue`
  if (days === 0) return 'Due today'
  return plural(days, 'day')
}

export function countdownTone(days: number): '' | 'is-soon' | 'is-overdue' {
  if (days < 0) return 'is-overdue'
  if (days <= 7) return 'is-soon'
  return ''
}
```

`frontend/src/components/ProgressBar.tsx`:

```tsx
export function ProgressBar({
  value,
  label,
  size = 'md',
}: {
  value: number
  label: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div
      className={`progress progress-${size}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}
```

`frontend/src/components/ExternalLink.tsx`:

```tsx
export function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}
```

`frontend/src/pages/ModulePage.tsx`: delete the local `formatDueDate` function and the local `ExternalLink` function; add imports `import { formatDueDate } from '../format'` and `import { ExternalLink } from '../components/ExternalLink'`, and add the line `export { formatDueDate }` so the existing test import keeps working until Task 5 replaces the page.

`frontend/src/api.ts`: add `uplearn_url: string | null` as the last field of `ModuleSummary`, and after `title: string` in `ModuleDetail`.

`frontend/src/test/utils.tsx`: add `import { vi } from 'vitest'` and append:

```tsx
type Route = unknown | (() => Response | Promise<Response>)

/** Stub fetch, answering by URL. Plain values become 200 JSON; functions build their own Response (or throw). Unknown URLs get 404. */
export function mockApi(routes: Record<string, Route>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (!(url in routes)) return jsonResponse({ detail: 'Not found' }, 404)
    const route = routes[url]
    return typeof route === 'function' ? (route as () => Response | Promise<Response>)() : jsonResponse(route)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
```

`frontend/index.html`: inside `<head>`, before `<title>`, add:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Schibsted+Grotesk:wght@500;600;700&display=swap"
    />
```

`frontend/src/index.css` (replace the whole file):

```css
:root {
  --bg: #f4f5f7;
  --surface: #ffffff;
  --border: #e3e6eb;
  --border-soft: #eef0f3;
  --track: #e3e6eb;
  --text: #12161c;
  --text-2: #3a4350;
  --muted: #5a6472;
  --faint: #8a93a0;
  --accent: #0e7c72;
  --accent-strong: #0b5f57;
  --accent-hover: #084f48;
  --accent-soft: #e4f2f0;
  --accent-tint: #f5faf9;
  --accent-line: #cfe5e2;
  --tag-bg: #f0f2f5;
  --line: #dde1e6;
  --dot-border: #cfd4db;
  --soon: #9a4f08;
  --overdue: #b42318;
  --danger-bg: #fdecec;
  --font-body: 'IBM Plex Sans', system-ui, sans-serif;
  --font-display: 'Schibsted Grotesk', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.5;
  color: var(--text);
  background: var(--bg);
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); }
a { color: var(--accent-strong); }
a:hover { color: var(--accent-hover); }
button { font: inherit; }
h1, h2, h3 { margin: 0; font-family: var(--font-display); }
h1 { font-weight: 700; font-size: clamp(28px, 3vw, 38px); line-height: 1.1; letter-spacing: -0.015em; }
h2 { font-weight: 600; font-size: 20px; }
.mono { font-family: var(--font-mono); }
.muted { color: var(--muted); }
.small { font-size: 13px; }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }

/* Shell */
.shell { min-height: 100vh; display: flex; flex-wrap: wrap; align-items: stretch; }
.sidebar { flex: 1 1 240px; max-width: 100%; padding: 28px 20px; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; gap: 32px; }
.content { flex: 999 1 560px; min-width: 0; }
@media (max-width: 820px) {
  .sidebar { border-right: 0; border-bottom: 1px solid var(--border); padding: 20px 16px; gap: 20px; }
}
.brand { display: flex; align-items: center; gap: 10px; color: var(--text); text-decoration: none; }
.brand:hover { color: var(--text); }
.brand-mark { width: 32px; height: 32px; border-radius: 8px; background: var(--accent); display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.brand-text { display: flex; flex-direction: column; }
.brand-name { font-family: var(--font-display); font-weight: 700; font-size: 17px; line-height: 1.1; }
.brand-sub { font-size: 12px; color: var(--muted); }
.nav-list, .side-modules { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.nav-item { display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 0 12px; border-radius: 8px; color: var(--text-2); text-decoration: none; font-weight: 500; }
.nav-item[aria-current] { background: var(--accent-soft); color: var(--accent-strong); font-weight: 600; }
.nav-item.is-disabled { color: var(--faint); cursor: default; }
.soon { margin-left: auto; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; background: var(--tag-bg); color: var(--muted); }
.side-heading { margin: 0 0 6px; padding: 0 12px; font-family: var(--font-body); font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.side-module { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 8px; border: 1px solid transparent; color: var(--text); text-decoration: none; }
.side-module:hover { color: var(--text); background: var(--accent-tint); }
.side-module[aria-current='page'] { border-color: var(--accent-line); background: var(--accent-tint); }
.side-module-top { display: flex; justify-content: space-between; gap: 8px; font-family: var(--font-mono); font-size: 12px; color: var(--muted); }
.side-module-title { font-weight: 500; font-size: 14px; line-height: 1.3; }

/* Pages */
.page { max-width: 1120px; padding: 40px clamp(16px, 4vw, 56px) 64px; display: flex; flex-direction: column; gap: 32px; }
.page-header { display: flex; flex-direction: column; gap: 6px; }
.page-header p { margin: 0; }
.breadcrumb ol { list-style: none; margin: 0 0 12px; padding: 0; display: flex; gap: 8px; font-size: 13px; color: var(--muted); }
.breadcrumb li + li::before { content: '/'; margin-right: 8px; }
.breadcrumb a { color: var(--muted); text-decoration: none; }
.breadcrumb a:hover { color: var(--accent-strong); }
.breadcrumb [aria-current] { font-family: var(--font-mono); color: var(--text); }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
.error { background: var(--danger-bg); border-radius: 8px; padding: 12px 16px; }
.button-secondary { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 16px; border-radius: 8px; border: 1px solid var(--dot-border); background: var(--surface); color: var(--text); text-decoration: none; font-weight: 500; }
.button-secondary:hover { color: var(--accent-strong); border-color: var(--accent); }

/* Progress */
.progress { background: var(--track); border-radius: 999px; overflow: hidden; }
.progress-sm { height: 6px; }
.progress-md { height: 8px; }
.progress-lg { height: 10px; }
.progress-fill { height: 100%; background: var(--accent); border-radius: inherit; }

/* Modules page */
.card-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.module-card { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.module-card a { display: flex; flex-direction: column; gap: 4px; color: var(--text); text-decoration: none; }
.module-card a:hover .module-card-title { color: var(--accent-strong); }
.module-card-title { font-family: var(--font-display); font-weight: 600; font-size: 18px; line-height: 1.3; }

/* Module page */
.progress-card { padding: 24px; display: flex; flex-wrap: wrap; gap: 32px; align-items: center; }
.progress-main { flex: 999 1 320px; display: flex; flex-direction: column; gap: 10px; }
.progress-main p { margin: 0; }
.progress-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.progress-head h2 { font-family: var(--font-body); font-size: 15px; font-weight: 600; }
.big-number { font-family: var(--font-display); font-weight: 700; font-size: 28px; line-height: 1; }
.stats { flex: 1 1 240px; margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.stats dt { font-size: 13px; color: var(--muted); }
.stats dd { margin: 0; font-family: var(--font-display); font-weight: 600; font-size: 22px; }
.stats .of { color: var(--faint); font-size: 16px; }
.module-columns { display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-start; }
.section-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 12px; }
.timeline { flex: 999 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
.timeline-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.timeline-item { display: flex; gap: 16px; }
.timeline-rail { position: relative; flex: 0 0 32px; display: flex; justify-content: center; }
.timeline-line { position: absolute; top: 30px; bottom: -30px; left: 15px; width: 2px; background: var(--line); }
.timeline-dot { position: relative; margin-top: 22px; width: 32px; height: 32px; border-radius: 50%; background: var(--bg); border: 2px solid var(--dot-border); color: var(--muted); display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 12px; font-weight: 500; }
.week-card { flex: 1 1 auto; min-width: 0; margin: 8px 0; }
.week-card.is-open { border-color: var(--accent); box-shadow: 0 6px 20px rgba(14, 124, 114, 0.1); }
.week-heading { font: inherit; }
.week-toggle { width: 100%; min-height: 60px; padding: 14px 18px; background: transparent; border: 0; border-radius: 12px; cursor: pointer; color: inherit; text-align: left; display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; }
.week-label { flex: 1 1 240px; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.week-title { font-weight: 600; font-size: 16px; line-height: 1.35; }
.week-meta { flex: 0 1 160px; display: flex; flex-direction: column; gap: 6px; }
.chevron { flex: 0 0 auto; transition: transform 160ms ease; }
.week-card.is-open .chevron { transform: rotate(180deg); }
.week-panel { padding: 0 18px 14px; border-top: 1px solid var(--border); }
.week-panel > p { margin: 14px 0 0; }
.task-list { list-style: none; margin: 0; padding: 0; }
.task-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; min-height: 52px; padding: 8px 0; border-bottom: 1px solid var(--border-soft); }
.task-row input { width: 20px; height: 20px; margin: 0; accent-color: var(--accent); }
.task-title { flex: 1 1 220px; min-width: 0; }
.tag { font-size: 12px; padding: 2px 8px; border-radius: 4px; background: var(--tag-bg); color: var(--text-2); }
.task-links { display: flex; gap: 12px; font-size: 14px; font-weight: 500; }
.task-links a { display: inline-flex; align-items: center; min-height: 44px; }
.rail { flex: 1 1 300px; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.rail-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.assessment-card { padding: 18px; display: flex; flex-direction: column; gap: 8px; }
.assessment-title { font-weight: 600; line-height: 1.35; }
.assessment-foot { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 12px; padding-top: 10px; border-top: 1px solid var(--border-soft); }
.countdown { font-family: var(--font-display); font-weight: 600; font-size: 18px; }
.countdown.is-soon { color: var(--soon); }
.countdown.is-overdue { color: var(--overdue); }
```

- [ ] **Step 4: Run tests and build**

Run: `npm test` — all pass (existing page tests still pass; they use the old markup).
Run: `npm run build` — no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(frontend): design tokens, fonts, format helpers, ProgressBar"
```

---

### Task 3: App shell, sidebar, modules page, not-found page

**Files:**
- Create: `frontend/src/components/AppShell.tsx`, `frontend/src/components/Sidebar.tsx`, `frontend/src/components/Sidebar.test.tsx`
- Modify: `frontend/src/App.tsx`, `frontend/src/pages/ModulesPage.tsx`, `frontend/src/pages/ModulesPage.test.tsx` (replace), `frontend/src/pages/NotFoundPage.tsx`, `frontend/src/pages/NotFoundPage.test.tsx` (replace), `frontend/src/pages/ModulePage.test.tsx` (fetch stubs only)

**Interfaces:**
- Consumes: `ProgressBar`, `plural`, `mockApi`, `fetchModules` (Task 2).
- Produces: `AppShell` (layout route rendering `Sidebar` + `<Outlet />`), `Sidebar` (queryKey `['modules']`, same as `ModulesPage`, so one request serves both).

- [ ] **Step 1: Write the failing tests**

`frontend/src/components/Sidebar.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { jsonResponse, mockApi, renderAt } from '../test/utils'

const modules = [
  { key: 'ccc601', code: 'CCC601', title: 'Public Cloud Administration', week_count: 0, task_count: 0, uplearn_url: null },
  { key: 'ccc602', code: 'CCC602', title: 'Data Engineering in the Public Cloud', week_count: 8, task_count: 40, uplearn_url: 'https://up.test/602' },
]
const detail = { key: 'ccc602', code: 'CCC602', title: 'Data Engineering in the Public Cloud', uplearn_url: null, weeks: [], assessments: [] }

const nav = () => screen.getByRole('navigation', { name: 'Main' })

describe('Sidebar', () => {
  it('shows the brand and lists modules with links and progress', async () => {
    mockApi({ '/api/modules': modules })
    renderAt('/')
    expect(within(nav()).getByText('Cloudy McHackface')).toBeInTheDocument()
    const link = await within(nav()).findByRole('link', { name: /Data Engineering in the Public Cloud/ })
    expect(link).toHaveAttribute('href', '/modules/ccc602')
    expect(within(nav()).getByRole('progressbar', { name: 'CCC602 progress' })).toHaveAttribute('aria-valuenow', '0')
  })

  it('marks Modules as current and shows This week and Assessments as coming soon', async () => {
    mockApi({ '/api/modules': modules })
    renderAt('/')
    expect(within(nav()).getByRole('link', { name: 'Modules' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav()).queryByRole('link', { name: /This week/ })).toBeNull()
    expect(within(nav()).queryByRole('link', { name: /^Assessments/ })).toBeNull()
    expect(within(nav()).getByText('This week').closest('[aria-disabled="true"]')).not.toBeNull()
    expect(within(nav()).getAllByText('Soon')).toHaveLength(2)
  })

  it('highlights the module being viewed', async () => {
    mockApi({ '/api/modules': modules, '/api/modules/ccc602': detail })
    renderAt('/modules/ccc602')
    const current = await within(nav()).findByRole('link', { name: /Data Engineering in the Public Cloud/ })
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(within(nav()).getByRole('link', { name: /Public Cloud Administration/ })).not.toHaveAttribute('aria-current')
  })

  it('stays quiet when the module list fails', async () => {
    mockApi({ '/api/modules': () => jsonResponse({ detail: 'Boom' }, 500), '/api/modules/ccc602': detail })
    renderAt('/modules/ccc602')
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(within(nav()).queryByRole('alert')).toBeNull()
    expect(within(nav()).queryByText('Your modules')).toBeNull()
  })
})
```

`frontend/src/pages/ModulesPage.test.tsx` (replace):

```tsx
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { jsonResponse, mockApi, renderAt } from '../test/utils'

const modules = [
  { key: 'ccc601', code: 'CCC601', title: 'Public Cloud Administration', week_count: 0, task_count: 0, uplearn_url: null },
  { key: 'ccc602', code: 'CCC602', title: 'Data Engineering in the Public Cloud', week_count: 8, task_count: 30, uplearn_url: 'https://up.test/602' },
]

async function loadedMain() {
  await screen.findByRole('heading', { level: 1, name: 'Modules' })
  return screen.getByRole('main')
}

describe('ModulesPage', () => {
  it('lists modules as cards with links, counts and progress', async () => {
    mockApi({ '/api/modules': modules })
    renderAt('/')
    const main = await loadedMain()
    const link = await within(main).findByRole('link', { name: /Data Engineering in the Public Cloud/ })
    expect(link).toHaveAttribute('href', '/modules/ccc602')
    expect(within(main).getByText('8 weeks · 30 tasks')).toBeInTheDocument()
    expect(within(main).getByRole('progressbar', { name: 'CCC602 progress' })).toHaveAttribute('aria-valuenow', '0')
  })

  it('uses singular forms for one week and one task', async () => {
    mockApi({ '/api/modules': [{ key: 'ccc603', code: 'CCC603', title: 'Single', week_count: 1, task_count: 1, uplearn_url: null }] })
    renderAt('/')
    const main = await loadedMain()
    expect(await within(main).findByText('1 week · 1 task')).toBeInTheDocument()
  })

  it('shows a hint when there are no modules', async () => {
    mockApi({ '/api/modules': [] })
    renderAt('/')
    expect(await screen.findByText(/No modules yet/)).toBeInTheDocument()
  })

  it('shows an error and retries', async () => {
    let calls = 0
    mockApi({
      '/api/modules': () => (++calls === 1 ? jsonResponse({ detail: 'Server exploded' }, 500) : jsonResponse(modules)),
    })
    renderAt('/')
    expect(await screen.findByRole('alert')).toHaveTextContent('Server exploded')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    const main = await loadedMain()
    expect(await within(main).findByRole('link', { name: /Public Cloud Administration/ })).toBeInTheDocument()
    expect(calls).toBe(2)
  })

  it('shows an error when the backend is unreachable', async () => {
    mockApi({
      '/api/modules': () => {
        throw new TypeError('Failed to fetch')
      },
    })
    renderAt('/')
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to fetch')
  })
})
```

`frontend/src/pages/NotFoundPage.test.tsx` (replace):

```tsx
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockApi, renderAt } from '../test/utils'

describe('NotFoundPage', () => {
  it('shows a not-found page with a link home for unknown paths', async () => {
    mockApi({ '/api/modules': [] })
    renderAt('/nope/nope')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Back to modules' })).toHaveAttribute('href', '/')
  })
})
```

`frontend/src/pages/ModulePage.test.tsx`: change only how fetch is stubbed so the sidebar's separate request doesn't consume the page's response. Import `mockApi` from `../test/utils`; replace each `vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(X)))` with `mockApi({ '/api/modules': [], '/api/modules/ccc602': X })`, and the 404 case with `mockApi({ '/api/modules': [] })` (unknown URLs answer 404 `Not found`). If the 404 test asserts the response detail text, keep asserting the "Module not found" heading only. Do not change any other assertion. Remove now-unused imports.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: Sidebar tests fail (no navigation landmark), ModulesPage progressbar test fails.

- [ ] **Step 3: Implement**

`frontend/src/components/AppShell.tsx`:

```tsx
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppShell() {
  return (
    <div className="shell">
      <Sidebar />
      <div className="content">
        <Outlet />
      </div>
    </div>
  )
}
```

`frontend/src/components/Sidebar.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { fetchModules } from '../api'
import { ProgressBar } from './ProgressBar'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export function Sidebar() {
  const { pathname } = useLocation()
  const modules = useQuery({ queryKey: ['modules'], queryFn: fetchModules })
  const modulesCurrent = pathname === '/' ? 'page' : pathname.startsWith('/modules/') ? 'true' : undefined

  return (
    <nav className="sidebar" aria-label="Main">
      <Link to="/" className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 18h4V12H4zM10 18h4V8h-4zM16 18h4V4h-4z" />
          </svg>
        </span>
        <span className="brand-text">
          <span className="brand-name">Cloudy McHackface</span>
          <span className="brand-sub">Level 6 Cloud &amp; Cyber</span>
        </span>
      </Link>

      <ul className="nav-list">
        <li>
          <span className="nav-item is-disabled" aria-disabled="true">
            <Icon>
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M3 9h18M8 2v4M16 2v4" />
            </Icon>
            This week
            <span className="soon">Soon</span>
          </span>
        </li>
        <li>
          <Link to="/" className="nav-item" aria-current={modulesCurrent}>
            <Icon>
              <path d="M4 6h16M4 12h16M4 18h10" />
            </Icon>
            Modules
          </Link>
        </li>
        <li>
          <span className="nav-item is-disabled" aria-disabled="true">
            <Icon>
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5M9 13h6M9 17h4" />
            </Icon>
            Assessments
            <span className="soon">Soon</span>
          </span>
        </li>
      </ul>

      {modules.data && modules.data.length > 0 && (
        <section aria-labelledby="side-modules-heading">
          <h2 id="side-modules-heading" className="side-heading">
            Your modules
          </h2>
          <ul className="side-modules">
            {modules.data.map((m) => (
              <li key={m.key}>
                <Link
                  to={`/modules/${m.key}`}
                  className="side-module"
                  aria-current={pathname === `/modules/${m.key}` ? 'page' : undefined}
                >
                  <span className="side-module-top">
                    <span>{m.code}</span>
                    <span>0%</span>
                  </span>
                  <span className="side-module-title">{m.title}</span>
                  <ProgressBar value={0} label={`${m.code} progress`} size="sm" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </nav>
  )
}
```

`frontend/src/App.tsx`: import `AppShell` and wrap the routes in a layout route:

```tsx
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<ModulesPage />} />
        <Route path="/modules/:key" element={<ModulePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
```

`frontend/src/pages/ModulesPage.tsx` (replace):

```tsx
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchModules } from '../api'
import { ErrorMessage } from '../components/ErrorMessage'
import { ProgressBar } from '../components/ProgressBar'
import { plural } from '../format'

export function ModulesPage() {
  const query = useQuery({ queryKey: ['modules'], queryFn: fetchModules })

  if (query.isPending) {
    return (
      <main className="page">
        <p className="muted">Loading…</p>
      </main>
    )
  }
  if (query.isError) {
    return (
      <main className="page">
        <ErrorMessage error={query.error} onRetry={() => query.refetch()} />
      </main>
    )
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1>Modules</h1>
        <p className="muted">Pick a module to see its week-by-week plan.</p>
      </header>
      {query.data.length === 0 ? (
        <p className="muted">No modules yet. Run the seed loader.</p>
      ) : (
        <ul className="card-grid">
          {query.data.map((m) => (
            <li key={m.key} className="card module-card">
              <Link to={`/modules/${m.key}`}>
                <span className="mono small muted">{m.code}</span>
                <span className="module-card-title">{m.title}</span>
              </Link>
              <span className="muted small">
                {plural(m.week_count, 'week')} · {plural(m.task_count, 'task')}
              </span>
              <ProgressBar value={0} label={`${m.code} progress`} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
```

`frontend/src/pages/NotFoundPage.tsx`: change `<main>` to `<main className="page">`.

- [ ] **Step 4: Run tests and build**

Run: `npm test` — all pass. Run: `npm run build` — no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(frontend): app shell with sidebar and restyled modules page"
```

---

### Task 4: Assessments rail

**Files:**
- Create: `frontend/src/components/AssessmentsRail.tsx`, `frontend/src/components/AssessmentsRail.test.tsx`

**Interfaces:**
- Consumes: `Assessment` (api.ts), `formatDueDate`, `daysUntil`, `countdownLabel`, `countdownTone` (Task 2), `ExternalLink` (Task 2).
- Produces: `AssessmentsRail({ code, assessments, portalUrl, today? })` — `today` defaults to `new Date()`; renders `<aside aria-labelledby>` named "Assessments".

- [ ] **Step 1: Write the failing test**

`frontend/src/components/AssessmentsRail.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AssessmentsRail } from './AssessmentsRail'

const assessments = [
  { key: 'a3', title: 'Assessment 3', due_date: '2026-10-25', uplearn_url: 'https://up.test/a3' },
  { key: 'a5', title: 'Assessment 5', due_date: '2026-10-14', uplearn_url: null },
  { key: 'a4', title: 'Assessment 4', due_date: null, uplearn_url: null },
]
const today = new Date(2026, 9, 15, 9, 0)

const card = (title: string) => screen.getByText(title).closest('li')!

describe('AssessmentsRail', () => {
  it('shows due dates and countdowns', () => {
    render(<AssessmentsRail code="CCC602" assessments={assessments} portalUrl={null} today={today} />)
    const rail = screen.getByRole('complementary', { name: 'Assessments' })
    expect(within(rail).getAllByText('CCC602')).toHaveLength(3)

    expect(card('Assessment 3')).toHaveTextContent(/Due Sun, 25 Oct 2026/)
    expect(within(card('Assessment 3')).getByText('10 days')).not.toHaveClass('is-soon')
    expect(within(card('Assessment 5')).getByText('1 day overdue')).toHaveClass('countdown', 'is-overdue')
    expect(card('Assessment 4')).toHaveTextContent('Due date: see programme guide')
    expect(card('Assessment 4').querySelector('.countdown')).toBeNull()
  })

  it('links each assessment to UPLearn when it has a link', () => {
    render(<AssessmentsRail code="CCC602" assessments={assessments} portalUrl={null} today={today} />)
    const link = within(card('Assessment 3')).getByRole('link', { name: 'UPLearn' })
    expect(link).toHaveAttribute('href', 'https://up.test/a3')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(card('Assessment 4')).queryByRole('link')).toBeNull()
  })

  it('shows the portal button only when the module has a portal link', () => {
    const { rerender } = render(
      <AssessmentsRail code="CCC602" assessments={[]} portalUrl="https://up.test/602" today={today} />,
    )
    const portal = screen.getByRole('link', { name: 'Open in Yoobee portal' })
    expect(portal).toHaveAttribute('href', 'https://up.test/602')
    expect(portal).toHaveAttribute('target', '_blank')
    expect(screen.getByText('No assessments listed.')).toBeInTheDocument()

    rerender(<AssessmentsRail code="CCC602" assessments={[]} portalUrl={null} today={today} />)
    expect(screen.queryByRole('link', { name: 'Open in Yoobee portal' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/AssessmentsRail.test.tsx`
Expected: FAIL — cannot resolve `./AssessmentsRail`.

- [ ] **Step 3: Implement**

`frontend/src/components/AssessmentsRail.tsx`:

```tsx
import type { Assessment } from '../api'
import { countdownLabel, countdownTone, daysUntil, formatDueDate } from '../format'
import { ExternalLink } from './ExternalLink'

export function AssessmentsRail({
  code,
  assessments,
  portalUrl,
  today = new Date(),
}: {
  code: string
  assessments: Assessment[]
  portalUrl: string | null
  today?: Date
}) {
  return (
    <aside className="rail" aria-labelledby="assessments-heading">
      <h2 id="assessments-heading">Assessments</h2>
      {assessments.length === 0 ? (
        <p className="muted">No assessments listed.</p>
      ) : (
        <ul className="rail-list">
          {assessments.map((a) => {
            const days = a.due_date ? daysUntil(a.due_date, today) : null
            return (
              <li key={a.key} className="card assessment-card">
                <span className="mono small muted">{code}</span>
                <span className="assessment-title">{a.title}</span>
                <div className="assessment-foot">
                  <span className="muted small">
                    {a.due_date ? `Due ${formatDueDate(a.due_date)}` : 'Due date: see programme guide'}
                  </span>
                  {days !== null && <span className={`countdown ${countdownTone(days)}`.trim()}>{countdownLabel(days)}</span>}
                </div>
                {a.uplearn_url && (
                  <span className="task-links">
                    <ExternalLink href={a.uplearn_url}>UPLearn</ExternalLink>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {portalUrl && (
        <a className="button-secondary" href={portalUrl} target="_blank" rel="noopener noreferrer">
          Open in Yoobee portal
        </a>
      )}
    </aside>
  )
}
```

- [ ] **Step 4: Run tests and build**

Run: `npm test` — all pass. Run: `npm run build` — no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AssessmentsRail.tsx frontend/src/components/AssessmentsRail.test.tsx
git commit -m "feat(frontend): assessments rail with countdowns and portal link"
```

---

### Task 5: Module page — header, progress card, weekly timeline

**Files:**
- Create: `frontend/src/components/module/ModuleHeader.tsx`, `frontend/src/components/module/ProgressCard.tsx`, `frontend/src/components/module/WeekTimeline.tsx`
- Modify: `frontend/src/pages/ModulePage.tsx` (replace), `frontend/src/pages/ModulePage.test.tsx` (replace)

**Interfaces:**
- Consumes: `fetchModule`, `ApiError`, `ModuleDetail`, `Week`, `Task`, `TaskType` (api.ts); `weekSummary`, `plural` (format.ts); `ProgressBar`, `ExternalLink`, `ErrorMessage`, `AssessmentsRail` (Tasks 2–4); `mockApi`, `renderAt` (test utils).
- Produces: `ModuleHeader({ code, title, weeks })`, `ProgressCard({ taskCount, weekCount })`, `WeekTimeline({ weeks })` (exports `WeekCard`, `TaskRow` too).

- [ ] **Step 1: Write the failing tests**

`frontend/src/pages/ModulePage.test.tsx` (replace):

```tsx
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { jsonResponse, mockApi, renderAt } from '../test/utils'

const summary = [
  { key: 'ccc602', code: 'CCC602', title: 'Data Engineering in the Public Cloud', week_count: 2, task_count: 2, uplearn_url: 'https://up.test/602' },
]
const detail = {
  key: 'ccc602',
  code: 'CCC602',
  title: 'Data Engineering in the Public Cloud',
  uplearn_url: 'https://up.test/602',
  weeks: [
    {
      key: 'ccc602-w09',
      week_number: 9,
      title: 'DP-900 Learning Paths 1–4',
      tasks: [
        { key: 't1', title: 'DP-900 LP1', type: 'learning_path', external_url: 'https://learn.test/lp1', uplearn_url: null },
        { key: 't2', title: 'Read the A3 brief', type: 'assessment_step', external_url: null, uplearn_url: 'https://up.test/a3' },
      ],
    },
    { key: 'ccc602-w10', week_number: 10, title: 'Quiet week', tasks: [] },
  ],
  assessments: [
    { key: 'a3', title: 'Assessment 3', due_date: '2026-10-25', uplearn_url: 'https://up.test/a3' },
    { key: 'a4', title: 'Assessment 4', due_date: null, uplearn_url: null },
  ],
}

async function open(moduleDetail: unknown = detail) {
  mockApi({ '/api/modules': summary, '/api/modules/ccc602': moduleDetail })
  renderAt('/modules/ccc602')
  await screen.findByRole('heading', { level: 1, name: 'Data Engineering in the Public Cloud' })
  return screen.getByRole('main')
}

describe('ModulePage', () => {
  it('shows the breadcrumb, title and week summary', async () => {
    const main = await open()
    const crumbs = within(main).getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumbs).getByRole('link', { name: 'Modules' })).toHaveAttribute('href', '/')
    expect(within(crumbs).getByText('CCC602')).toHaveAttribute('aria-current', 'page')
    expect(within(main).getByText('Weeks 9–10 · 2 weeks · 2 tasks')).toBeInTheDocument()
  })

  it('shows the progress card at zero with the sign-in note', async () => {
    const main = await open()
    expect(within(main).getByRole('progressbar', { name: 'Module progress' })).toHaveAttribute('aria-valuenow', '0')
    expect(within(main).getByText('Progress tracking arrives with sign-in.')).toBeInTheDocument()
    expect(within(main).getByText('Tasks done').nextElementSibling).toHaveTextContent('0/2')
    expect(within(main).getByText('Weeks complete').nextElementSibling).toHaveTextContent('0/2')
  })

  it('starts with weeks collapsed and opens one at a time', async () => {
    const main = await open()
    const week9 = within(main).getByRole('button', { name: /Week 9/ })
    const week10 = within(main).getByRole('button', { name: /Week 10/ })
    expect(week9).toHaveAttribute('aria-expanded', 'false')
    expect(within(main).queryByText('DP-900 LP1')).toBeNull()

    await userEvent.click(week9)
    expect(week9).toHaveAttribute('aria-expanded', 'true')
    expect(within(main).getByText('DP-900 LP1')).toBeInTheDocument()

    await userEvent.click(week10)
    expect(week9).toHaveAttribute('aria-expanded', 'false')
    expect(week10).toHaveAttribute('aria-expanded', 'true')
    expect(within(main).queryByText('DP-900 LP1')).toBeNull()
    expect(within(main).getByText('No tasks listed for this week.')).toBeInTheDocument()

    await userEvent.click(week10)
    expect(week10).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows task rows with disabled tick boxes, type tags and safe links', async () => {
    const main = await open()
    await userEvent.click(within(main).getByRole('button', { name: /Week 9/ }))

    const lp1 = within(main).getByText('DP-900 LP1').closest('li')!
    expect(within(lp1).getByRole('checkbox', { name: 'DP-900 LP1' })).toBeDisabled()
    expect(within(lp1).getByText('Learning path')).toBeInTheDocument()
    const openLink = within(lp1).getByRole('link', { name: 'Open' })
    expect(openLink).toHaveAttribute('href', 'https://learn.test/lp1')
    expect(openLink).toHaveAttribute('target', '_blank')
    expect(openLink).toHaveAttribute('rel', 'noopener noreferrer')

    const brief = within(main).getByText('Read the A3 brief').closest('li')!
    expect(within(brief).getByText('Assessment')).toBeInTheDocument()
    expect(within(brief).queryByRole('link', { name: 'Open' })).toBeNull()
    expect(within(brief).getByRole('link', { name: 'UPLearn' })).toHaveAttribute('href', 'https://up.test/a3')
  })

  it('shows the assessments rail and the portal button', async () => {
    const main = await open()
    const rail = within(main).getByRole('complementary', { name: 'Assessments' })
    expect(within(rail).getByText('Assessment 3').closest('li')).toHaveTextContent(/Due Sun, 25 Oct 2026/)
    expect(within(rail).getByText('Assessment 4').closest('li')).toHaveTextContent('Due date: see programme guide')
    expect(within(rail).getByRole('link', { name: 'Open in Yoobee portal' })).toHaveAttribute('href', 'https://up.test/602')
  })

  it('hides the portal button when the module has no portal link', async () => {
    const main = await open({ ...detail, uplearn_url: null })
    expect(within(main).queryByRole('link', { name: 'Open in Yoobee portal' })).toBeNull()
  })

  it('shows "Module not found" for an unknown key', async () => {
    mockApi({ '/api/modules': summary })
    renderAt('/modules/nope')
    expect(await screen.findByRole('heading', { name: 'Module not found' })).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Back to modules' })).toHaveAttribute('href', '/')
  })

  it('shows an error with retry for server errors', async () => {
    mockApi({ '/api/modules': summary, '/api/modules/ccc602': () => jsonResponse({ detail: 'Boom' }, 500) })
    renderAt('/modules/ccc602')
    expect(await screen.findByRole('alert')).toHaveTextContent('Boom')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/ModulePage.test.tsx`
Expected: most tests FAIL (no breadcrumb, no progress card, weeks are `<details>`).

- [ ] **Step 3: Implement**

`frontend/src/components/module/ModuleHeader.tsx`:

```tsx
import { Link } from 'react-router-dom'
import type { Week } from '../../api'
import { weekSummary } from '../../format'

export function ModuleHeader({ code, title, weeks }: { code: string; title: string; weeks: Week[] }) {
  const taskCount = weeks.reduce((sum, w) => sum + w.tasks.length, 0)
  return (
    <header className="page-header">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link to="/">Modules</Link>
          </li>
          <li aria-current="page">{code}</li>
        </ol>
      </nav>
      <h1>{title}</h1>
      <p className="muted">{weekSummary(weeks.map((w) => w.week_number), taskCount)}</p>
    </header>
  )
}
```

`frontend/src/components/module/ProgressCard.tsx`:

```tsx
import { ProgressBar } from '../ProgressBar'

export function ProgressCard({ taskCount, weekCount }: { taskCount: number; weekCount: number }) {
  return (
    <section className="card progress-card" aria-labelledby="progress-heading">
      <div className="progress-main">
        <div className="progress-head">
          <h2 id="progress-heading">Module progress</h2>
          <span className="big-number">0%</span>
        </div>
        <ProgressBar value={0} label="Module progress" size="lg" />
        <p className="muted small">Progress tracking arrives with sign-in.</p>
      </div>
      <dl className="stats">
        <div>
          <dt>Tasks done</dt>
          <dd>
            0<span className="of">/{taskCount}</span>
          </dd>
        </div>
        <div>
          <dt>Weeks complete</dt>
          <dd>
            0<span className="of">/{weekCount}</span>
          </dd>
        </div>
      </dl>
    </section>
  )
}
```

`frontend/src/components/module/WeekTimeline.tsx`:

```tsx
import { useState } from 'react'
import type { Task, TaskType, Week } from '../../api'
import { plural } from '../../format'
import { ExternalLink } from '../ExternalLink'
import { ProgressBar } from '../ProgressBar'

const TYPE_LABELS: Record<TaskType, string> = {
  learning_path: 'Learning path',
  lab: 'Lab',
  assessment_step: 'Assessment',
}

export function TaskRow({ task }: { task: Task }) {
  const id = `task-${task.key}`
  return (
    <li className="task-row">
      <input type="checkbox" id={id} disabled title="Ticking arrives with sign-in" />
      <label htmlFor={id} className="task-title">
        {task.title}
      </label>
      <span className="tag">{TYPE_LABELS[task.type]}</span>
      <span className="task-links">
        {task.external_url && <ExternalLink href={task.external_url}>Open</ExternalLink>}
        {task.uplearn_url && <ExternalLink href={task.uplearn_url}>UPLearn</ExternalLink>}
      </span>
    </li>
  )
}

export function WeekCard({
  week,
  open,
  isLast,
  onToggle,
}: {
  week: Week
  open: boolean
  isLast: boolean
  onToggle: () => void
}) {
  const panelId = `week-panel-${week.key}`
  return (
    <li className="timeline-item">
      <div className="timeline-rail" aria-hidden="true">
        {!isLast && <span className="timeline-line" />}
        <span className="timeline-dot">{week.week_number}</span>
      </div>
      <div className={`card week-card${open ? ' is-open' : ''}`}>
        <h3 className="week-heading">
          <button type="button" className="week-toggle" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
            <span className="week-label">
              <span className="mono small muted">Week {week.week_number}</span>
              <span className="week-title">{week.title}</span>
            </span>
            <span className="week-meta">
              <span className="small muted">{plural(week.tasks.length, 'task')}</span>
              <ProgressBar value={0} label={`Week ${week.week_number} progress`} size="sm" />
            </span>
            <svg className="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </h3>
        {open && (
          <div id={panelId} className="week-panel">
            {week.tasks.length === 0 ? (
              <p className="muted">No tasks listed for this week.</p>
            ) : (
              <ul className="task-list">
                {week.tasks.map((task) => (
                  <TaskRow key={task.key} task={task} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

export function WeekTimeline({ weeks }: { weeks: Week[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  return (
    <section className="timeline" aria-labelledby="timeline-heading">
      <div className="section-head">
        <h2 id="timeline-heading">Weekly timeline</h2>
        <span className="small muted">Select a week to see its tasks</span>
      </div>
      {weeks.length === 0 ? (
        <p className="muted">No weeks listed yet.</p>
      ) : (
        <ol className="timeline-list">
          {weeks.map((week, i) => (
            <WeekCard
              key={week.key}
              week={week}
              open={openKey === week.key}
              isLast={i === weeks.length - 1}
              onToggle={() => setOpenKey(openKey === week.key ? null : week.key)}
            />
          ))}
        </ol>
      )}
    </section>
  )
}
```

`frontend/src/pages/ModulePage.tsx` (replace):

```tsx
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ApiError, fetchModule } from '../api'
import { AssessmentsRail } from '../components/AssessmentsRail'
import { ErrorMessage } from '../components/ErrorMessage'
import { ModuleHeader } from '../components/module/ModuleHeader'
import { ProgressCard } from '../components/module/ProgressCard'
import { WeekTimeline } from '../components/module/WeekTimeline'

export function ModulePage() {
  const { key = '' } = useParams()
  const query = useQuery({ queryKey: ['module', key], queryFn: () => fetchModule(key) })

  if (query.isPending) {
    return (
      <main className="page">
        <p className="muted">Loading…</p>
      </main>
    )
  }
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <main className="page">
          <h1>Module not found</h1>
          <Link to="/">Back to modules</Link>
        </main>
      )
    }
    return (
      <main className="page">
        <ErrorMessage error={query.error} onRetry={() => query.refetch()} />
      </main>
    )
  }

  const mod = query.data
  const taskCount = mod.weeks.reduce((sum, w) => sum + w.tasks.length, 0)
  return (
    <main className="page">
      <ModuleHeader code={mod.code} title={mod.title} weeks={mod.weeks} />
      <ProgressCard taskCount={taskCount} weekCount={mod.weeks.length} />
      <div className="module-columns">
        <WeekTimeline key={mod.key} weeks={mod.weeks} />
        <AssessmentsRail code={mod.code} assessments={mod.assessments} portalUrl={mod.uplearn_url} />
      </div>
    </main>
  )
}
```

(`key={mod.key}` on `WeekTimeline` resets the open week when navigating between modules.)

- [ ] **Step 4: Run tests and build**

Run: `npm test` — all pass. Run: `npm run build` — no errors. Run: `npm run lint` — no new errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): module page with progress card, weekly timeline and rail"
```

---

### Task 6: Browser check and docs

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Run both servers** (backend `uv run uvicorn app.main:app --reload`, frontend `npm run dev`).
- [ ] **Step 2: Check in the browser at desktop (≥1280px) and phone (390px) widths:** sidebar brand, nav ("Soon" items), "Your modules" with CCC602; Modules page cards; CCC602 page header "Weeks 9–16 · 8 weeks · 40 tasks", progress card at 0% with the note, timeline dots joined by a line, week 9 expands with disabled tick boxes and working Open/UPLearn links, only one week open at a time; assessments rail with A3 countdown and "Open in Yoobee portal" opening the course page; `/nope` shows "Page not found" inside the shell. At phone width the sidebar sits above the content with no horizontal scroll.
- [ ] **Step 3: Update `CLAUDE.md`:** status line → `Status: Phase 1 done + UI redesign — CCC602 browsable locally in the new layout; no accounts or ticking yet.`; under "MVP scope" add one line: `UI follows the "Module timeline" design (docs/superpowers/specs/2026-10-15-ui-redesign-design.md); tick boxes are disabled and progress shows 0% until accounts land.`
- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: note UI redesign in CLAUDE.md"
```
