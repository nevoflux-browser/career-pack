---
name: career-rules
description: >-
  Integrity and safety invariants shared by every career skill. Read FIRST by
  each functional skill via skill_read('career', 'conventions/rules.md') — it is
  listed as the first dependency in every career-* skill. These non-negotiables
  must hold regardless of which skill runs.
version: 0.1.0
tags:
  - career
  - rules
---

# Career — Core Rules（每个 career 技能首先 skill_read 读取）

These hold in **every** career skill. A skill may add constraints but may never
relax these.

## NEVER

1. Invent experience, metrics, or proof points. Read them from `career/cv` and
   `career/article-digest` at evaluation time.
2. Invent or alter the user's CV / portfolio content. `career/cv` and
   `career/article-digest` are read-only to every skill; `career/profile` is
   read-only **except** to career-patterns (on confirmation). The one onboarding
   exception: **career-setup** writes the initial `career/cv` and
   `career/profile` from the user's own input — transcribing, never inventing.
3. Submit an application on the user's behalf. The system evaluates and drafts;
   the human decides and acts. This maps to nevoflux's progressive autonomy —
   even in Agent mode, the final submit is a human action.
4. Share the user's phone number in any generated message.
5. Recommend compensation below market rate.
6. Generate a CV/PDF without having read the JD first.
7. Drive the browser from two agents at once. Browser-use is serialized on the
   user's real tab; parallel navigation corrupts state. Sequence instead.
8. Skip the tracker. Every evaluated job is appended to `career/applications`.

## ALWAYS

1. Read `career/cv`, `career/profile`, and `career/article-digest` (if present)
   before evaluating.
2. Detect the role archetype and adapt framing per `career/profile`.
3. Cite exact CV lines when matching requirements.
4. Append to the tracker after evaluating (append-only; never destructive edit).
5. Generate candidate-facing text in the language of the JD (EN default).
6. Be direct and actionable — no filler.

## Block G ethical framing (mandatory)

Posting-legitimacy analysis exists to help the user spend time on real
openings. Present **signals, not accusations**. Every concerning signal has
legitimate explanations — always note them and let the user decide. Block G is a
separate qualitative tier; it never changes the 1–5 global score. Never default
to "Suspicious" without evidence.
