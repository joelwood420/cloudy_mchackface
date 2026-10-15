# UPLearn portal extras

Collected 2026-10-15/16 by browsing UPLearn (https://yoobee.uplearn.education/) for the owner's intake. Everything here is structure, dates, public links and short summaries in our own words. Seed data lives in `seed/*.yaml`; this file holds everything else that could feed future features, so we don't have to go back and extract it again.

Not recorded on purpose (CLAUDE.md "Portal data rules"): lab training keys, Teams/Calendly/Zoom join links, the owner's login, other students' data, full tutor posts, assessment handouts/briefs/rubrics.

## Intake and calendar

- Intake: **NZ4129 - CCC L6 - 20/07/26-25/04/27 - ONLINE** (FT). Programme runs 20 Jul 2026 to 25 Apr 2027.
- Full-time is 32 teaching weeks (breaks extra), 37.5 h/week: 18 asynchronous, 2 tutor-directed, 17.5 self-directed. Part-time is 64 weeks, 19 h/week (9 / 2 / 10 hours, as shown on the portal).
- Week dates, worked out from the assessment open/due dates (each course is 8 weeks, with assessments opening on a Monday and due on a Sunday):

| Weeks | Course | Dates (Mon to Sun) |
|---|---|---|
| 1–8 | CCC601 | 20 Jul – 13 Sep 2026 |
| break | | 14 Sep – 27 Sep 2026 |
| 9–16 | CCC602 | 28 Sep – 22 Nov 2026 |
| 17–20 | CCC603 (AWS half) | 23 Nov – 20 Dec 2026 |
| break | | 21 Dec 2026 – 10 Jan 2027 |
| 21–24 | CCC603 (Fortinet half) | 11 Jan – 7 Feb 2027 |
| 25–32 | CCC604 | from 8 Feb 2027 (not yet visible; ends by 25 Apr 2027) |

  Week 1 starts 20 Jul 2026, so 16 Oct 2026 falls in week 11. The CCC601/602 FT posts are numbered "01_FT_Week_09" etc., and week numbers match the table above.
- **Weekly live session**: every Thursday, 11:00 am – 1:00 pm NZT, for all CCC students. Zoom activity on UPLearn: https://yoobee.uplearn.education/mod/zoom/view.php?id=73721 (has recordings). Candidate for a `live_session` task type or a recurring "This week" item.
- Upcoming-events calendar: https://yoobee.uplearn.education/calendar/view.php?view=upcoming

## Programme structure (from course 00)

| Course | Credits | Pre-reqs | Hours | Assessments (weighting, type) |
|---|---|---|---|---|
| CCC601 Public Cloud Administration | 30 | – | 300 (≈144 teaching, 156 self-directed) | A1 AWS Theoretical and Practical Concepts Evaluation 50%, A2 Azure Theoretical and Practical Concepts Evaluation 50% (individual) |
| CCC602 Data Engineering in the Public Cloud | 30 | CCC601 | 300 | A3 Practical Scenario Evaluation 60%, A4 Scenario-based activity design and implementation 40% (individual) |
| CCC603 Cyber Security in the Cloud | 30 | CCC601, CCC602 | 300 | A5 Practical Demonstration 50%, A6 Report and Proof of Concepts 50% (individual) |
| CCC604 Multi-Cloud Security Integration and Project Management | 30 | CCC601–603 | 300 | Project 70% (individual), Presentation 30% (**group**) |

- Learning outcomes per course: CCC601 has 4, CCC602 has 3, CCC603 has 5, CCC604 has 6. Full text: Course Overview tile https://yoobee.uplearn.education/course/section.php?id=19120
- Grading: A 80–100, B 65–79, C 50–64 (pass), D 40–49, E 0–39 (fail). All LOs must be met to pass, whatever the grade. A late first submission is capped at 50%, and a late submission is normally treated as a second attempt unless special consideration is approved.
- Special consideration form and student handbook: Kapehu Student Hub, https://myacg.sharepoint.com/sites/YoobeeCollegesStudentHub
- Submission format (summary): one PDF per assessment, with screenshots pasted into Word and then exported. File name pattern: `1_StudentID_Firstname_Lastname_Assessment_N_CCC60X_First_Attempt`. Source post: https://yoobee.uplearn.education/mod/forum/discuss.php?d=49398

## Certifications the programme lines up with

CLF-C02 (AWS Cloud Practitioner), SAA-C03 (AWS Solutions Architect Associate), AZ-900, AZ-104, DP-900, DP-203 (taught in CCC602 weeks 10–12), DEA-C01 (AWS Data Engineer Associate), SCS-C02 (AWS Security Specialty), Fortinet FCF + FCA (formerly NSE 1–3), Fortinet NSE 6/7 Public Cloud Security. Useful if certification tracking comes back into scope.

## Platforms and accounts

| Platform | URL | Notes |
|---|---|---|
| AWS Academy (Canvas) | https://awsacademy.instructure.com/ | Tutor invites your Yoobee email. CCC601 has two invites (Cloud Foundations, Cloud Architecting); later courses add Data Engineering and Security. Labs free while enrolled. |
| AWS console (personal) | https://console.aws.amazon.com/ | Needed from day 1. Personal email, card required. Set a budget limit (guide: d=49394). New accounts get up to $200 free-tier credit. |
| Microsoft Learn | https://learn.microsoft.com/en-us/training/ | AZ-900/AZ-104 from FT week 5, DP-900/DP-203 from FT week 9. |
| Skillable / MSLE labs | https://msle.learnondemand.net/ | Register with a training key from the tutor (never store it). Saved labs expire after 7 days unless resumed; tip is to resume and re-save twice a week. Use personal email. |
| Azure portal (personal) | https://portal.azure.com/ | Free trial with $200 credit lasts 30 days, then pay-as-you-go. Don't create it until the Azure content starts (FT week 5), and finish practical assessment work inside the 30 days. |
| Fortinet Training Institute | https://training.fortinet.com/ | Create a FortiCloud account first: https://support.fortinet.com/cred/#/sign-up . Used in CCC603 weeks 19–23. |
| MS Teams | – | Main tutor channel. Keep questions short and in one message. |

## Course 00 "Things to know" forum (how-to posts)

Forum: https://yoobee.uplearn.education/mod/forum/view.php?id=74020

| # | Topic | Link |
|---|---|---|
| 0 | Assessment submission instructions and format | https://yoobee.uplearn.education/mod/forum/discuss.php?d=49398 |
| 1 | Student learning FAQs (11 Q&As: getting started, AWS Academy, console accounts, budgets, Azure, late submissions, billing) | https://yoobee.uplearn.education/mod/forum/discuss.php?d=49391 |
| 2 | Accessing AWS Academy labs and resources (with recording) | https://yoobee.uplearn.education/mod/forum/discuss.php?d=49392 |
| 3 | Creating an AWS console account | https://yoobee.uplearn.education/mod/forum/discuss.php?d=49393 |
| 4 | Setting an AWS budget limit | https://yoobee.uplearn.education/mod/forum/discuss.php?d=49394 |
| 5 | Creating an Azure free account | https://yoobee.uplearn.education/mod/forum/discuss.php?d=49395 |
| 6 | Accessing Microsoft study resources | https://yoobee.uplearn.education/mod/forum/discuss.php?d=49396 |
| 7 | Accessing AWS Security and Fortinet content (CCC603) | https://yoobee.uplearn.education/mod/forum/discuss.php?d=49397 |

Tips from these posts:
- If AWS or Azure bills you unexpectedly, raise a billing support ticket with them and ask for a credit. Delete unused resources after each session.
- Use a separate personal email for each cloud account, not your Yoobee email.

Other course 00 pages: Start Here forum https://yoobee.uplearn.education/mod/forum/view.php?id=71861 , Programme Overview tile section 19115, Course Overview 19120, Programme Essentials 19125, Hot Tips 19126.

## Assessment support recordings (tutor-made, on UPLearn)

CCC602 Assessment Q&A forum: https://yoobee.uplearn.education/mod/forum/view.php?id=51304

| Item | Link |
|---|---|
| 3.1 Introduction and sample data access | https://yoobee.uplearn.education/mod/forum/discuss.php?d=48935 |
| 3.2 T2.1 Practical implementation on Azure portal | https://yoobee.uplearn.education/mod/forum/discuss.php?d=48936 |
| 3.3 T2.2 Deploying Azure resources using ARM template | https://yoobee.uplearn.education/mod/forum/discuss.php?d=48938 |
| 3.4 T3 Data ingestion using Azure Data Factory | https://yoobee.uplearn.education/mod/forum/discuss.php?d=48939 |
| 3.5 T4.1 Azure Databricks and app registration | https://yoobee.uplearn.education/mod/forum/discuss.php?d=48940 |
| 3.6 T4.2 Azure Databricks and Spark commands | https://yoobee.uplearn.education/mod/forum/discuss.php?d=48941 |
| 3.7 T4.3 Azure Databricks and Spark commands | https://yoobee.uplearn.education/mod/forum/discuss.php?d=48942 |
| 3.8 T5.1 Data transformation, Synapse set-up | https://yoobee.uplearn.education/mod/forum/discuss.php?d=48943 |
| 3.9 T5.2 Table creation from data lake and SQL query | https://yoobee.uplearn.education/mod/forum/discuss.php?d=48944 |
| 3.10 T5.3 Table creation from data lake and SQL query | https://yoobee.uplearn.education/mod/forum/discuss.php?d=48945 |
| 4.1 Assessment 4 introduction and submission requirements | https://yoobee.uplearn.education/mod/forum/discuss.php?d=48946 |

- CCC602 Pānui: "Assessment 3 command handout" https://yoobee.uplearn.education/mod/forum/discuss.php?d=52021
- CCC603 Assessment Q&A forum https://yoobee.uplearn.education/mod/forum/view.php?id=51355 : "Assessment 5 site-to-site VPN handout" d=49091
- CCC602 also has a few recordings on the DP-900 tile (intro and sample data, Azure portal practical, ARM template deployment) and the DEA-C01 tile (Assessment 4 introduction).

These could become optional "watch" tasks under the matching assessment weeks if wanted.

## Assessment task timelines (from each brief)

Every brief has a "Recommended Tasks Completion Timeline". The FT weeks are in the seed files as "Complete Task N of Assessment M" items. PT weeks are kept here for when part-time students are added.

| Assessment | Start | Tasks by week (FT) | Submit (FT) | PT weeks (start → submit) |
|---|---|---|---|---|
| A1 | Wk 1 | Wk 2: T1 · Wk 3: T2, T3 · Wk 4: T4 | Wk 4 | 1–2 → 7–8 |
| A2 | Wk 5 | Wk 6: T1 · Wk 7: T2, T3 · Wk 8: T4 | Wk 8 | 9–10 → 15–16 |
| A3 | Wk 9 | Wk 10: T1, T2 · Wk 11: T3, T4 · Wk 12: T5 | Wk 12 | 17–18 → 23–24 |
| A4 | Wk 13 | Wk 14: T1, T2 · Wk 15: T3 · Wk 16: T4 | Wk 16 | 25–26 → 31–32 |
| A5 | Wk 17 | Wk 18: T1, T2 · Wk 19: T3 · Wk 20: T4 | Wk 20 | 33–34 → 39–40 |
| A6 | Wk 21 | Wk 22: T1, T2 · Wk 23: T3 · Wk 24: T4 | Wk 24 | 41–42 → 47–48 |

PT weeks are pairs: each FT week maps to two PT weeks.

- A3's timeline says "submit by week 12", but the portal due date is 25 Oct 2026, the Sunday of week 12. They agree.
- A6 mismatch: the timeline names Tasks 1–4, but the brief itself is split into Part A (written report, 50%) and Part B (proof of concepts, 50%). The seed items say "Task 1–4 of Assessment 6" with no subtitle. Check with the tutor which parts count as which task.
- Personal copies of the briefs, handouts and own submissions are in `docs/assessments/` (git-ignored, never commit).

## Announcements (Pānui), mostly industry events and offers

- CCC601 Pānui https://yoobee.uplearn.education/mod/forum/view.php?id=73359 : AWS Cloud and AI Day Auckland 2026 (registration and agenda posts, Sep 2026), Microsoft AI Skills Fest free certification offer, Fortinet/Forrester webinars, student survey reminders.
- CCC603 Pānui https://yoobee.uplearn.education/mod/forum/view.php?id=73361 : Fortinet FastTrack sessions, FortiOS 8.0 webinar, NSE certification programme changes (effective 15 July).

## Course IDs and key UPLearn pages

| Course | Course id | FT schedule forum | Pānui | Assessment Q&A | Assessments tile |
|---|---|---|---|---|---|
| 00A Onboarding | 632 | – | – | – | – |
| 00 Programme Overview | 704 | – | – | – | – |
| 01 CCC601 | 552 | 74590 (PT 74591) | 73359 | – | section 9689 |
| 02 CCC602 | 548 | 74592 (PT 74593) | 73360 | 51304 | section 9649 |
| 03 CCC603 | 553 | 74594 (PT 74595) | 73361 | 51355 | section 9691 |
| 04 CCC604 | 554 | locked until CCC602 is completed | | | |

Assignment activity ids: A1 73317, A2 73318, A3 73319, A4 73320, A5 73321, A6 73322.

## Gaps and follow-ups

- **CCC604**: locked. Seed it once access opens (weeks 25–32).
- **CCC603**: the course was readable, but the owner doesn't officially have access yet. Re-check `seed/ccc603.yaml` when it opens; FT week posts may change.
- The FT week posts for CCC603 are dated Dec 2025 – Jan 2026 (reused from an earlier intake); the actual dates for this intake come from the assessment open/due dates above.
- AWS Academy module pages have no public URLs, so AWS tasks link to the matching AWS docs plus the UPLearn tile.
- Fortinet module tasks link to the Training Institute home; deep links need login.
- Part-time schedules (forums 74591, 74593, 74595) not collected; needed if PT students are added.
- 00A Onboarding not reviewed.
