---
name: career-evaluate
description: >-
  Evaluate a single job posting end to end: read the user's sources of truth,
  produce the full A–G assessment, save a report, and append the result to the
  tracker. Used standalone when the user wants an evaluation without the CV/PDF
  step, and reused by career-auto-pipeline.
version: 0.1.0
tags:
  - career
  - evaluation
# Declared for discovery; the body drives the actual on-demand read of each.
# career:conventions/rules.md is the FIRST dependency and is read first via skill_read
# (no platform always-read needed).
dependencies:
  - career:conventions/rules.md
  - career:conventions/scoring.md
  - career:conventions/data.md
allowed_tools:
  - browser_navigate
  - browser_snapshot
  - browser_get_markdown
  - browser_get_tabs
  - browser_activate_tab
  - web_search
  - fetch_page
  - brain_get_page
  - brain_put_page
  - brain_search
  - brain_add_link
  - brain_add_tag
  - browser_ask_user
enabled: true
---

# /career-evaluate

Produce a full A–G evaluation of one job posting. The rules in `career:conventions/rules.md` (read first via skill_read)
already constrain you (never invent metrics, never submit, never edit the CV,
single serial browser session). Load the two contracts before doing the work:

1. Read `career:conventions/scoring.md` — the A–G rubric, archetype taxonomy,
   Block G tiers, and report format.
2. Read `career:conventions/data.md` — page slugs, the tracker row schema, and the
   append-only / serial-merge discipline.

## Step 0 — Sources of truth

`brain_get_page` for `career/cv`, `career/profile`, and `career/article-digest`
(if present). Never hardcode metrics; read them now. For metrics, the digest
takes precedence over the CV.

## Step 1 — Obtain the JD

- If given **JD text**, use it directly.
- If given a **URL**: `browser_navigate` then `browser_snapshot`
  (SPA-rendered, a11y tree) or `browser_get_markdown`. Fall back to
  `fetch_page` for static pages, then `web_search` for secondary indexes. If all
  fail, `browser_ask_user` to paste it.
- While the page is open, capture Block G freshness signals (posting date /
  "X days ago", apply-button state, any redirect to a generic careers page) so
  Block G needs no second snapshot.

## Step 2 — Evaluate

Run archetype detection, then produce blocks A–F and Block G exactly as
`career:conventions/scoring.md` defines. Comp/company research and layoff/freeze
signals use `web_search`; cache findings into `career/companies/{slug}` rather
than re-searching next time.

## Step 3 — Save the report

`brain_put_page` to `career/reports/{###}-{company-slug}-{YYYY-MM-DD}` in the
contract's report format. Header carries `**URL:**` and `**Legitimacy:** {tier}`.
Then link the graph: `brain_add_link` report → `career/companies/{slug}`, and
`brain_add_tag` the report with its archetype.

## Step 4 — Append to the tracker (serial)

Per the data contract's serial rule, **this skill is the writer** when run
standalone: read `career/applications`, splice one row
(`status = evaluated`, `report = {slug}`, `pdf = pending`), `brain_put_page` it
back. If this skill is invoked as a batch worker, do **not** write the tracker —
leave the row to the orchestrator's serial merge step; just return the report
slug.

> CV/PDF generation is intentionally out of scope here. `career-auto-pipeline`
> calls `career-pdf` after this skill when a full pipeline is wanted.
