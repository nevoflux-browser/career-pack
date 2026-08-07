---
name: career-training
description: >-
  Evaluate whether a course or certification is worth the user's time, across six
  dimensions (north-star alignment, recruiter signal, time/effort, opportunity
  cost, risks, portfolio deliverable), and return a DO / DON'T / DO-WITH-TIMEBOX
  verdict with a weekly plan.
version: 0.1.0
tags:
  - career
  - training
  - upskilling
dependencies:
  - conventions/career-data
  - conventions/career-scoring
allowed_tools:
  - web_search
  - fetch_page
  - brain_get_page
  - brain_put_page
enabled: true
---

# /career-training

Decide if a training/cert moves the user toward their goal. Load
`conventions/career-scoring` for the user's north-star / archetypes.

## Step 0 — Context & research

`brain_get_page` `career/profile` (north-star, target archetypes). Research the
course with `web_search` / `fetch_page`: syllabus/content, recency (is it
outdated?), brand strength, learner reviews. Cite sources.

## Step 1 — Score (6 dimensions)

| Dimension | What it measures |
|---|---|
| North-star alignment | Does it move toward or away from the goal? |
| Recruiter signal | What do hiring managers think seeing this on a CV? |
| Time & effort | Weeks × hours/week |
| Opportunity cost | What can't the user do during that time? |
| Risks | Outdated content? Weak brand? Too basic? |
| Portfolio deliverable | Does it produce a demonstrable artifact? |

## Step 2 — Verdict

- **DO** → a 4–12 week plan with weekly deliverables and a scoreboard.
- **DON'T** → a better alternative, with justification.
- **DO WITH TIMEBOX (max X weeks)** → a condensed plan, essentials only.

## Step 3 — Priority guidance

Prefer training that builds credibility in the user's target archetype. (For an
AI/production-grade archetype, career-ops's priority order is: LLM evals &
testing → observability/monitoring → cost/reliability trade-offs → AI
governance/safety → enterprise AI architecture. Adapt the priorities to whatever
archetype `career/profile` declares.)

## Step 4 — Save

`brain_put_page` to `career/training/{slug}` so future decisions can reference it.
