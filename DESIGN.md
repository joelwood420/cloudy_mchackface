---
name: Cloudy McHackface
description: A field guide to the Yoobee Level 6 Cloud & Cyber programme. What to do this week, and where it lives in UPLearn.
colors:
  terminal-teal: "#0e7c72"
  terminal-teal-deep: "#0b5f57"
  terminal-teal-ink: "#084f48"
  teal-wash: "#e4f2f0"
  teal-mist: "#f5faf9"
  teal-rule: "#cfe5e2"
  cool-paper: "#f4f5f7"
  page-white: "#ffffff"
  hairline: "#e3e6eb"
  hairline-soft: "#eef0f3"
  rail-line: "#dde1e6"
  dot-ring: "#cfd4db"
  tag-grey: "#f0f2f5"
  ink: "#12161c"
  ink-soft: "#3a4350"
  slate: "#5a6472"
  pebble: "#8a93a0"
  deadline-amber-ink: "#9a4f08"
  deadline-amber-wash: "#fcefdd"
  overdue-red: "#b42318"
  overdue-wash: "#fde7e7"
  error-wash: "#fdecec"
  notice-blue: "#164f80"
  notice-wash: "#e3eef9"
  night-console: "#0f1e33"
  alarm-amber: "#f2a33a"
  alarm-amber-light: "#f7c47e"
typography:
  display:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "clamp(28px, 3vw, 38px)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
  title:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
  body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.06em"
  code:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 500
rounded:
  tag: "4px"
  control: "8px"
  alarm: "10px"
  card: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.terminal-teal}"
    textColor: "{colors.page-white}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.terminal-teal-deep}"
  button-secondary:
    backgroundColor: "{colors.page-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  card:
    backgroundColor: "{colors.page-white}"
    rounded: "{rounded.card}"
  nav-item-active:
    backgroundColor: "{colors.teal-wash}"
    textColor: "{colors.terminal-teal-deep}"
    rounded: "{rounded.control}"
    height: "44px"
  tag:
    backgroundColor: "{colors.tag-grey}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.tag}"
    padding: "2px 8px"
  status-chip-soon:
    backgroundColor: "{colors.deadline-amber-wash}"
    textColor: "{colors.deadline-amber-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  status-chip-overdue:
    backgroundColor: "{colors.overdue-wash}"
    textColor: "{colors.overdue-red}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  malware-banner:
    backgroundColor: "{colors.night-console}"
    textColor: "{colors.page-white}"
    rounded: "{rounded.card}"
    padding: "14px 18px"
  malware-button:
    backgroundColor: "{colors.alarm-amber}"
    textColor: "{colors.night-console}"
    rounded: "{rounded.alarm}"
    height: "44px"
---

# Design System: Cloudy McHackface

## Overview

**Creative North Star: "The Field Guide"**

A pocket guide to a messy place. UPLearn is the wilderness; this app is the guide you keep open beside Microsoft Learn or a lab: where you are this week, what's next, and exactly where each thing lives. The look is cool paper and Terminal Teal ink, with course codes and week numbers in mono like grid references on a map.

It should feel friendly and tactile, not clinical. Cards are white on a cool grey page with gently rounded corners and generous 44px touch targets. The open week lifts slightly off the page. Colour carries state and wayfinding: teal for "you are here" and progress, amber for "due soon", red for "overdue". The one loud element is the malware banner, a night-blue console panel with an amber alarm. It is deliberately in-your-face and not dismissible, because showing you're falling behind is its job.

The guide is a study tool, not a dashboard of vanity numbers. Every bar and count comes from real ticks; nothing decorative pretends to be data.

**Key Characteristics:**
- Cool grey page, white cards, thin hairline borders.
- One accent (Terminal Teal) for progress, current location and primary actions.
- Mono type for codes, week numbers and machine-ish labels only.
- Status colour is semantic: amber soon, red overdue, blue informational.
- One intentional alarm: the night-blue and amber malware banner.

## Colors

