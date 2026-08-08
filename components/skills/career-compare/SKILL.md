---
name: career-compare
description: >-
  Compare 2+ already-evaluated jobs side by side. Reads their career/reports/*
  pages, ranks by the 1–5 global score, and builds a dimension-by-dimension (A–G)
  comparison table with a recommendation and the key tradeoffs. Read-only on the
  source reports — never re-evaluates.
version: 0.1.0
tags:
  - career
  - compare
  - decision
dependencies:
  - career:conventions/rules.md
  - career:conventions/scoring.md
  - career:conventions/data.md
allowed_tools:
  - brain_get_page
  - brain_search
  - brain_list_pages
  - brain_put_page
  - browser_ask_user
enabled: true
---

# /career-compare

Put several evaluated jobs next to each other so the user can choose. Read
`career:conventions/rules.md` first. The source of truth is the saved reports —
this skill is **read-only** on them and never re-evaluates.

## Step 0 — Contracts + pick the set

`skill_read('career', 'conventions/rules.md')`, then `scoring.md` (the A–G
dimensions + the 1–5 score). Identify the jobs to compare: use the
`career/reports/{slug}` pages the user names, or `brain_search` /
`brain_list_pages` under `career/reports/` and `browser_ask_user` to confirm.
**Require ≥2 reports**; if fewer exist, say so and stop.

## Step 1 — Read the reports

`brain_get_page` each report. Extract the global score and the salient point from
each dimension — especially **C** (comp & seniority), **D** (company & market),
**E** (remote & eligibility), **F** (growth & risk), and **G** (legitimacy) —
plus the blockers.

## Step 2 — Rank + build the table

Rank by the 1–5 global score; break ties by fewer/softer blockers, then by fit
(A/B). Build a side-by-side table — rows = Score, A…G highlights, Blockers,
Legitimacy; columns = the jobs. Keep each cell to a phrase.

## Step 3 — Recommend

State the top pick and the one or two real tradeoffs against the runner-up (e.g.
"higher comp but geo-restricted", "best growth but Unclear legitimacy"). Present
**signals, not verdicts** — the user decides.

## Step 4 — Save (optional)

If the user wants it kept, `brain_put_page` the table + recommendation to
`career/reports/compare-{YYYY-MM-DD}`.

## Boundaries

- Read-only on the source reports — never re-score or edit them.
- Uses the 1–5 global score (the play/verdict model is not in these conventions).
- Never invent — compare only what the reports contain.
