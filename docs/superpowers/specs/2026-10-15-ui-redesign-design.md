# UI Redesign — Design

Date: 2026-10-15
Status: approved in chat
Source design: Claude Design canvas "Cloudy McHackface" → artboard "Module timeline" (https://claude.ai/artifact/Segpg1M5RNvRRBNaSdpTz5). It is a layout and look target, not a data spec.

## Goal

Make the Phase 1 frontend look and feel like the design: a sidebar app shell, a module page with a progress card, a vertical weekly timeline of expandable week cards, and an assessments rail. Ship it before accounts exist, without inventing data or behaviour we can't back.

## Decisions

| Topic | Decision |
|---|---|
| Ticking | Not in this change. Tick boxes render **disabled**; enabled in Phase 2 with accounts. |
| Progress | All bars show 0% with the note "Progress tracking arrives with sign-in". No fake numbers. |
| Current week | Not shown. No "This week" highlight, status chips or "Jump to this week" until accounts. |
| Week count | Real data: "Weeks 9–16 · 8 weeks · 40 tasks", not "of 12". |
| Dropped from design | Date ranges per week, task minutes, "hrs left", pace, assessment weight and status, user footer, week status chips. |
| Portal button | Add `uplearn_url` to modules (DB + seed + API). CCC602 → `https://yoobee.uplearn.education/course/view.php?id=548`. Button hidden when a module has none. |
| Nav | "Modules" live; "This week" and "Assessments" shown disabled with a "Soon" badge. |

## Look

Colours (CSS custom properties in `frontend/src/index.css`): ground `#F4F5F7`, surface `#FFFFFF`, border `#E3E6EB`, text `#12161C`, muted `#5A6472`, accent `#0E7C72`, accent strong `#0B5F57`, accent soft `#E4F2F0`. Fonts from Google Fonts: Schibsted Grotesk (display), IBM Plex Sans (body), IBM Plex Mono (codes, numbers). No CSS framework. Touch targets ≥ 44px; the sidebar stacks above content at narrow widths.

## Screens

- **Shell (every route):** sidebar with brand ("Cloudy McHackface / Level 6 Cloud & Cyber"), nav, "Your modules" (code, title, 0% bar, current module highlighted). Sidebar silently hides "Your modules" if the list fails to load.
- **Modules (`/`):** card grid; each card: code, title link, "N weeks · N tasks", 0% bar.
- **Module (`/modules/:key`):** breadcrumb "Modules / CODE"; title; summary line; progress card (0%, Tasks done 0/N, Weeks complete 0/N, sign-in note); two columns:
  - Weekly timeline: numbered dot per week joined by a line; week card button (Week N, title, task count, 0% bar, chevron) toggles a task panel, one open at a time, none open initially. Task row: disabled checkbox labelled by the task title, type tag, "Open" (external) and "UPLearn" links (new tab, `noopener noreferrer`).
  - Assessments rail: card per assessment (code, title, "Due Sun, 25 Oct 2026" or "Due date: see programme guide", days-left countdown: "N days", "1 day", "Due today", "N days overdue"; amber ≤ 7 days, red when overdue), optional UPLearn link, then "Open in Yoobee portal".
- **Not found / Module not found / errors:** same behaviour as Phase 1, restyled, inside the shell.

## Backend change

Migration `0002` adds nullable `modules.uplearn_url VARCHAR(1000)`. Seed `module.uplearn_url` optional `HttpUrl`. `GET /api/modules` and `GET /api/modules/{key}` include `uplearn_url`.

## Testing

Backend: migration matches models (`alembic check`), seed stores/clears the module link, API returns it. Frontend: tests route fetch by URL (shared `mockApi` helper) because the sidebar and page fetch separately. Cover: sidebar list and current highlighting, disabled nav items, module cards, header summary, progress card at 0, week expand/collapse one-at-a-time, disabled tick boxes, task links, assessment countdown wording (fixed "today"), portal button shown/hidden, 404 and error states. Finish with a browser check at desktop and phone width.
