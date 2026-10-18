# UPLearn portal extras

Recorded 2026-10-15/16 by the owner from UPLearn (https://yoobee.uplearn.education/) for their own intake. The notes cover every course (00A, 00, 601, 602, 603; 604 is still locked), every tile, the FT and PT schedule forums, Pānui, Assessment Q&A, the calendar, the Programme Guide PDF and the owner's local copies of the briefs. Future features should be built from this file and `seed/*.yaml`. Everything here is structure, dates, public links and short summaries in our own words.

Not recorded on purpose (CLAUDE.md "Portal data rules"): lab training keys, Teams/Calendly/Zoom join links, tutors' personal emails, the owner's login, other students' data, full tutor posts, assessment handouts/briefs/rubrics. The course Copyright tiles (e.g. CCC602 section 9659) say UPLearn content and downloadable files can't be reproduced without permission, which is why we link instead of copying.

Personal copies (git-ignored, never commit) are in `docs/assessments/`: briefs, A3 handout, the owner's submissions, the submission-format docx, and `general/Programme_Guide_FT_2607.pdf`.

## Intake and calendar

- Intake: **NZ4129 - CCC L6 - 20/07/26-25/04/27 - ONLINE** (FT), short code **2607-ONLINE-CCC-FT**. Programme runs 20 Jul 2026 to 25 Apr 2027.
- Full-time is 32 teaching weeks (breaks extra), 37.5 h/week: 18 asynchronous, 2 tutor-directed, 17.5 self-directed. Part-time is 64 weeks, 19 h/week (9 / 2 / 10 hours, as shown on the portal).
- Week dates, from the Programme Guide (source of truth; each week starts Monday):

| Weeks | Course | Dates (Mon to Sun) |
|---|---|---|
| 1–8 | CCC601 | 20 Jul – 13 Sep 2026 |
| break | | 12 Sep – 27 Sep 2026 (2 weeks) |
| 9–16 | CCC602 | 28 Sep – 22 Nov 2026 |
| 17–20 | CCC603 (AWS half) | 23 Nov – 20 Dec 2026 |
| break | | 19 Dec 2026 – 10 Jan 2027 (3 weeks) |
| 21–24 | CCC603 (Fortinet half) | 11 Jan – 7 Feb 2027 |
| break | | 6 Feb – 28 Feb 2027 (3 weeks) |
| 25–32 | CCC604 | 1 Mar – 25 Apr 2027 |

  Week start dates: 1 = 20 Jul, 2 = 27 Jul, 3 = 3 Aug, 4 = 10 Aug, 5 = 17 Aug, 6 = 24 Aug, 7 = 31 Aug, 8 = 7 Sep · 9 = 28 Sep, 10 = 5 Oct, 11 = 12 Oct, 12 = 19 Oct, 13 = 26 Oct, 14 = 2 Nov, 15 = 9 Nov, 16 = 16 Nov · 17 = 23 Nov, 18 = 30 Nov, 19 = 7 Dec, 20 = 14 Dec, 21 = 11 Jan 2027, 22 = 18 Jan, 23 = 25 Jan, 24 = 1 Feb · 25 = 1 Mar, 26 = 8 Mar, 27 = 15 Mar, 28 = 22 Mar, 29 = 29 Mar, 30 = 5 Apr, 31 = 12 Apr, 32 = 19 Apr 2027.
  16 Oct 2026 falls in week 11. FT post titles follow `0N_FT_Week_WW_<course>_FT`, with CCC604's being `0N_FT_Week_25_Multi-Cloud_Security_Integration_and_Project_Management_FT` and so on.
- **Assessment dates** (Programme Guide and the Moodle assignment pages). Assignments open Monday 9:00 am and are due Sunday 11:59 pm, except A8:

| # | Course | Title | Window | Due | LOs | Type |
|---|---|---|---|---|---|---|
| A1 | CCC601 | AWS Theoretical and Practical Concepts Evaluation | 20 Jul – 14 Aug 2026 | Sun 16 Aug 2026 | 1, 2 | individual |
| A2 | CCC601 | Azure Theoretical and Practical Concepts Evaluation | 17 Aug – 11 Sep | Sun 13 Sep 2026 | 3, 4 | individual |
| A3 | CCC602 | Azure Practical Scenario Evaluation | 28 Sep – 23 Oct | Sun 25 Oct 2026 | 1, 2 | individual |
| A4 | CCC602 | Scenario-Based Activity Design and Implementation (AWS) | 26 Oct – 20 Nov | Sun 22 Nov 2026 | 3 | individual |
| A5 | CCC603 | Practical Demonstration (AWS SCS-C02) | 23 Nov – 18 Dec | Sun 20 Dec 2026 | 1, 2 | individual |
| A6 | CCC603 | Report and Proof of Concepts (Fortinet) | 11 Jan – 5 Feb 2027 | Sun 7 Feb 2027 | 3, 4, 5 | individual |
| A7 | CCC604 | Multi-Cloud Security Integration Project | 1 Mar – 16 Apr 2027 | Sun 18 Apr 2027 | 2, 3, 5, 6 | **group** |
| A8 | CCC604 | Project Presentation | 17 – 23 Apr 2027 | **Fri** 23 Apr 2027 | 1, 5 | **group** |

- **Public holidays** (the Online Campus closes; the Programme Guide suggests taking a break too). 2026: 1–2 Jan, Auckland Anniversary 26 Jan, Waitangi 6 Feb, Good Friday 3 Apr, Easter Monday 6 Apr, ANZAC 25 Apr, King's Birthday (listed as 5 Jun), Matariki 10 Jul, Labour Day 26 Oct, 25–26 Dec. 2027: 1–2 Jan, Auckland Anniversary 25 Jan [statutory date is Mon 1 Feb], Waitangi 6 Feb (observed 8 Feb), Good Friday 26 Mar, Easter Monday 29 Mar, ANZAC 25 Apr (observed 26 Apr), King's Birthday 7 Jun, Matariki 25 Jun, Labour Day 25 Oct, Christmas 25 Dec, Boxing Day 26 Dec (observed 27 Dec). Labour Day 26 Oct 2026 falls in week 13. Candidate for a "holiday" badge on the week view.
- Meet and Greet: Day 5 of each intake (2607 intake: Fri 24 Jul 2026, 10 am) on Zoom in course 00.
- Source of the guide: attachment on the Start Here "Welcome Day 1" post (https://yoobee.uplearn.education/mod/forum/discuss.php?d=51839). Each intake gets its own guide (`Programme Guide_<intake>`), so a multi-intake version needs one date table per intake.
- **Weekly live session**: every Thursday, 11:00 am – 1:00 pm NZT, for all CCC students. Zoom activity on UPLearn: https://yoobee.uplearn.education/mod/zoom/view.php?id=73721 (has recordings). Candidate for a `live_session` task type or a recurring "This week" item.
- Upcoming-events calendar: https://yoobee.uplearn.education/calendar/view.php?view=upcoming . It lists the weekly live sessions and assignment due dates. Moodle's "Import or export calendars" page can produce a personal iCal feed URL (it contains a per-user token, so treat it as a secret). A user pasting their own iCal URL into the app would be a sanctioned way to sync due dates without scraping. Check with the owner before building it.
- Live session recordings list exists (View Recordings on the Zoom activity), but recordings are untitled by topic, so there's nothing to map to weeks.
- **Engagement rule**: students must log into UPLearn at least twice a week. Admin monitors access and flags non-engagement to the tutor as an academic concern (FAQ post d=49391). Candidate for a reminder or nudge feature.

### Other intakes (seen in the Start Here forum group list)

All named `NZ4129 - CCC L6 - <start>-<end> - ONLINE`. FT runs about 9 months, PT about 18 months. Starts are roughly late Jan, late Apr, Jul and late Sep:

| Start | FT end | PT end |
|---|---|---|
| 26/05/25 | 01/03/26 | 06/12/26 |
| 21/07/25 | 26/04/26 | 31/01/27 |
| 29/09/25 | 05/07/26 | 11/04/27 |
| 26/01/26 | 01/11/26 | 08/08/27 |
| 28/04/26 | 31/01/27 | 07/11/27 |
| 20/07/26 | 25/04/27 | 30/01/28 |
| 28/09/26 | 04/07/27 | 09/04/28 |
| 15/02/27 | 21/11/27 | 17/09/28 |

Short codes follow `YYMM-ONLINE-CCC-FT|PT` (e.g. 2607, 2604, 2609). Useful for an intake picker when other students join. Their dates can't be derived from ours, because break placement differs.

## Programme structure (from course 00)

| Course | Credits | Pre-reqs | Hours | Assessments (weighting, type) |
|---|---|---|---|---|
| CCC601 Public Cloud Administration | 30 | – | 300 (≈144 teaching, 156 self-directed) | A1 AWS Theoretical and Practical Concepts Evaluation 50%, A2 Azure Theoretical and Practical Concepts Evaluation 50% (individual) |
| CCC602 Data Engineering in the Public Cloud | 30 | CCC601 | 300 | A3 Practical Scenario Evaluation 60%, A4 Scenario-based activity design and implementation 40% (individual) |
| CCC603 Cyber Security in the Cloud | 30 | CCC601, CCC602 | 300 | A5 Practical Demonstration 50%, A6 Report and Proof of Concepts 50% (individual) |
| CCC604 Multi-Cloud Security Integration and Project Management | 30 | CCC601–603 | 300 | A7 Project 70% (**group**), A8 Presentation 30% (**group**) |

- CCC604 correction: the Course Overview tile and the Programme Guide both say the project and the presentation are **group** work. CCC604 is still locked ("complete 02 - Data Engineering first").
- Qualification: **New Zealand Diploma in IT Infrastructure (Level 6), Systems Administration strand**. Aim: a pathway into systems administration for cloud and cybersecurity.
- Graduate Profile Outcomes, paraphrased: GPO1 automate deployment and management with scripts; GPO2 deploy cloud services incl. IaC, billing and cost management; GPO3 advanced network security, threat mitigation; GPO4 IT service management, change management, licensing, compliance, business continuity; GPO5 professional, ethical, legal practice; GPO6 communication, information design, teamwork; GPO7 project management and problem solving. Strand: resilient secure systems incl. identity and directory services; server virtualisation.
- Learning outcomes, paraphrased (full text: Course Overview tile https://yoobee.uplearn.education/course/section.php?id=19120). These could be used to tag tasks or show "what this week counts toward":
  - **CCC601**: LO1 evaluate needs for cost-effective, scalable, secure apps in public cloud · LO2 implement server virtualisation with cloud services · LO3 configure cloud virtual infrastructure using best practice · LO4 migrate Active Directory to a cloud-ready environment. Indicative content: architecture for performance, scale, HA and security; backup; provisioning compute, storage and network; cost optimisation; DR/BC; IAM across clouds.
  - **CCC602**: LO1 deploy with IaC aligned to billing and cost · LO2 compare vendors' services and automate infrastructure · LO3 design automated multi-vendor deployment using a friendly programming language. Indicative content follows the DEA-C01 domains: collection systems, analytics storage, access patterns, schema and format, lifecycle, cataloguing, transformation, visualisation, auth and encryption.
  - **CCC603**: LO1 cybersecurity measures to manage risk and privacy · LO2 assess network-security best practice · LO3 IT service practices for BC, licensing, compliance · LO4 procedures to manage cloud service licences · LO5 automation tools in a secure cloud. Indicative content: AWS security and traffic flow, AWS Marketplace licence types, Fortinet in AWS, load balancers, FortiGate HA (active-passive, active-active with ELB), Fortinet GitHub templates, FortiGate SDN connectors, FortiGate VM and FortiWeb in Azure.
  - **CCC604**: LO1 security integration across clouds · LO2 project management · LO3 evaluate multi-cloud security tools · LO4 risk assessment and mitigation · LO5 team communication · LO6 analyse incidents and vulnerabilities. Indicative content: PM, service selection, integration strategy, security and compliance, cloud risk discovery tools, hybrid cloud, collaboration, troubleshooting, soft skills.
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
| Fortinet Training Institute | https://training.fortinet.com/ | Create a FortiCloud account first at https://support.fortinet.com/cred/#/sign-up . Post 7 says to use your **Yoobee** email for this one. Log in at https://training.fortinet.com/my/ as "Email User", go to Library → FCF Cyber Security → Enrol Now. Used in CCC603 weeks 19–23. |
| MS Teams | – | Main tutor channel, signed in with Yoobee credentials. Keep questions short and in one message; tutors answer course questions only. Training keys, handouts (e.g. the A5 VPN handout) and the special consideration form are shared in the intake Team. |
| Microsoft 365 | https://m365.cloud.microsoft/apps | Word, PowerPoint, OneDrive via Yoobee account (00A Digital Skills). |

### AWS Academy details (post d=49392)

- Sign up at awsacademy.instructure.com from the invite email (subject like "Course Invitation"), using your Yoobee email. Set time zone to Auckland.
- Each course has four content types: video lectures, downloadable student guides, knowledge checks, and labs. Start with the Introduction module and the pre-course survey.
- **Knowledge checks need 80%+ each (unlimited retakes).** Passing all of them unlocks the AWS Academy **badge and completion certificate** ("Badges and Completion Certificates" section → Claim Your Badge, shareable on LinkedIn). A badge is not a certification; the real AWS exam is paid and taken separately. Candidate feature: a per-course "badge claimed" tick, or tracking knowledge-check completion.
- Labs start from module 4 and give a temporary AWS account (up to 2 h). Always sign out and click **End Lab** to save progress, and do labs in order. There's also a free sandbox for open exploration.
- Timing: Cloud Foundations + Cloud Architecting for CCC601 (FT weeks 1–4, PT 1–8). The Data Engineering course invite comes for CCC602. The **Security** course invite comes FT week 17 Monday / PT week 34 Monday, as a new module under the Cloud Foundations course.
- Why a personal console account too: Academy labs are fixed scripts, and every assessment needs your own build. The FAQ suggests 2–3 separate study Gmail accounts, and keeping root credentials only for when they're needed.

## Skillable (MSLE) lab classes

Dashboard: https://msle.learnondemand.net/User/Dashboard (each student's class enrolment URL is personal, so seed lab tasks link to the dashboard).

| Class | Required labs | In seed | Lab access ends |
|---|---|---|---|
| CCC601 AZ-900 | 8 hands-on labs (~1 h each) + end-of-class survey | Week 5 | 31 Dec 2026 |
| CCC601 AZ-104 | 14 hands-on labs, Learning Paths 01–11 (~1 h each) + survey | Weeks 6–8, matched to AZ-104 modules | 31 Dec 2026 |
| CCC602 DP-900 | 3 labs: Azure SQL Database (2 h 15), Azure Storage non-relational (2 h 15), large-scale analytics (3 h) + survey | Week 9 | 31 Dec 2026 |

- Hands-on labs have 10 launch attempts each. The end-of-class survey opens 7 days before the class end date.
- No Skillable class exists for DP-203 (CCC602 weeks 10–12). DP-203 practice is in your own Azure account.
- AZ-104 lab mapping: 01 → M1 · 02a, 02b → M2 · 03b → M3 · 04 → M4 · 05 → M5 · 06 → M6 · 07 → M7 · 08 → M8 · 09a–c → M9 · 10 → M10 · 11 → M11.

Optional "Skillable Challenge" labs (guided, ~30 min each, not required, not in seed):
- AZ-900, cloud concepts: Create an Azure Function App; Create an Azure Logic App; High availability with availability sets; VM scale sets.
- AZ-900, architecture and services: Manage resource groups; Run commands in Cloud Shell; DDoS protection plan; Key Vault encryption; Configure RBAC; Deploy a VM; Manage Entra users and groups; Network security group.
- AZ-900, management and governance: ARM template deployment; Configure a lock; Azure Monitor; Service Health; Cost Management.
- AZ-104: Manage a VM with Cloud Shell; Deploy a VM with PowerShell; Route tables (prerequisites) · Implement RBAC (identity and governance) · Virtual networking; VNet peering; Load balancer (networking) · Manage access to storage (storage) · VM scale sets (compute) · Azure Backup for VMs; VM diagnostic settings (monitor and back up).

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
- Create the Azure account **at least 30 days before** the assessment that needs it is due, so the credit covers the work.
- Never give a tutor your cloud logins; screenshots are the evidence. After screenshots, delete the resources; you don't need to keep them running.
- Special consideration: fill in the form (Student Hub, or the tutor's shared documents in Teams), combine it with your evidence into **one PDF**, and email it to the tutor. If accepted you get a new due date. If not, a late submission counts as a second attempt (max 50%).
- Post 1 lists which posts to read before week 1 (0–4) and which can wait: 5 (Azure account) until FT week 5 / PT week 9, and 6–7 until those courses start. That's a ready-made onboarding checklist, and most of it is already in `seed/prerequisites.yaml`.

Other course 00 pages: Start Here forum https://yoobee.uplearn.education/mod/forum/view.php?id=71861 (one "Welcome Day 1" post per intake with the Programme Guide and Day-1 slides attached), Time Capsule Activity (assignment 71862, 2 attempts allowed, ungraded reflection), Meet and Greet Zoom per intake, Programme Overview tile section 19115, Course Overview 19120, Programme Essentials 19125 (cert list plus the four core platform links), Hot Tips 19126 (be an active learner, balance study/work/life, schedule focused time, motivation, preparation).

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

### Assessment requirements worth surfacing (facts only, from the briefs; no brief text copied)

These are checklist-style facts a "before you submit" feature could show. They don't help write the answers.

| Assessment | Deliverable notes |
|---|---|
| A1 | 800–1000-word report (±10%) for the theory task; an **architecture diagram** showing security groups, subnets and NACLs; Trusted Advisor is explored in the AWS Academy environment because free tier limits it |
| A2 | Several 200-word (±10%) mini-reports; "delete all resources after completion" appears on each practical task |
| A3 | Max 500-word (±10%) report for Task 1; ARM-template deployment with Yoobee tagging/cost-governance rules; Tokyo Olympics dataset (Kaggle CSVs); visualisation in a tool such as Power BI, Tableau or Looker Studio; delete the whole resource group afterwards |
| A4 | S3, Glue, Athena, QuickSight, Lambda, SNS pipeline plus a cross-cloud copy to Azure Synapse; **labelled architecture diagram**; delete the S3 bucket, IAM role and Glue tables afterwards |
| A5 | Site-to-site VPN between two VPCs; **your own labelled AWS architecture diagram** (VPCs with CIDRs, subnets, EC2, VGW/CGW, tunnel); minimum 500 words (±10%); **APA** citations and reference list |
| A6 | Report + PoC with FortiGate in AWS; **architecture diagram** (VPC, subnets, route tables, ENIs, FortiGate, traffic flow, 5%); **5–7 minute video walkthrough** (10%); APA references (5%) |

- Tutor-provided public repos (datasets, ARM template, SQL, PySpark notebooks): A3 https://github.com/yoobeecloud/Assessment_3_Azure_Project_Codes , A4 https://github.com/yoobeecloud/Assessment_4_AWS_Project_Codes .
- Every brief has an academic-integrity section: using AI to create answers counts as misconduct. This matches CLAUDE.md's "teach, don't write" rule.
- Submission format doc (`docs/assessments/general/Submission_instructions_and_format.docx`): one PDF. Every practical screenshot must show your AWS or Azure **account name**. File name `1_StudentID_Firstname_Lastname_Assessment_N_CCC60X_First_Attempt`. Include a title page (assessment title, course, student name and ID, tutor, programme, date), a table of contents by Task/Answer, and References. Multiple files or wrong naming may be rejected. Delete cloud resources after taking screenshots.
- Moodle assignment pages attach the brief as `1_CCC_60X_Assessment-N_Version_1.1_Student_Copy.pdf`. A version bump would mean the brief changed.

## Announcements (Pānui), mostly industry events and offers

- CCC601 Pānui https://yoobee.uplearn.education/mod/forum/view.php?id=73359 : AWS Cloud and AI Day Auckland 2026 (registration and agenda posts, Sep 2026), Microsoft AI Skills Fest free certification offer, Fortinet/Forrester webinars, student survey reminders.
- CCC603 Pānui https://yoobee.uplearn.education/mod/forum/view.php?id=73361 : Fortinet FastTrack sessions, FortiOS 8.0 webinar, NSE certification programme changes (effective 15 July). Fortinet Community Connect NZ: https://global.fortinet.com/apac-lp-anz-nz-community-connect-Q32026 . NSE programme update flyer: https://www.fortinet.com/content/dam/fortinet/assets/flyer/op-nse-fall-updates.pdf
- CCC602 Pānui https://yoobee.uplearn.education/mod/forum/view.php?id=73360 : only the A3 command handout post.
- Pattern: Pānui is mostly event and webinar promos plus survey reminders, with no schedule data. Training-key posts for specific intakes also appear here; never import them.

## Suggested study plans per course (from each course's overview tile)

Each course has an overview tile with an 8-week FT plan. The CCC601 plan lives in the FT schedule posts instead. These match the seed files; they're kept here as the source summary. For part-time, the tiles say to allow about twice as long.

**CCC602** (tile "DCE-02_Data engineering in the Public Cloud", section 9655):
1. DP-900 LP1–4 (core data concepts, relational, non-relational, data warehouse/analytics)
2. DP-203 M1–4 (get started with data engineering, Synapse serverless SQL pools, Synapse Spark pools, data warehouse)
3. DP-203 M5–7 (Synapse pipelines, hybrid transactional/analytical processing, Stream Analytics)
4. DP-203 M8–9 (govern data with Purview, Databricks)
5. DEA-C01 M1–4 (welcome and overview, data-driven organisation, elements of data, pipeline design patterns)
6. DEA-C01 M5–8 (securing and scaling pipelines, ingesting and preparing, batch vs stream, storing and organising)
7. DEA-C01 M9–10 (big data processing, data for ML)
8. DEA-C01 M11–12 (analysing and visualising, automating the pipeline)

The tile notes that DP-203 assumes SQL plus Python or Scala.

**CCC603** (tile "Course Welcome and Overview", section 9698):
1. SCS-C02 M1–4 (security foundations, security on AWS, securing access, securing infrastructure)
2. SCS-C02 M5–8 (protecting data, logging and monitoring, incident response, bridging to certification)
3. FCF: Introduction to the Threat Landscape (core) + Getting Started in Cybersecurity (~3.5 h) + Technical Introduction to Cybersecurity (~7 h)
4. A5 practical demonstration
5. FCA FortiGate Operator M1–6 (overview, interfaces and routing, firewall policies, user authentication, SSL inspection, blocking malware); the course is ~6 h
6. FCA M7–13 (web filtering, IPS, application control, IPsec VPN, SSL VPN, maintenance and monitoring, Security Fabric)
7. NSE 7 Public Cloud Security (~16 h). The overview tile lists AWS intro, AWS components, Fortinet products in AWS, HA and load balancer. The NSE 7 tile (9702) lists: cloud security best practices, IaC, securing IaaS, securing CaaS, troubleshooting, FortiCNP features, FortiCNP cloud protection. FortiCNP lab demos: onboard an AWS account, Azure prerequisites, add an Azure account, FortiCNP demo.
8. A6 report and proof of concept

- Fortinet cert facts: FCF = one core course + one elective, valid **2 years** from finishing the second course. The FortiGate Operator exam (part of FCA) is taken on the Fortinet Training Institute. NSE 7 is now branded "Fortinet Certified Solution Specialist (FCSS): Public Cloud Security".

## Part-time schedules (PT forums 74591, 74593, 74595)

Recorded so PT students can be added later. PT weeks run 1–48 across CCC601–603 (CCC604 PT not visible). Each FT week ≈ two PT weeks, but the split isn't always even. CF = AWS Academy Cloud Foundations, CA = Cloud Architecting.

| PT wk | Content |
|---|---|
| 1 | Onboarding steps (read posts 0–4), CF M1–3 (cloud concepts, economics and billing, global infrastructure); A1 opens |
| 2 | CF M4 security, M5 networking and content delivery |
| 3 | CF M6 compute, M7 storage, M8 databases |
| 4 | CF M9 cloud architecture, M10 auto scaling and monitoring |
| 5 | CA M0–5 (welcome, intro, securing access, S3 storage layer, EC2 compute layer) |
| 6 | CA M6–9 (database layer, networking environment, connecting networks, securing user/app/data access) |
| 7 | CA M10–13 (monitoring/elasticity/HA, automating, caching, decoupled architectures) |
| 8 | CA M14–16 (serverless and microservices, data engineering patterns, planning for disaster); **A1 due** |
| 9 | Azure intro + AZ-900 paths 1–3; MSLE key; create Azure account; A2 opens |
| 10 | AZ-104 intro, LP1 identity, LP2 governance and compliance |
| 11 | LP3 Azure resources, LP4 virtual networking |
| 12 | LP5 intersite connectivity, LP6 network traffic management |
| 13 | LP7 storage, LP8 virtual machines |
| 14 | LP9 PaaS compute, LP10 data protection, LP11 monitoring |
| 15–16 | A2 work; **A2 due** end of week 16 |
| 17 | DP-900 LP1–2; MSLE key; A3 opens |
| 18 | DP-900 LP3–4 |
| 19 | DP-203 welcome + M1–2 |
| 20 | DP-203 M3–4 |
| 21 | DP-203 M5–7 |
| 22 | DP-203 M7–8 |
| 23 | DP-203 M9 Databricks |
| 24 | **A3 due** |
| 25 | DEA-C01 M1–3; A4 opens |
| 26 | DEA M4–5 |
| 27 | DEA M6–7 |
| 28 | DEA M8–9 |
| 29 | DEA M10–11 |
| 30 | DEA M12 |
| 31–32 | A4 work; **A4 due** end of week 32 |
| 33–36 | SCS-C02 M1–8 (about 2 a week; labs include resource-based policies, securing VPC resources, remediating an incident); AWS Security invite PT week 34 |
| 37–40 | FCF + A5 work; **A5 due** end of week 40 |
| 41 | FCA M1–3 |
| 42 | FCA M4–6 |
| 43 | FCA M7–10 |
| 44 | FCA M11–13 |
| 45–46 | NSE 7 M1–7 + FortiCNP demos |
| 47–48 | A6 work; **A6 due** end of week 48 |

- PT key timings from the FAQ: Azure/MSLE from PT week 9, DP-900/DP-203 from PT week 17, AWS Security invite PT week 34.
- PT post ids: CCC601 d=48874–48902, CCC602 d=48959–48981 (odd numbers), CCC603 d=48983–49005.

## Reference links on each course tile

These are the official docs each tile points to. Most are already task links in the seed; the rest could be "further reading" links on a submodule. Prefixes: `A/` = https://aws.amazon.com/ , `D/` = https://docs.aws.amazon.com/ , `L/` = https://learn.microsoft.com/en-us/ .

- **CLF-C02 tile (CCC601, 9686)**: A/training · D/whitepapers/latest/aws-overview/introduction.html · A/economics · A/about-aws/global-infrastructure · D/security · A/products/networking, compute, storage, databases, management-tools · A/architecture/well-architected · A/autoscaling
- **SAA-C03 tile (9687)**: A/training/awsacademy · well-architected · D/ pages for IAM, S3, EC2, RDS, VPC, Direct Connect, security, CloudWatch, Auto Scaling, CloudFormation, CloudFront, SQS, SNS, Lambda, API Gateway · A/big-data/data-engineering · D/whitepapers/latest/disaster-recovery-workloads-on-aws/introduction.html
- **AZ-900 tile (9688)**: three learning paths (cloud concepts, architecture and services, management and governance)
- **AZ-104 tile (9681)**: paths az-104-manage-identities-governance, -virtual-networks, -storage, -compute-resources, -monitor-backup-resources · modules describe-features-tools-manage-deploy-azure-resources, configure-vnet-peering, control-network-traffic-flow-with-routes, configure-azure-app-services, configure-app-service-plans, configure-azure-container-instances · docs L/azure/load-balancer/load-balancer-overview, L/azure/application-gateway/overview, L/azure/network-watcher/network-watcher-overview
- **DP-900 tile (CCC602, 9656)**: paths azure-data-fundamentals-explore-core-data-concepts, -relational-data, -non-relational-data, -data-warehouse-analytics
- **DP-203 tile (9657)**: Exam Readiness Zone video L/shows/exam-readiness-zone/preparing-for-dp-203-design-and-implement-data-storage-1-of-3 · path get-started-data-engineering · L/azure/synapse-analytics and its Spark overview · modules integrate-sql-apache-spark-pools-azure-synapse-analytics, design-modern-data-warehouse-using-azure-synapse-analytics · L/azure/data-factory/concepts-pipelines-activities · L/azure/cosmos-db/synapse-link · L/azure/synapse-analytics/synapse-link/sql-synapse-link-overview · path implement-data-streaming-with-asa · L/purview/purview, L/purview/data-governance-overview · path data-engineer-azure-databricks
- **DEA-C01 tile (9658)**: A/certification/certified-data-engineer-associate · exam guide PDF on d1.awsstatic.com (training-and-certification/docs-data-engineer-associate) · A/executive-insights/content/how-do-you-become-a-data-driven-organization · A/data/datastrategy · A/big-data/datalakes-and-analytics · D/whitepapers/latest/building-data-lakes/designing-data-lakes-and-analytics-on-aws.html · AWS security best practices whitepaper · D/ pages for Glue, Kinesis, S3, Redshift, EMR, SageMaker, QuickSight, Step Functions · A/data-visualization
- **SCS-C02 tile (CCC603, 9699)**: A/certification/certified-security-specialty · D/whitepapers/latest/security-best-practices/security-best-practices.html · A/compliance/shared-responsibility-model · IAM intro · S3 example bucket policies and S3 security best practices · Organizations · VPC, security groups, network ACLs · Elastic Load Balancing · EC2 security · whitepapers on securing data at rest, data in transit, logging and monitoring, and the security incident response guide · KMS · CloudTrail · CloudWatch · Security Hub · Config · Lambda
- **Fortinet tiles (9700–9702)**: training.fortinet.com static course pages (login needed for deep links) · https://www.fortinet.com/training-certification

## Tools and extra resources

What the portal itself recommends, plus clearly marked suggestions where it's silent.

**Named on UPLearn or in the briefs**
- **Azure Data Studio** and **SSMS** for querying Azure SQL (CCC602 week 9 post).
- **Azure PowerShell** (`Install-Module Az`, then `Connect-AzAccount`), Azure Cloud Shell and ARM templates. The A3 command handout says to keep templates in GitHub for version control (Pānui d=52021).
- **Azure Storage Explorer**, to check the data lake /raw/ folder (A3).
- **Power BI**, **Tableau** or **Looker Studio** for visualisation (A3). **Amazon QuickSight** for A4.
- **Kaggle** (Tokyo Olympics CSVs) and the tutor repos `github.com/yoobeecloud/...` for assessment datasets.
- **DP-203 practice questions**: https://github.com/Amrit-Hub/DP-203-Data-Engineer-Associate-Questions and https://github.com/timothywarner/dp203 (CCC602 week 12 post). This is a good quiz-feature source.
- **Microsoft Learn Exam Readiness Zone** video for DP-203 (on the DP-203 tile).
- **Microsoft Learn for Educators** hub: https://learn.microsoft.com/en-us/training/educator-center/ (Programme Essentials tile).
- **AWS Trusted Advisor** for cost optimisation (A1). **AWS Budgets** is set up on day 1.
- **Fortinet GitHub** templates for deploying FortiGate in AWS and Azure (CCC603 indicative content) and **FortiCNP** (NSE 7 labs).
- Office tools from 00A: Microsoft 365 apps, Word (assessment write-ups, Save as PDF), PowerPoint (export as video for presentations), **Canva** free (https://www.canva.com/free/), Zoom, phone and Windows screen-recording guides. These are useful for the A6 video and the A8 presentation.
- Study technique links from 00A: Pomodoro technique, the Freedom focus app (https://freedom.to/), Zapier's focus-apps list, an editable weekly schedule PDF and an "Are you ready" quiz on UPLearn, and a learning-style quiz (https://www.learningstylequiz.com/). Candidates for a Pomodoro timer or weekly planner feature.

**Architecture diagram tools (the portal names none)**
A1, A4, A5 and A6 all mark an architecture diagram, but no UPLearn page, post or brief recommends a tool. These are common free choices (our suggestion, not Yoobee's):
- draw.io / diagrams.net (https://app.diagrams.net/), which has AWS and Azure shape libraries built in
- AWS Architecture Icons, the official icon set and PowerPoint/draw.io packs: https://aws.amazon.com/architecture/icons/
- Azure architecture icons: https://learn.microsoft.com/en-us/azure/architecture/icons/
- Checking which tool the tutor prefers would be worth one Teams message.

**Referencing**: A5 and A6 require **APA** style (in-text citations plus a reference list). 00A's Digital Skills tile covers researching, evaluating and referencing.

## Onboarding course (00A, course 632) and support

00A "Ready, Set, Go" is generic Yoobee Online onboarding with eight tiles: Welcome 10952, Introduction 18330, Activation 10956, Success with learning 10957 (Forum Playground, forum 69705), Pathway to success 18345, Digital Skills 18346, Next steps 18347, Copyright 18348. Useful bits:

- **Hardware baseline** (all online programmes): Windows 10 64-bit 1809+ or Mac equivalent; Intel 7th gen+ (i5 recommended); 8 GB RAM (16 recommended); 4 GB GPU VRAM; 1280×800 minimum (1920×1080 recommended); 256 GB SSD (512 recommended); webcam, mic, speakers, broadband; cloud or external backup; antivirus; latest Chrome. Yoobee IT doesn't support personal devices. PB Tech offers a student discount through UP Education (code on the 00A Introduction tile).
- **UPLearn problems**: email onlinesupport@yoobeecolleges.com with screenshots, what you were doing, OS and browser versions, and what you've tried. **Online Learning Support** (Programme Guide): Online.Learning@yoobeecolleges.com. For your own device: Geeks on Wheels (https://www.geeksonwheels.co.nz/), Need a Nerd (https://www.needanerd.nz/). Online safety: https://www.ownyouronline.govt.nz/ .
- **Wellbeing** (Pathway to success tile): Te Whare Tapa Whā (https://mentalhealth.org.nz/te-whare-tapa-wha); Depression Helpline 0800 111 757 or text 4202; Anxiety line 0800 269 4389; Lifeline, Alcohol Drug Helpline, Shine, Women's Refuge, OUTLine, He Waka Tapu, anyquestions.govt.nz; 111 for emergencies; plus eye-strain and desk-ergonomics tips. Candidate for a small "Help" page.
- **Student admin**: StudyLink (https://www.studylink.govt.nz/), student card (https://studentcard.co.nz/), Learner Information Hub / Kapehu (myacg SharePoint, above).
- **What a typical week looks like** (Programme Guide): engage with content, forums and live session (or recording), assessment work, practise then reflect, and admin (read the Monday post, plan the week, 1:1s, group meetings for CCC604, read feedback). Tutor 1:1s are 15-minute bookings via a link in Teams (not stored).

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

Tile (section) ids:
- **00**: Programme Overview 19115, Course Overview 19120, Programme Essentials 19125, Hot Tips 19126.
- **CCC601**: Schedule 20675, CLF-C02 9686, SAA-C03 9687, AZ-900 9688, AZ-104 9681, Assessments 9689.
- **CCC602**: Schedule 20676, Overview 9655, DP-900 9656, DP-203 9657, DEA-C01 9658, Copyright 9659, Assessments 9649.
- **CCC603**: Schedule 20677, Overview 9698, SCS-C02 9699, FCF 9700, FCA 9701, NSE 7 9702, Copyright 9703, Assessments 9691.

Other ids:
- Course 00: Start Here forum 71861 (Welcome Day 1 post d=51839), Time Capsule 71862, Things to know 74020, weekly live Zoom 73721.
- FT post ids: CCC601 d=48871–48890, CCC602 d=48958–48972 (even numbers), CCC603 d=48982–48996 (even numbers).

## Gaps and follow-ups

- **CCC604**: still locked ("complete 02 first"). Dates and assessments are known from the Programme Guide (weeks 25–32, A7 and A8 above). Weekly content and tiles will need one visit after CCC602 is done, and that's the only planned return to the portal.
- **CCC603**: the course was readable, but the owner doesn't officially have access yet. Re-check `seed/ccc603.yaml` when it opens; FT week posts may change.
- The FT week posts for CCC603 are dated Dec 2025 – Jan 2026 (reused from an earlier intake); the actual dates for this intake come from the Programme Guide above.
- AWS Academy module pages have no public URLs, so AWS tasks link to the matching AWS docs plus the UPLearn tile. AWS Academy (Canvas) itself wasn't swept; it's a separate site.
- Fortinet module tasks link to the Training Institute home; deep links need login.
- Part-time CCC604 schedule and PT assessment due dates (they depend on the PT intake's Programme Guide) aren't available.
- The first break: the earlier version of this file said it started 14 Sep (derived); the Programme Guide says 12 Sep. Use the guide.
- The Programme Guide lists King's Birthday 2026 as 5 June; the actual NZ date was 1 June 2026. It doesn't matter for this intake.
- The Day-1 orientation slides (`1_Day1_DCCC_PPT_2607_FT.pdf` on d=51839) weren't downloaded; the Programme Guide and FAQs cover the same ground.
