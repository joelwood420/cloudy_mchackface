# Assessment resources

Date: 2026-10-24. Status: design, approved for planning once reviewed.

## Why

The app exists because UPLearn spreads everything out. For an assessment, the tutor's recordings sit in an Assessment Q&A forum, the command handout in Pānui, the code in a GitHub repo, the dataset on Kaggle, tool advice in Teams, and the submission rules in a course 00 forum post. Today the app shows an assessment as a title, a due date and one UPLearn link, so the student still has to go hunting.

This feature gathers the tools and links for each assessment and puts them where the student already is: next to that week's "Complete Task N of Assessment M" items on **This week**, and in full on the **Assessments** page. The test of success is the owner opening This week and having everything they need for the assessment tasks in front of them.

(This replaced an earlier idea of free-text weekly notes. Most "notes" turned out to be either evergreen or one-off news the seed files can't keep up with.)

## Goals

- Each assessment (A1–A6 now; A7/A8 when CCC604 opens) has a list of resources: title, link, group, and optionally which of the assessment's task numbers it's for.
- **This week** shows, inside each week group that has assessment-step tasks, a box with the resources for the task numbers in that slot, plus the assessment's untagged resources.
- **Assessments page** shows every resource for each assessment, grouped, with task labels (T2, T3…).
- The assessment card in the This week rail gets the shared "submitting" links.

## Non-goals

- No ticks on resources and no effect on progress. They're reference data.
- No free-text notes, announcements or one-off news (live session cancelled, resubmission dates). That would need posting from inside the app, which is a separate, bigger feature.
- No user-added resources, uploads or sharing between users.
- No assessment-specific resources for A7/A8 (CCC604 is still locked). They do get the shared `all` resources (submission format, special consideration), since those apply to every assessment.

## Anti-goals (would make it a failure even if it works)

- Copying Yoobee-owned content: brief text, rubric text, handout contents, attached PDFs (e.g. the Special Consideration form, the guidelines PDF), full tutor posts. **Links only**, to the UPLearn post or the public page. (CLAUDE.md "Portal data rules" and "Yoobee policy constraints".)
- Storing Teams/Calendly/Zoom join links, training keys or anything from a tutor's private channel. Tool names a tutor recommended in Teams are fine; links to the tools' own public sites are fine.
- This week becoming long or cluttered. The box shows only what's relevant to this slot's tasks; the full list lives on the Assessments page.
- Anything that helps write the assessment. Resources are tools, docs and the tutor's own walkthroughs, never answers.

## Decided

### Data (seed)

1. **Assessment-step tasks link to their assessment.** `assessment_step` tasks in `seed/ccc60X.yaml` get two optional fields:
   - `assessment`: the assessment key (e.g. `ccc602-a3`); must exist; only allowed on `assessment_step` tasks.
   - `assessment_task`: the task number in the brief (e.g. `3`), or omitted for steps that aren't one task (e.g. "start/read the brief", "submit").
   Every existing `assessment_step` task gets `assessment` filled in; `assessment_task` where the title says "Task N".
   - `shows_all_resources: true` (optional, default false): for steps like `ccc602-w10-a3-demo` ("Watch the Assessment 3 tutor demo recordings") and the A4 introduction-recording step. When a slot holds such a step, the box shows **all** of that assessment's non-`submitting` resources, whatever the task numbers. Without this, a PT half-week holding only the "watch the recordings" step would list none of them.
2. **Resources live under the assessment** in the same module file:
   ```yaml
   assessments:
     - key: ccc602-a3
       ...
       resources:
         - key: ccc602-a3-rec-3-4
           title: "3.4 Data ingestion with Data Factory"
           group: recording        # recording | code_data | tool | submitting
           url: https://yoobee.uplearn.education/mod/forum/discuss.php?d=48939
           tasks: [3]              # optional; omitted = applies to the whole assessment
   ```
   Keys follow the existing stable-key rule so re-seeding upserts. `tasks` numbers are validated as positive ints; the loader warns (or errors, builder's call) if a tagged number has no matching `assessment_task` in the seed.
3. **Shared resources** (the same link on many assessments) are defined once in a new `seed/resources.yaml`, each with an `assessments:` list of keys or `all`. Initial shared set:
   - Submission format and file naming post: https://yoobee.uplearn.education/mod/forum/discuss.php?d=49398 (`submitting`, all)
   - Special consideration, Kāpehu Student Hub: https://myacg.sharepoint.com/sites/YoobeeCollegesStudentHub (`submitting`, all)
   - Diagram tools, as recommended by the tutors in Teams: diagrams.net / draw.io, Lucid, Cloudcraft, Sketch (`tool`, on A1, A4, A5, A6, i.e. the ones that mark an architecture diagram; untagged)
   - AWS / Azure architecture icon sets (`tool`; AWS ones on A1, A4, A5, A6; Azure ones on A2, A3)
4. **Initial per-assessment content** comes from `docs/portal-extras.md` (sections "Assessment support recordings", "Assessment requirements worth surfacing", "Tools and extra resources"). At minimum:
   - **A3:** recordings 3.1–3.10 tagged by the T-number in their titles (3.1 untagged; 3.2–3.3 → 2; 3.4 → 3; 3.5–3.7 → 4; 3.8–3.10 → 5), the Pānui command handout post, tutor repo `yoobeecloud/Assessment_3_Azure_Project_Codes`, the Kaggle Tokyo Olympics dataset, Azure PowerShell/Cloud Shell, Azure Storage Explorer, Power BI / Tableau / Looker Studio, plus DP-900 tile recordings.
   - **A4:** recording 4.1, tutor repo `yoobeecloud/Assessment_4_AWS_Project_Codes`, docs for S3, Glue, Athena, QuickSight, Lambda, SNS, Azure Synapse.
   - **A5:** the site-to-site VPN handout post (CCC603 Assessment Q&A d=49091), AWS VPN docs, APA referencing guide.
   - **A1, A2, A6:** tools and docs named in portal-extras (AWS Budgets, Trusted Advisor; Azure portal/Cloud Shell; Fortinet GitHub templates, screen-recording tools for the A6 video, APA).
   Exact titles and links are the builder's to fill from portal-extras; check every URL is public or a UPLearn link, never a file attachment.
   - **No portal visits for this.** Where portal-extras names something but has no URL, link the nearest known page instead: DP-900 tile recordings → the DP-900 tile (section 9656); screen-recording guides → the 00A Digital Skills tile (section 18346); APA → the public APA Style site (apastyle.apa.org); Fortinet templates → github.com/fortinet; Lucid, Cloudcraft, Sketch → their public home pages. Anything that can't be linked this way is left out.

### Database

- New table `assessment_resources`: id, key (unique), assessment_id (FK, cascade delete), title, url, group (checked to the four values), tasks (int array, empty = whole assessment), position. Shared resources become one row per assessment they apply to (key derived, e.g. `<assessment-key>--<shared-key>`), so the API never has to merge two sources.
- `tasks` gets `assessment_id` (nullable FK, set null on delete) and `assessment_task` (nullable small int).
- One Alembic migration (0012). No data migration needed: re-running the seed loader fills it. Note it in CLAUDE.md's migration list.
- The loader deletes resources that are no longer in the seed, like everything else.

### This week

- For each week group (one submodule's slot), collect its `assessment_step` tasks that have an `assessment`. For each distinct assessment among them, show **one resource box** after the task list, titled "What you need for A3 Tasks 3 and 4" (or "What you need for Assessment 3" when no task numbers are in the slot).
- The box shows (unless a `shows_all_resources` step is in the slot, see Data 1): resources tagged with any task number in this slot, then the assessment's untagged resources in the `recording`, `code_data` and `tool` groups. `submitting` resources are **not** in the box (they're on the rail card).
- Laid out in group columns (Tutor recordings / Code and data / Tools), each link with its T-label, as in the mockup. A link at the bottom, "All A3 resources →", goes to that assessment on the Assessments page.
- **Part-time:** the box follows the tasks. When a PT half-week holds only Task 3, only T3-tagged (plus untagged) resources show. A PT half with no assessment steps shows no box.
- Lurking tasks and "ahead" tasks don't get boxes; only the current slot's groups do.
- **Rail card** (This week and module pages): under "Mark submitted", the assessment's `submitting` resources as plain links (format and file name; special consideration). The existing brief link stays as is.

### Assessments page

- Each assessment row/card gets a collapsible "Resources (N)" section with all its resources grouped into four columns (Tutor recordings / Code and data / Tools / Submitting), each with its T-labels.
- Open by default on the lead card (the next deadline); collapsed on the rest. An assessment with no resources shows no section.
- "All A3 resources →" from This week lands on this page with A3's section open and scrolled into view (e.g. `/assessments#ccc602-a3`).

### API

- `assessment_out` (used by `/api/assessments` and the rails) gains `resources: [{key, title, url, group, tasks}]`, ordered by position.
- This week groups gain `assessment_resources: [{assessment_key, assessment_short (e.g. "A3"), task_numbers: [3, 4], resources: [...]}]`, computed server-side per slot so PT splitting is handled where pacing already lives.
- Tasks in API output gain `assessment_key` and `assessment_task` (nullable). Harmless and lets the frontend label steps later.

### Look

- Follows the mockup at `.superpowers/brainstorm/23452-1792785757/content/resources-v1.html` (local only, not committed): a light accent-tint box with an accent-line border inside the week group card, small mono uppercase group headings, T-labels in muted mono after each link, external-link arrow on every link via the existing `ExternalLink` component (UPLearn links use the existing `uplearnLabel` naming).
- Must work at phone width: columns stack.

### Housekeeping

- Add `.superpowers/` to `.gitignore`.

## Left to the builder

- Exact component split and CSS class names, following the existing `thisweek/` and `module/` components.
- Whether an unmatched `tasks` number is a loader warning or error.
- How "A3" short names are derived (from the title "Assessment 3: …" or a new `short` seed field).
- Exact resource titles and the full initial list per assessment, drawn from `docs/portal-extras.md`.
- Tests: follow the existing pattern (seed schema/loader tests, API tests for PT splitting, vitest for the box and the collapsible section).
