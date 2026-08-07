---
name: career-scoring
description: >-
  The shared evaluation contract for the career pack: the A–G rubric, the 1–5
  global score, the archetype taxonomy, Block G legitimacy tiers, the hard-blocker
  and remote-policy taxonomies, and the report format. Read on demand via
  skill_read('career', 'conventions/scoring.md') — by career-evaluate for the full
  A–G assessment, and by career-patterns / career-project / career-training for the
  archetype and score definitions.
version: 0.1.0
tags:
  - career
  - scoring
---

# Career — Scoring & Evaluation Contract

The single source of truth for how a job posting is scored and reported. Read
`conventions/rules.md` first — the invariants there (never invent metrics, cite
CV lines, single serial browser session, Block G framing) bind everything below.

## Global score (1–5)

Every evaluated posting gets one **1–5 global score**. It is a **holistic
judgement informed by blocks A–F**, not an arithmetic average (LLM arithmetic
over many fields is error-prone — reason about fit, don't compute a weighted
sum). Blocks **A (fit)** and **B (requirements match)** are the primary gates: a
posting cannot score 4–5 if either is weak.

| Score | Meaning |
|---|---|
| 5 | Strong fit, requirements met, no hard blocker — apply now, generate CV/PDF. |
| 4 | Good fit, minor gaps — apply, tailor to the gaps. |
| 3 | Plausible but with real gaps or one soft blocker — apply only if capacity allows. |
| 2 | Weak fit or a hard blocker present — usually skip; note what would change it. |
| 1 | Not a fit, or a disqualifying hard blocker — skip. |

**Block G (posting legitimacy) never changes the 1–5 score** — it is a separate
qualitative tier (see below). A legitimate-but-poor-fit role and a great-fit-but-
suspicious posting are different decisions; keep the two axes independent.

## Evaluation blocks A–G

Produce every block. A–F inform the score; G is the independent legitimacy tier.

| Block | Name | What it assesses |
|---|---|---|
| A | Role & archetype fit | Match against the target archetype(s) declared in `career/profile`; is this the kind of role the user is aiming for? |
| B | Requirements match | JD must-haves vs the user's CV — **cite exact CV lines** (`conventions/rules.md`). Surface hard blockers (see taxonomy). |
| C | Compensation & seniority | Pay band, level/title, market comparison. Never recommend below-market (`rules.md`). Flag comp-below-market as a signal. |
| D | Company & market | Company research, funding/traction, and **layoff / hiring-freeze signals**. Reuse the cache at `career/companies/{slug}` (written by career-deep); don't re-research what's cached. |
| E | Location / remote & geo-eligibility | Remote-policy bucket (see taxonomy) and whether the user is geographically eligible (region gating, work authorization signals). |
| F | Growth & risk signals | Career-progression upside vs role-level red flags: unrealistic scope for the level, title inflation, reorg/churn signals, vague or ever-open reqs. (Interview-prep "candidate angle" is **not** scored here — it belongs to career-deep and career-contacto.) |
| **G** | **Posting legitimacy** | Independent qualitative tier (see tiers). **Signals, not accusations** — every concerning signal has a benign explanation; present both and let the user decide. Does **not** move the 1–5 score. |

## Archetype taxonomy

A **role archetype** is the shape of the role, used to adapt framing and to group
outcomes in career-patterns. `career/profile` is **authoritative** — read the
user's declared target archetype(s) there and detect the posting's archetype
against them. Starter taxonomy (extend per profile):

- AI/ML Engineer (applied / production-grade)
- Backend Engineer
- Full-stack Engineer
- Data / ML-Platform Engineer
- DevRel / Developer Experience
- Research / Applied Scientist
- Founding / Generalist Engineer

If a posting spans two, pick the dominant one and note the secondary.

## Block G — legitimacy tiers

Report one tier in the report header as `**Legitimacy:** {tier}`. **Never default
to Suspicious without evidence** (`rules.md`). For every concerning signal, name a
legitimate explanation.

| Tier | Meaning | Typical signals (each with a benign counter-reading) |
|---|---|---|
| Legitimate | Fresh, specific, coherent posting. | Recent date, real apply flow, specific team/scope. |
| Unclear | Not enough signal either way. | Sparse JD, no date — could be a lean team, not a red flag. |
| Ghost-risk | May be an evergreen / pipeline posting, not an active req. | Reposted for months, generic careers redirect — could be a slow but real pipeline. |
| Suspicious | Multiple strong concerning signals together. | Pay far above/below market + vague company + off-platform contact — could still be a bad recruiter, not a scam. |

## Hard-blocker taxonomy (Block B / E)

Name blockers explicitly so career-patterns can aggregate them:

- `geo-restriction` — role gated to a region the user isn't in.
- `stack-mismatch` — core stack the user lacks and the role requires day-one.
- `seniority` — level clearly above or below the user's target.
- `onsite` — mandatory onsite the user can't meet.

A **hard** blocker caps the score at 2. A **soft** blocker (a gap the user can
close or tailor around) lowers but does not cap.

## Remote-policy buckets (Block E)

Classify every posting into exactly one, for conversion analysis in career-patterns:

- `global` — hire anywhere.
- `regional` — a continent / country group (e.g. EU-only, LATAM-only).
- `geo-restricted` — a single country or narrower.
- `hybrid-onsite` — requires presence some/all days.

## Report format

career-evaluate saves the full assessment via `brain_put_page` to
`career/reports/{###}-{company-slug}-{YYYY-MM-DD}` (slug discipline in
`conventions/data.md`). Structure:

```markdown
# {Company} — {Role}

**URL:** {jd-url}
**Score:** {1–5}   **Archetype:** {archetype}   **Legitimacy:** {tier}
**Remote:** {bucket}   **Blockers:** {none | list}

## A) Role & archetype fit
## B) Requirements match      (cite exact CV lines)
## C) Compensation & seniority
## D) Company & market        (layoff/freeze signals; cite sources)
## E) Location / remote & eligibility
## F) Growth & risk signals
## G) Posting legitimacy      (signals + benign readings)
## I) Outreach drafts         (appended by career-contacto)
```

career-patterns writes a different report — `career/reports/pattern-analysis-{YYYY-MM-DD}`
— with the funnel / score-vs-outcome / archetype tables it defines.
