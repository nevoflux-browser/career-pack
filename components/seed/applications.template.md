# Applications tracker

> **Append-only.** One row per evaluated job. Never rewrite or delete rows —
> update a row's `status` / `outcome` in place as things progress. Schema and
> the status taxonomy live in career:conventions/data.md. Delete the example
> row once you have real entries.

| company | role | url | date | score | archetype | legitimacy | remote_policy | blockers | status | report | pdf | outcome | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Example Co | AI Engineer | https://example.com/jobs/1 | 2026-01-01 | 4 | AI/ML Engineer | Legitimate | global | none | evaluated | reports/001-example-co-2026-01-01 | pending |  | example row — delete me |

<!--
status taxonomy: evaluated → applied → responded → interview → offer
                                    ↘ rejected ↘ discarded ↘ skip
score: 1–5 (career:conventions/scoring.md). legitimacy: Legitimate / Unclear /
Ghost-risk / Suspicious. remote_policy: global / regional / geo-restricted /
hybrid-onsite. blockers: none | geo-restriction, stack-mismatch, seniority, onsite.
-->
