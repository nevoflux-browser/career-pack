---
name: career-deep
description: >-
  Deep company/role research for interview prep, across six axes (AI strategy,
  recent moves, engineering culture, likely challenges, competitors, candidate
  angle). Unlike a prompt generator, this actually runs the research with web
  tools and caches the brief into the company's GBrain page for reuse.
version: 0.1.0
tags:
  - career
  - research
  - interview-prep
  - company
dependencies:
  - conventions/career-data
allowed_tools:
  - web_search
  - fetch_page
  - browser_navigate
  - browser_get_markdown
  - brain_get_page
  - brain_put_page
  - brain_add_link
enabled: true
---

# /career-deep

Produce an actionable interview-prep research brief on a company + role.
career-ops's original mode only emits a prompt to paste elsewhere; here you have
web tools, so **do the research and write the brief** rather than handing back a
prompt.

## Step 0 — Context & cache

`brain_get_page` for `career/cv`, `career/profile`, and `career/companies/{slug}`
if it already exists — extend the cache, don't re-research what's already there.

## Step 1 — Research the six axes

Use `web_search` per axis; `fetch_page` or `browser_navigate` + `browser_get_markdown`
for the company's engineering blog / newsroom. Cite sources; if a fact isn't
findable, say so — never invent.

1. **AI strategy** — which products use AI/ML, their stack/infra, eng-blog
   themes, papers or talks.
2. **Recent moves (6 months)** — notable AI/ML/product hires, acquisitions,
   partnerships, launches/pivots, funding or leadership changes.
3. **Engineering culture** — ship cadence, CI/CD, mono/multi-repo, stack,
   remote policy, Glassdoor/Blind signal on eng culture.
4. **Likely challenges** — scaling, reliability/cost/latency, migrations,
   pain points mentioned in reviews.
5. **Competitors & differentiation** — main competitors, moat, positioning.
6. **Candidate angle** — from `cv`/`profile`: unique value you bring, your most
   relevant projects, the story to tell in the interview.

## Step 2 — Write & cache

Write the brief into `career/companies/{company-slug}` (enriching the page used
by `career-evaluate`'s Block D/G and `career-contacto`). `brain_add_link` it to
the relevant `career/reports/*`. Present a concise version with the candidate
angle up top.