A cool, low-chroma neutral world with one teal accent and a small set of semantic state colours.

### Primary
- **Terminal Teal** (#0e7c72): progress fills, the current-week dot, the active timeline card border, primary buttons, focus rings.
- **Terminal Teal Deep** (#0b5f57): link text, active nav text, prerequisite headings, hover on primary buttons.
- **Terminal Teal Ink** (#084f48): link hover.
- **Teal Wash** (#e4f2f0): active nav background, "Current week" badge.
- **Teal Mist** (#f5faf9) and **Teal Rule** (#cfe5e2): the "Before you start" box and the selected sidebar module.

### Neutral
- **Cool Paper** (#f4f5f7): page background.
- **Page White** (#ffffff): cards, sidebar, top and bottom bars.
- **Hairline** (#e3e6eb): card borders, dividers, empty progress tracks. **Hairline Soft** (#eef0f3) separates task rows.
- **Rail Line** (#dde1e6) and **Dot Ring** (#cfd4db): the timeline spine and week dots; Dot Ring also outlines secondary buttons and inputs.
- **Tag Grey** (#f0f2f5): task type tags and neutral chips.
- **Ink** (#12161c) for headings and body; **Ink Soft** (#3a4350) for secondary text; **Slate** (#5a6472) for muted meta text, including "coming soon" items; **Pebble** (#8a93a0) is reserved and not for text.

### Semantic
- **Deadline Amber** (#9a4f08 on #fcefdd): "Due in N days" within a week.
- **Overdue Red** (#b42318 on #fde7e7): overdue chips; **Error Wash** (#fdecec) behind error messages.
- **Notice Blue** (#164f80 on #e3eef9): submitted chips and informational notices (breaks, holidays).
- **Night Console** (#0f1e33), **Alarm Amber** (#f2a33a), **Alarm Amber Light** (#f7c47e): the malware banner only.

### Brand mark
- **Cloud mark:** a white cloud with a Brand Navy (#121e33) outline, pixel sunglasses and a pixel smirk, beside the "Cloudy McHackface" name in the sidebar and phone top bar.
- **Favicon and home-screen icon:** the same white cloud on a Brand Navy tile. The favicon drops the smirk, which is lost at 16px.
- Brand Navy sits close to Night Console but only ever draws the logo. It is not a UI colour.

### Named Rules
**The You-Are-Here Rule.** Terminal Teal marks where you are and how far you've come. Don't spend it on decoration.

**The One Alarm Rule.** Night Console and Alarm Amber belong to the malware banner alone. No other component borrows them.

## Typography

**Display Font:** Schibsted Grotesk (with system-ui)
**Body Font:** IBM Plex Sans (with system-ui)
**Label/Mono Font:** IBM Plex Mono (with ui-monospace)

**Character:** A sturdy grotesk for headings over a plain, technical sans. The mono is the guide's grid reference: course codes, week numbers, "MALWARE DETECTED".

### Hierarchy
- **Display** (700, clamp(28px, 3vw, 38px), 1.1, -0.015em): page titles ("Week 11", module names).
- **Headline** (600, 20px): section headings (Tasks, Assessments, Weekly timeline).
- **Title** (600, 17px): track headings ("DP-203 · Azure Data Engineer Associate"), week titles at 16px.
- **Body** (400, 15px, 1.5): task titles and running text; 13–14px for meta and links.
- **Label** (600, 11–12px, 0.06em, uppercase): "Your modules", "Before you start", "Current week", "Soon".
- **Code** (Plex Mono 500, 12–13px): course codes, week numbers, breadcrumbs' current item.

### Named Rules
**The Grid Reference Rule.** Mono is for codes and numbers that point somewhere. Never set sentences in mono.

## Layout

A two-column app shell: a 240px white sidebar and a flexible content column capped at 1120px with 40px top padding and a fluid side gutter (clamp(16px, 4vw, 56px)). Content pages stack sections with a 32px gap. Module and This week pages pair a main column (flex basis 520px) with a 300px rail, 32px apart, wrapping to one column when space runs out.

Spacing steps are 4, 8, 12, 16, 20 and 32px: tight (4–8px) inside a group, 12–16px between siblings, 32px between sections.

Below 800px the sidebar becomes a slim sticky top bar (brand plus a Menu button that opens modules, week, email and Log out). The main navigation moves to a fixed bottom tab bar of three 56px tabs, padded for the iPhone home indicator. Content gets matching bottom padding. All touch targets are at least 44px.

## Elevation & Depth

Flat by default. Depth comes from tonal layering: white cards on Cool Paper, separated by 1px hairlines. The only shadow is the open-week lift (`0 6px 20px rgba(14, 124, 114, 0.1)`), a soft teal glow paired with a teal border on the expanded timeline card.

### Named Rules
**The Lift-On-Open Rule.** Surfaces are flat at rest. Only the thing you've opened lifts.

## Shapes

Gently rounded throughout: 12px for cards, panels and the malware banner; 10px for the alarm button and notices; 8px for buttons, inputs, nav items and sidebar module tiles; 4px for type tags; full pills for status chips and badges. Week dots on the timeline are 32px circles joined by a 2px spine.

## Components

### Buttons
- **Shape:** gently rounded (8px), 44px tall.
- **Primary:** Terminal Teal fill, white text, 600 weight, 0 18px padding; hover darkens to Terminal Teal Deep.
- **Secondary:** white with a Dot Ring border and Ink text; hover turns border and text teal.
- **Disabled:** 60% opacity.
- **Alarm (malware):** Alarm Amber fill, Night Console text, 700 weight, 10px corners.

### Chips
- **Status chips:** pills, 12px 600 text. Neutral (Tag Grey), Soon (Deadline Amber), Overdue (Overdue Red), Done (Notice Blue).
- **Type tags:** 4px corners, Tag Grey, Ink Soft text ("Learning path", "Lab", "Assessment").

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Page White on Cool Paper.
- **Shadow Strategy:** none at rest; see Elevation.
- **Border:** 1px Hairline.
- **Internal Padding:** 18–24px (week groups 6px 20px, with 44px link rows supplying vertical air).

### Inputs / Fields
- **Style:** 44px tall, 8px corners, Dot Ring border, white fill, label above in 500 weight.
- **Focus:** 2px Terminal Teal outline.

### Navigation
- **Desktop:** vertical list of 44px items with 18px line icons; active item gets Teal Wash and Terminal Teal Deep text.
- **Phone:** bottom tab bar, icon over a 12px label, same active treatment.

### Week Timeline (signature)
Numbered 32px dots on a grey spine, each beside an expandable week card (Week N in mono, title, x/y done, slim progress bar, chevron). The current week fills its dot with Terminal Teal and carries a "Current week" badge. Open cards lift and show their schedule post link, then task rows.

### Malware Banner (signature)
A Night Console panel with an amber bug tile, "MALWARE DETECTED" in mono Alarm Amber Light, the lurking-task count, and an amber "Quarantine them" button that opens the overdue list. It stays put until the backlog is cleared.

## Do's and Don'ts

### Do:
- **Do** use Terminal Teal (#0e7c72) only for progress, current location, primary actions and focus.
- **Do** keep every interactive target at least 44px tall.
- **Do** set course codes and week numbers in IBM Plex Mono.
- **Do** name UPLearn links by where they go ("DP-203 tile", "Assignment", "Week 11 schedule post").
- **Do** use the semantic chips (amber soon, red overdue, blue done) for status, never plain teal.

### Don't:
- **Don't** reuse Night Console or Alarm Amber outside the malware banner.
- **Don't** make the malware banner dismissible or quieter; it is meant to be in your face.
- **Don't** show progress or numbers that don't come from real ticks.
- **Don't** fade text with opacity to mark "coming soon"; use Slate (#5a6472).
- **Don't** add shadows to resting cards.
