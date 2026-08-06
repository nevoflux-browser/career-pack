---
name: career-project
description: >-
  Evaluate one of YOUR portfolio project ideas against your target roles, using
  a six-dimension weighted matrix, and return a BUILD / SKIP / PIVOT verdict with
  an interview pack and an 80/20 build plan. (Scores your project, not a job —
  that's career-evaluate.)
version: 0.1.0
tags:
  - career
  - portfolio
  - project
dependencies:
  - conventions/career-scoring
  - conventions/career-data
allowed_tools:
  - brain_get_page
  - web_search
  - brain_put_page
  - brain_add_tag
enabled: true
---

# /career-project

Decide whether a project idea is worth building to strengthen the user's
candidacy. Load `conventions/career-scoring` for the user's target archetypes /
north-star.

## Step 0 — Context

`brain_get_page` `career/profile` (target archetypes, north-star) and
`career/cv`. The project's value is judged **relative to the roles the user is
targeting**.

## Step 1 — Score (6 weighted dimensions, 1–5)

| Dimension | Weight | 5 = … | 1 = … |
|---|---|---|---|
| Signal for target roles | 25% | Directly demonstrates a JD skill | Unrelated |
| Uniqueness | 20% | Nobody has done this | Very common |
| Demo-ability | 20% | Live demo in 2 min | Code only, not visual |
| Metrics potential | 15% | Clear metrics (latency/cost/accuracy) | No metrics possible |
| Time to MVP | 10% | ~1 week | 3+ months |
| STAR-story potential | 10% | Rich story with trade-offs | Implementation only |

Use `web_search` for the uniqueness check (has this been done to death?).

## Step 2 — Verdict

- **BUILD** → a plan with weekly milestones.
- **SKIP** → why, and what to do instead.
- **PIVOT TO [alternative]** → a more impactful variant.

## Step 3 — If BUILD: interview pack + 80/20 plan

Interview pack: (1) one-pager — product + architecture + metrics + eval plan;
(2) demo — live URL or a 2-min recorded walkthrough; (3) postmortem — what
worked, what didn't, mitigations. 80/20 plan: Week 1 → MVP with the core metric;
Week 2 → polish + interview pack.

## Step 4 — Save

`brain_put_page` to `career/projects/{slug}` and `brain_add_tag` with the target
archetype. If it yields a reusable STAR story, append it to `career/story-bank`.
