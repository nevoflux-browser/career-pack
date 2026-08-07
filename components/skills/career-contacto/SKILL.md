---
name: career-contacto
description: >-
  Draft a short, high-conviction outreach message for a specific job: identify
  the right person (recruiter, hiring manager, peer, or interviewer), pick the
  primary target, and write a paste-ready LinkedIn message tailored to the
  contact type. Drafting only — the user sends it; nothing is sent automatically.
version: 0.1.0
tags:
  - career
  - outreach
  - linkedin
  - networking
dependencies:
  - conventions/career-writing
  - conventions/career-data
allowed_tools:
  - web_search
  - fetch_page
  - browser_navigate
  - browser_snapshot
  - browser_get_markdown
  - brain_get_page
  - brain_put_page
  - brain_add_link
  - browser_ask_user
enabled: true
---

# /career-contacto

Draft outreach for one role. The always-on `_career-rules` apply — in
particular: **never include a phone number, and never send anything**. This
skill drafts; the human reviews and sends. If you read LinkedIn in the user's
session to personalize, it is **read-only** — do not send connection requests or
DMs. Load `conventions/career-writing` for tone (no corporate-speak, no
"passionate about", something that earns a reply).

## Step 0 — Context

`brain_get_page` for `career/cv`, `career/profile`, and the related
`career/reports/{slug}` if this job was already evaluated (reuse its company
research and proof points).

## Step 1 — Identify targets

Use `web_search` (and optionally `browser_navigate` to the company/LinkedIn in
the user's real session, read-only) to find:
- the team's hiring manager,
- the assigned recruiter,
- 2–3 peers (similar roles on the team),
- the interviewer, if an interview is already scheduled.

## Step 2 — Classify the contact type

Ask the user (`browser_ask_user`) or infer: **Recruiter** / **Hiring Manager** /
**Peer (indirect referral)** / **Interviewer (pre-interview)**.

## Step 3 — Pick the primary target

Choose the person who benefits most from the candidate being there.

## Step 4 — Generate the message

A 3-sentence framework; the contact type changes the **emphasis**, not the
structure. **Max 300 characters** (LinkedIn connection-request limit). EN by
default; add an ES version if it's a Spanish company.

- **Recruiter** — (1) direct fit: role, relevant experience, availability/location;
  (2) proof that answers their screen before they ask; (3) CTA: offer to share CV.
- **Hiring Manager** — (1) hook: a specific challenge their team faces (from JD /
  blog / news); (2) your biggest quantifiable win solving a similar problem;
  (3) CTA: ask how they're approaching that challenge.
- **Peer (referral)** — (1) genuine reference to their work (post, talk, OSS);
  (2) something you're doing in the same space (NOT a pitch); (3) CTA: ask their
  take on a topic. **Do not ask for a job** — the referral emerges naturally.
- **Interviewer (pre-interview)** — (1) reference something specific from their
  work/trajectory; (2) light tie to your experience; (3) CTA: look forward to the
  conversation on {date}. Light tone, never desperate; goal is to show you prepared.

## Step 5 — Alternatives & save

Offer alternative targets with a one-line justification for each. Optionally
append the drafts to the report's `## I) Outreach drafts` section (via
`brain_put_page`) and `brain_add_link` to the company page. The user sends them.
