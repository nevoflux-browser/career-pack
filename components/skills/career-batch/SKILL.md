---
name: career-batch
description: >-
  Batch-score N pasted JD texts. Each JD is scored by a worker from text + cached
  context (no browser, no live web research — the batch tradeoff), a report is
  saved per job, and all rows are merged into the tracker in a single serial write.
  For a URL, or the full CV + answers pipeline, use career-evaluate /
  career-auto-pipeline instead.
version: 0.1.0
tags:
  - career
  - batch
  - evaluation
dependencies:
  - career:conventions/rules.md
  - career:conventions/scoring.md
  - career:conventions/data.md
allowed_tools:
  - brain_get_page
  - brain_put_page
  - brain_add_link
  - brain_add_tag
  - browser_ask_user
enabled: true
---

# /career-batch

Score many jobs at once from their JD text. Read `career:conventions/rules.md`
first. This is the cheap, high-throughput path: **text only — no browser and no
live web research** (that is the batch tradeoff). For a single URL, or the full
CV + answers pipeline, use career-evaluate / career-auto-pipeline.

## Step 0 — Contracts + inputs

`skill_read('career', 'conventions/rules.md')`, then `scoring.md` (the A–G rubric)
and `data.md` (row schema + the serial rule). Collect the N JD texts
(`browser_ask_user` if not all were provided). Read `career/cv`, `career/profile`,
and `career/article-digest` **once** — shared context for every worker.

## Step 1 — Score each JD (workers; no tracker write)

For each JD, produce the A–G evaluation per `scoring.md` from: the JD text, the
shared cv/profile/digest, and the cached `career/companies/{slug}` page if it
exists. **Do not open the browser or run web search** — score from what's on hand;
if a fact isn't available, say so rather than researching it. Where the platform
supports parallel sub-agents, fan the workers out; otherwise run them
sequentially. Each worker `brain_put_page`s its report to
`career/reports/{###}-{slug}-{YYYY-MM-DD}`, `brain_add_link`s it to
`career/companies/{slug}`, `brain_add_tag`s the archetype — and returns its row
fields (score, archetype, legitimacy, remote_policy, blockers, report slug).
Workers do **not** write the tracker.

## Step 2 — Merge into the tracker (one serial write)

Collect every worker's row fields. Read `career/applications` once, splice **all**
the new rows (`status = evaluated`, `pdf = pending`, `followup_due` empty), and
`brain_put_page` it back in a **single** write. This is the one serial merge the
data contract requires — never let workers write the tracker concurrently.

## Step 3 — Summary

Present a ranked list (score descending): company · role · score · legitimacy ·
blockers · report slug. Note any JD that couldn't be scored and why.

## Boundaries

- Text only — no browser, no live web research (use career-evaluate for that).
- One serial tracker write for the whole batch; never N concurrent writes.
- Never invent — if the JD or cache lacks a fact, say so.
