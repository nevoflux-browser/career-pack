---
name: career-setup
description: >-
  First-run onboarding for the career pack. Fills career/cv and career/profile
  from YOUR input (transcribing, never inventing), confirms target archetypes and
  the `## Portals` scan config, captures a salary target and writing-style samples,
  and offers to create the weekly patterns review loop. Idempotent — it only fills
  gaps and guides, and it never invents CV content.
version: 0.1.0
tags:
  - career
  - setup
  - onboarding
dependencies:
  - career:conventions/rules.md
  - career:conventions/data.md
  - career:conventions/scoring.md
allowed_tools:
  - brain_get_page
  - brain_put_page
  - brain_search
  - browser_ask_user
enabled: true
---

# /career-setup

Get a new user from "installed" to "ready to scan and evaluate". Read
`career:conventions/rules.md` first — in particular **never invent** experience
or metrics; everything written here comes from the user. career-setup is the
sanctioned **initial** writer of `career/cv` and `career/profile` (see
`career:conventions/data.md`); after onboarding, `career/cv` is read-only and
`career/profile` is edited only by career-patterns.

## Step 0 — Load contracts

`skill_read('career', 'conventions/rules.md')`, then `data.md` (page slugs +
permissions) and `scoring.md` (the archetype taxonomy for Step 3).

## Step 1 — Check the seed pages

`brain_get_page` for `career/cv`, `career/profile`, `career/applications`. The
pack seeds these only-if-absent, so classify each:

- **absent** — seeding didn't run; create it in the relevant step below.
- **template** — still contains `{placeholder}` / "Example Co" / "replace me".
- **filled** — real user content already present.

Report the three statuses, then act only on absent/template pages.

## Step 2 — CV (`career/cv`)

Only if the page is absent or still the template: `browser_ask_user` to have the
user **paste or dictate their real CV**. **Transcribe it verbatim** into the
seed structure (summary / experience with quantified metrics / skills /
education) and `brain_put_page` to `career/cv`. Never add a metric, role, or
achievement the user didn't state (`rules.md`).

If it's already filled, skip. Offer an incremental path ("tell me more about
you") that **appends** user-provided facts without altering existing lines.

## Step 3 — Profile (`career/profile`)

Gather interactively with `browser_ask_user`, then `brain_put_page` to
`career/profile` in the seed template's shape:

- **North-star** — one sentence on the goal (~2 years out).
- **Target archetypes** — offer the taxonomy from `scoring.md`; the user
  picks/edits. This drives archetype detection at evaluation time.
- **`## Portals`** — the scan config the dashboard reads. Turn the user's target
  companies into `tracked_companies` entries: greenhouse / ashby / lever are
  recognized by their `careers_url` (no code); a plain careers page gets an
  `extract: { prefer_json_ld: true }` block; LinkedIn gets a `search:` block
  (show `COMPLIANCE_NOTICE` first). Set `title_filter` (positive/negative) and
  `location_filter` from the user's must-haves. Keep the YAML block shape the
  dashboard parses.
- **Salary target** — currency + range; **never below market** (`rules.md`).
- **Writing-style samples** — 2–3 lines the user would actually write, so
  career-writing can calibrate tone.

## Step 4 — Tracker (`career/applications`)

Confirm it exists (seeded). Leave the example row for the user to delete on
their first real entry. Only `brain_put_page` the empty tracker if the page is
absent.

## Step 5 — Offer the weekly patterns loop

`browser_ask_user` before creating anything. If the user agrees, tell them to
run `/loop 7d /career-patterns` (or use the platform's loop UI) — a weekly
review that surfaces the funnel + conversion analysis once ≥5 applications have
progressed past `evaluated`. Do **not** create the loop silently.

> A daily follow-up loop is part of the design but is **not available yet** — it
> needs the `career-followup` skill. Mention it as coming; don't wire a loop to a
> skill that isn't installed.

## Boundaries

- Never invent CV content — transcribe only what the user provides.
- Only touch `career/cv`, `career/profile`, `career/applications` — never other
  users' data or pages outside the `career/` namespace.
- Never create a loop or send anything without explicit confirmation.
