---
name: career-auto-pipeline
description: >-
  One-shot pipeline for a pasted JD: evaluate → generate a tailored CV PDF →
  (if the score clears the bar) draft application answers → finalize a single
  tracker row. Orchestrates career-evaluate (worker mode), career-pdf, and the
  writing conventions; it is the single serial tracker writer for the run and
  never submits anything.
version: 0.1.0
tags:
  - career
  - pipeline
  - orchestrator
dependencies:
  - career:conventions/rules.md
  - career:conventions/scoring.md
  - career:conventions/writing.md
  - career:conventions/data.md
allowed_tools:
  - browser_navigate
  - browser_snapshot
  - browser_get_markdown
  - web_search
  - fetch_page
  - brain_get_page
  - brain_put_page
  - brain_add_link
  - brain_add_tag
  - browser_ask_user
  - pdf.render
enabled: true
---

# /career-auto-pipeline

The default path when the user pastes a JD without a more specific request:
evaluate it, generate a tailored CV, draft application answers if it's worth it,
and leave exactly one tracker row. Read `career:conventions/rules.md` first —
never submit an application (draft only), never invent, and **this skill is the
single serial writer of the tracker row for this run**.

## Step 1 — Evaluate (worker mode)

Run the career-evaluate procedure (Steps 0–4: sources → JD → A–G score → save
report + link/tag). Per `career:conventions/data.md`'s serial rule, when evaluate
runs under an orchestrator it does **not** write the tracker: it yields the report
slug and the verdict (1–5 score, archetype, legitimacy, remote_policy, blockers).
Hold those — you write the row.

## Step 2 — Write the tracker row (single serial write)

Read `career/applications`, splice **one** new row, `brain_put_page` it back:
`status = evaluated`, plus `score`, `archetype`, `legitimacy`, `remote_policy`,
`blockers`, `report = {slug}`, `pdf = pending`, `followup_due` empty. Never append
a second row later — every further change updates this same row in place.

## Step 3 — Generate the CV (career-pdf)

Run career-pdf with the JD already in hand (its Step-0 gate is satisfied). On a
successful render, update this row's `pdf` → `generated`. If WeasyPrint is
missing, career-pdf stops and says so — leave `pdf = pending`, report it, and do
**not** fake a PDF.

## Step 4 — Draft application answers (only if score ≥ 4)

If the global score is < 4, skip this step. Otherwise load
`career:conventions/writing.md` and draft answers to the application's questions:
scrape them from the application form if you have its URL (`browser_navigate` +
`browser_snapshot`), else use a compact generic set (why this company, relevant
experience, availability). Ground every answer in `career/cv` (never invent),
open with the strongest "why now" signal, and append them to the report's
`## H) Application answers` section via `brain_put_page`. The user reviews and
submits — **never submit**.

## Step 5 — Finalize

Confirm the row's `status` and `pdf` reflect what actually happened (evaluated +
generated, or evaluated + pending if the PDF was skipped). Give the user a compact
summary: the score, the report slug, the PDF path (or the WeasyPrint notice), and
whether answers were drafted.

## Boundaries

- Single serial tracker writer for this run — one row, updated in place, never two.
- Never submit or send anything — draft only (`rules.md`).
- Never invent CV content or metrics.
- If a step fails, stop cleanly with the row reflecting reality — never leave a
  half-written or duplicated row.
