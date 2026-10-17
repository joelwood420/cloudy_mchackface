# UPLearn Wayfinding — Design

Date: 2026-10-18
Status: approved in chat (from `/impeccable critique` P1 "point me to where it lives in UPLearn")

## Job

The student is mid-study, flipping back from Microsoft Learn, AWS or a lab. From the app they should reach the right UPLearn page in one click: this week's schedule post, a track tile, or an assignment. Operate mode. Delivers PRODUCT.md principle 4.

## Decisions

| Topic | Decision |
|---|---|
| Schedule post data | Each module gets `schedule_posts:` in seed: `week_number`, `study_mode` (FT now; PT later), `url`. Stored in the DB, returned with weeks by the API. One post per module per week, not per track. |
| Collecting URLs | Claude collects them with the owner in a one-off browser session while the owner is logged in. Only post URLs (titles in seed comments). No post text, lab keys or tutor links. No automated scraping. |
| This week header | One "Week N schedule post ↗" link per module that week, under the dates. |
| Module page | Inside each expanded week card, at the top of the panel. |
| Lab rows | Short note "Lab access details are in the Week N schedule post", linked, beside the existing AWS Academy / Skillable note. |
| Duplicate links | Hide a task's UPLearn link when it equals its track's link. Keep specific ones (assignment, forum). |
| Link labels | Derived from URL: `mod/assign` → Assignment, `mod/forum` → Forum, `course/section` → "{track} tile", `course/view` → Course page, schedule posts → "Week N post". Accessible names say UPLearn and new tab. Final wording in `/impeccable clarify`. |

## States

- No post for a week (CCC604, uncollected weeks, PT users): no link, no placeholder.
- Break weeks: no post.
- Several modules in one week: one post link per module.

## Out of scope

Malware banner, ticking, progress maths, Learn/AWS "Open" links, visual style. No copied Yoobee text.
