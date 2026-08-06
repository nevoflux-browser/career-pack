---
name: career
description: >-
  Host skill for the career pack. Holds the shared conventions (rules, scoring,
  writing, data) under conventions/, read on demand by the functional career-*
  skills via skill_read('career', 'conventions/<x>.md'). Not usually invoked
  directly — it is the namespace the other skills depend on.
version: 0.1.0
tags:
  - career
enabled: true
---

# career (host)

This skill is the **namespace + shared-contract host** for the career pack,
mirroring how the `brain` skill hosts `brain:conventions/*`. It carries the
conventions every functional skill shares:

| Path | Contract |
|---|---|
| `conventions/rules.md` | Always-apply invariants (NEVER list, Block G ethics, single browser session). Every career-* skill lists it as the **first** dependency and reads it before acting. |
| `conventions/scoring.md` | A–G evaluation rubric, archetype taxonomy, report format. |
| `conventions/writing.md` | Candidate-facing writing contract (tone calibration, ATS rules). |
| `conventions/data.md` | GBrain data contract (page namespace, tracker schema, append/serial discipline). |

## How the other skills use it

Functional skills declare what they need in frontmatter and pull it from their
body via the platform's existing `skill_read` mechanism — no platform changes:

```yaml
dependencies:
  - career:conventions/rules.md        # always first
  - career:conventions/scoring.md
```

```text
# in the skill body, on demand:
skill_read('career', 'conventions/rules.md')      # read the invariants first
skill_read('career', 'conventions/scoring.md')    # then the relevant contract
```

This is the same pattern as `skill_read('brain', 'conventions/quality.md')`.
