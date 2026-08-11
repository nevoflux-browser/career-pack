---
name: career-apply
description: >-
  Semi-automatic application assist. Opens a job's application form, fills it from
  your CV/profile and drafted answers, uploads your generated CV, and STOPS at the
  submit button for you to review and submit. Fills only — it has no click tool,
  so it can never submit or navigate; the final action is always yours. Also
  drafts the open-question answers into the report's ## H) section.
version: 0.1.0
tags:
  - career
  - apply
  - application
  - semi-auto
dependencies:
  - career:conventions/rules.md
  - career:conventions/writing.md
  - career:conventions/data.md
allowed_tools:
  - browser_navigate
  - browser_snapshot
  - browser_get_elements
  - browser_get_element
  - browser_fill
  - browser_fill_by_id
  - browser_type_by_id
  - browser_upload_file
  - browser_ask_user
  - brain_get_page
  - brain_put_page
enabled: true
---

# /career-apply

Do the tedious part of applying — fill the form — and hand it back for the user to
submit. Read `career:conventions/rules.md` first. **You have no click tool: you
fill fields, you never click Submit / Apply / Next / any button.** The submit is
the human's action (rules.md), and you never invent — everything comes from the
user's real data.

## Step 0 — Contracts

`skill_read('career', 'conventions/rules.md')`, then `writing.md` (answer tone /
ATS) and `data.md` (tracker row + status taxonomy).

## Step 1 — Identify the job + sources

Get the job: its `career/reports/{slug}` (if evaluated — reuse its research and
any drafted answers), the JD, or the application URL. `brain_get_page`
`career/cv`, `career/profile`, and the report. Note the generated CV PDF path from
career-pdf (e.g. `$SESSION_DIR/{company}-cv.pdf`) if one exists.

## Step 2 — Open + read the form

`browser_navigate` to the application URL. `browser_snapshot` /
`browser_get_elements` to map the fields — text inputs, textareas, file uploads,
dropdowns, checkboxes. Don't act yet; understand the form first.

## Step 3 — Draft the open-question answers

For each free-text question, draft an answer per `writing.md`: direct, specific,
grounded in `career/cv` (never invent), opening with the strongest fit signal.
`brain_put_page` them into the report's `## H) Application answers` section too,
so there's a saved copy.

## Step 4 — Fill (fields only)

- **Identity** — name, email, location, GitHub, portfolio, LinkedIn from
  `career/cv` / `career/profile`, via `browser_fill_by_id` / `browser_type_by_id`
  / `browser_fill`.
- **Résumé** — `browser_upload_file` with the career-pdf PDF.
- **Open questions** — put each drafted answer into its textarea.
- **Phone** — do **not** fill by default; `browser_ask_user` whether to add it and
  which number (rules.md's phone caution).
- **Dropdowns / checkboxes / radio** — these need a click, which you don't have:
  leave them and list them for the user in Step 6.
- **Anything ambiguous or required-but-uncertain** — don't guess; flag it for the
  user.

## Step 5 — Gaps: stop and ask

If the form needs a **login**, hits a **CAPTCHA**, is **multi-step** (needs a Next
click), or has fields you can't confidently fill — stop and `browser_ask_user`,
explaining what's blocking. Never work around a login or CAPTCHA.

## Step 6 — Stop at submit (the human gate)

**Never click Submit / Apply / Send / Next — you have no click tool by design.**
Give the user a compact summary: which fields you filled, which résumé you
uploaded, and exactly what still needs them (dropdowns, checkboxes, phone,
ambiguous fields, the final submit). Ask them to **review and submit**.

## Step 7 — After the user submits

Once the user confirms they submitted, update `career/applications` for this job
in place (per data.md's serial discipline): `status = applied`, set
`followup_due` to ~7 days out. Don't append a new row.

## Boundaries

- **No clicking** — fill fields only; every button (especially Submit) is the
  user's. This is enforced by the toolset, not just this note.
- Never invent — fill only from `career/cv` / `career/profile` / the report.
- Phone: don't fill without asking.
- Never bypass a login or CAPTCHA — hand those to the user.
- One job at a time; never batch-apply.
