# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: the owner, a full-time student on the Yoobee Colleges Diploma in Cloud Computing and Cyber Security (Level 6). The app is mostly open during study sessions, beside Microsoft Learn, AWS Academy or a Skillable lab, and tasks get ticked off as they're finished.

Later: other students on the same diploma, full-time and part-time. Part-time support waits on schedule dates from Yoobee.

## Product Purpose

The Yoobee UPLearn portal (Moodle) is a mess to navigate. Cloudy McHackface shows what to work on this week, which assessments are coming up, and progress per course and for the whole programme. It also acts as a map of the portal: it points students to where things live in UPLearn (the right course page, schedule post, assessment or tile) so they don't have to hunt for them. Success means a student always knows what's next, how far along they are, and where to find it in the portal.

## Positioning

It works out the student's current week from their intake dates and NZ time, so there's no setup and no manual week picking. It turns UPLearn's forum posts and tiles into one week-by-week checklist that links out to where the work actually happens.

## Operating Context

- Structure: Module → Submodule (certification track) → Week → Task, one tick per task. Shared prerequisites are listed but never counted in progress.
- Courses CCC601–604, plus onboarding and programme overview courses in the portal.
- Work happens elsewhere: Microsoft Learn paths, AWS Academy, Skillable labs, Moodle assignments. The app links out and back to UPLearn.
- Breaks and public holidays come from `seed/schedule.yaml`. New accounts get past weeks pre-ticked.

## Capabilities and Constraints

- Email + password accounts, DB-backed sessions. A disclaimer must be accepted before use.
- Screens: This week (home), Modules, Module (weekly timeline + assessments rail), Assessments, auth, disclaimer, not found.
- Progress is always computed from the user's ticks; no invented numbers.
- Store only structure, metadata and public links. Never copy Yoobee-owned text or files (briefs, rubrics, full tutor posts). Never show lab training keys, tutor Teams/Calendly links, portal logins or other students' data.
- Academic integrity: any AI feature must teach, quiz or explain, never produce assessment work. No sharing of assessment materials between users.
- No automated UPLearn scraping without Yoobee's OK.
- Out of scope for now: certification tracking, AI study helper, portal sync.

## Brand Commitments

- Name: Cloudy McHackface, subtitle "Level 6 Cloud & Cyber".
- Voice: plain, clear study-tool copy with a light wink. The playfulness lives in the name and small touches, not in every label.
- Not an official Yoobee product; must not look like or claim to be one.

## Evidence on Hand

- Real seed content for CCC601–603 in `seed/`; CCC604 is a shell until the course opens.
- No testimonials, user numbers or endorsements exist. Don't invent any.

## Product Principles

1. Answer "what do I do now?" first. The current week leads.
2. Stay out of the way during study: quick to glance at, quick to tick, links go straight to the work.
3. Honest numbers only: progress and dates come from real data or are left out.
4. Point to the portal, don't copy it. Every item should say or link to where it lives in UPLearn.
5. Built for one, ready for many: per-user settings (study mode, intake) without assuming everyone is the owner.

## Accessibility & Inclusion

Touch targets at least 44px; layout works at phone width (sidebar stacks above content). No further standard confirmed yet.
