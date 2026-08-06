---
name: career-patterns
description: >-
  Analyze the application tracker to surface what's working and what's wasting
  time: conversion funnel, score-vs-outcome, archetype performance, top blockers,
  remote-policy patterns, tech-stack gaps, and a data-driven score floor. Writes
  a report and offers to apply recommendations to the user's profile.
version: 0.1.0
tags:
  - career
  - analytics
  - patterns
dependencies:
  - conventions/career-data
  - conventions/career-scoring
allowed_tools:
  - brain_get_page
  - brain_search
  - brain_list_pages
  - brain_put_page
  - browser_ask_user
enabled: true
---

# /career-patterns

Find patterns in application outcomes and recommend changes. Load
`conventions/career-data` (status taxonomy + tracker schema) and
`conventions/career-scoring` (archetypes, score).

## Threshold

Read `career/applications`. Require **≥5 entries with a status beyond
`evaluated`** (applied / responded / interview / offer / rejected / discarded /
skip). If not met, say: "Not enough data yet — {N}/5 applications have progressed
beyond evaluation." and exit gracefully.

## Accuracy & token note

LLM arithmetic over a long tracker is both expensive and error-prone. **Prefer
computing the aggregates deterministically** — the Canvas dashboard can compute
the funnel/averages/conversion-rates in JS (zero token, exact) and hand this
skill a compact stats object; the skill then writes the *narrative* and
*recommendations* from those numbers. If no precomputed stats are available, the
skill may compute them itself, but keep the tracker read scoped.

## Step 1 — Compute

- **Funnel**: count + % per status stage.
- **Score vs outcome**: avg/min/max score per group — positive (applied/
  responded/interview/offer), negative (rejected/discarded), self-filtered
  (skip), pending (evaluated).
- **Archetype performance**: per archetype — total, positive, conversion rate;
  highlight best and worst.
- **Top blockers**: frequency of hard blockers (geo-restriction, stack-mismatch,
  seniority, onsite) and % of applications affected.
- **Remote-policy patterns**: conversion by bucket (global / regional /
  geo-restricted / hybrid-onsite).
- **Tech-stack gaps**: most common missing skills in negative/self-filtered.
- **Score floor**: the data-driven minimum score, with reasoning.

## Step 2 — Report

`brain_put_page` to `career/reports/pattern-analysis-{YYYY-MM-DD}` with the
tables above.

## Step 3 — Summary

Present a condensed view: one-line stat (X apps, Y% applied, Z% positive), top 3
findings, link to the report.

## Step 4 — Offer to apply (with confirmation)

`browser_ask_user` before changing anything. You may, on approval:
- update `career/profile`'s `## Portals` filters (e.g. drop geo-restricted),
- set a score threshold under `career/profile` for PDF generation,
- adjust archetype targeting based on what's converting.

Edit `career/profile` only — **never** `career/cv` and never `_career-rules`.
