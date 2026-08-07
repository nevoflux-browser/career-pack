---
name: career-data
description: >-
  The GBrain data contract for the career pack: the career/* page namespace, read
  vs write permissions, the career/applications tracker row schema, the status
  taxonomy, and the append-only / serial-merge discipline. Read on demand via
  skill_read('career', 'conventions/data.md') by every functional career skill
  before it touches GBrain.
version: 0.1.0
tags:
  - career
  - data
---

# Career — GBrain Data Contract

Where career data lives, who may write it, and how. Read `conventions/rules.md`
first — the tracker (`career/applications`) is append-only and the CV is
read-only; those invariants bind everything here.

## Page namespace (`career/*`)

| Slug | Role | Access |
|---|---|---|
| `career/cv` | The user's CV — source of truth for experience/metrics. | **Read-only** to every skill. |
| `career/article-digest` | Distilled metrics/proof points; **takes precedence over the CV** for metrics. | **Read-only.** |
| `career/profile` | Target archetypes, north-star, `## Portals` filters, PDF score threshold. | Read by all; **written only by career-patterns, with user confirmation.** |
| `career/applications` | The application tracker (one row per evaluated job). | **Append-only** (see schema + discipline). |
| `career/scan-history` | Dedup / repost state for career-scan. | Written by the scan module (dashboard, zero-token). |
| `career/story-bank` | Reusable STAR stories. | Appended by career-project. |
| `career/reports/{...}` | Evaluation reports + `pattern-analysis-{date}`. | Created by career-evaluate / career-patterns. |
| `career/companies/{slug}` | Company research cache. | Created/enriched by career-deep; read by career-evaluate (Block D/G) and career-contacto. |
| `career/projects/{slug}` | Portfolio-project evaluations. | Created by career-project. |
| `career/training/{slug}` | Training/cert evaluations. | Created by career-training. |

**Never edit** `career/cv`, `career/article-digest`, or `conventions/rules.md`.
Edit `career/profile` only from career-patterns, only after `browser_ask_user`.

> Alignment note: `pack.toml`'s `[components.protected]` currently protects
> `career/cv`, `career/profile`, `career/applications`, `career/scan-history`
> and the four prefixes above. `career/story-bank` and `career/article-digest`
> are user data too and should be added to `protected.slugs` in a follow-up.

## Tracker row schema (`career/applications`)

One row per evaluated posting. Columns (append-only):

| Field | Meaning |
|---|---|
| `company` | Company name. |
| `role` | Role title. |
| `url` | JD URL. |
| `date` | Evaluation date (`YYYY-MM-DD`). |
| `score` | Global score `1–5` (`conventions/scoring.md`). |
| `archetype` | Detected archetype. |
| `legitimacy` | Block G tier. |
| `remote_policy` | Remote bucket (global / regional / geo-restricted / hybrid-onsite). |
| `blockers` | `none` or a list of hard-blocker keys. |
| `status` | Current stage (see taxonomy). |
| `report` | Report slug under `career/reports/`. |
| `pdf` | `pending` / `generated` / `n/a`. |
| `outcome` | Terminal result once known (mirrors a terminal status). |
| `notes` | Freeform. |

## Status taxonomy

```
evaluated → applied → responded → interview → offer
                    ↘ rejected
                    ↘ discarded      (user dropped it)
                    ↘ skip           (self-filtered, never applied)
```

- `evaluated` is the entry state (career-evaluate writes it).
- career-patterns requires **≥5 rows past `evaluated`** to run, and groups
  outcomes as positive (applied/responded/interview/offer), negative
  (rejected/discarded), self-filtered (skip), pending (evaluated).

## Append-only / serial-merge discipline

- **Append, never destructively edit.** Add a new row; update a row's `status` /
  `outcome` in place, but never delete history or rewrite other rows.
- **Single writer at a time.** GBrain writes are serialized to avoid lost
  updates: read the page, splice your one row, `brain_put_page` it back.
- **Standalone vs batch.** When a functional skill runs standalone (e.g.
  career-evaluate), **it** writes its own row. When it runs as a batch worker
  under an orchestrator, it does **not** write the tracker — it returns its
  report slug and lets the orchestrator perform one serial merge of all rows.
- **Never skip the tracker** (`rules.md`): every evaluated job gets a row.
