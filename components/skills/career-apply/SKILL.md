---
name: career-apply
description: >-
  Draft answers to a specific job's application-form questions. Reads the form's
  open questions from its URL (or takes them from you), drafts each answer grounded
  in career/cv per the writing conventions, and appends them to the report's
  ## H) section. Drafts only — you edit and submit; the assistant never clicks.
version: 0.1.0
tags:
  - career
  - apply
  - application
dependencies:
  - career:conventions/rules.md
  - career:conventions/writing.md
  - career:conventions/data.md
allowed_tools:
  - browser_navigate
  - browser_snapshot
  - brain_get_page
  - brain_put_page
  - browser_ask_user
enabled: true
---

# /career-apply

Draft paste-ready answers to one job's application questions. Read
`career:conventions/rules.md` first — never submit or click anything (you draft;
the user edits and submits), and never invent (answers come from `career/cv`).

## Step 0 — Contracts + the job

`skill_read('career', 'conventions/rules.md')`, then `writing.md` (tone / ATS).
Identify the job: its `career/reports/{slug}` if already evaluated (reuse the
research + score), or the JD text / URL. `brain_get_page` `career/cv`,
`career/profile`, and the report if present.

## Step 1 — Get the questions

If you have the application URL: `browser_navigate` + `browser_snapshot` to read
the form's open questions — **read-only, never fill or click**. Otherwise ask the
user to paste them, or use a compact generic set (why this company, most relevant
experience, availability, salary expectation).

## Step 2 — Draft each answer

Per `writing.md`: direct, specific, no corporate-speak, grounded in `career/cv`
(never invent a metric or experience). Open with the strongest signal for this
role (fit + why now). Keep each answer to what the question actually asks.

## Step 3 — Return + append

Present the answers paste-ready. If the job has a report, append them to its
`## H) Application answers` section via `brain_put_page`. The user edits and
submits.

## Boundaries

- Never submit, click, or fill a form — read-only on the page, draft only.
- Never invent — answers come from `career/cv`.
- Never include a phone number (`rules.md`).
