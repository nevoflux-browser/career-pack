---
name: career-followup
description: >-
  Daily follow-up + outcome capture (the Learn ring). Reads career/applications,
  surfaces rows whose follow-up is due and applied rows that have gone quiet
  (~21 days → ghosted candidates), drafts paste-ready nudges per the writing
  conventions, and captures outcomes back into the tracker. Drafts only — never
  sends; proposes status changes — never auto-applies them. Runs on /loop 1d.
version: 0.1.0
tags:
  - career
  - followup
  - learn
dependencies:
  - career:conventions/rules.md
  - career:conventions/writing.md
  - career:conventions/data.md
allowed_tools:
  - brain_get_page
  - brain_put_page
  - brain_search
  - browser_ask_user
enabled: true
---

# /career-followup

Keep applications warm and feed outcomes back into the tracker. Read
`career:conventions/rules.md` first — **never send** anything (this skill drafts;
the user sends), and **never auto-change** a tracker status (propose, then
confirm).

## Step 0 — Contracts

`skill_read('career', 'conventions/rules.md')`, then `writing.md` (nudge tone)
and `data.md` (tracker row schema, `followup_due`, and the status taxonomy
including `ghosted`).

## Step 1 — Read the tracker

`brain_get_page` `career/applications`. Working from today's date (ask the user
if the runtime can't supply one), bucket the rows:

- **Due** — status ∈ {applied, responded, interview}, `followup_due` set and ≤ today.
- **Ghosted candidates** — status = applied, no `outcome`, and `followup_due`
  (or `date` if unset) is more than 21 days ago.
- **Awaiting outcome** — open rows worth asking the user about.

If nothing is due and there are no ghosted candidates, say so and stop — a quiet
day is a valid result.

## Step 2 — Draft the due nudges

For each Due row, draft a short follow-up per `writing.md`: the first line
references the most recent concrete signal (from the row, its
`career/reports/{slug}`, or `career/companies/{slug}` research — e.g. "Following
up on the {role} role I applied to on {date}…"). **Never invent.** Present the
drafts paste-ready; the user sends them.

## Step 3 — Ghosted candidates (confirm, never auto)

List the ghosted candidates with how long they've been silent. `browser_ask_user`
to confirm each before setting `status = ghosted`. Never change a status the user
doesn't confirm.

## Step 4 — Outcome capture (the Learn ring)

For Awaiting-outcome rows, `browser_ask_user`: "Any news from {company} on the
{role} role?" Map the reply onto a status/outcome (responded / interview / offer
/ rejected / ghosted). This is the §7.3 outcome feedback — the data
career-patterns later learns from.

## Step 5 — Write back (serial, in-place)

For each **confirmed** change, update the row in place per `data.md`'s
append-only / serial discipline: read the page, splice only the changed rows
(`status`, `outcome`, and a fresh `followup_due` — e.g. +7 days for still-open
rows, empty for terminal ones), and `brain_put_page` it back. Never rewrite
unrelated rows; never delete history.

## Cadence

Built for `/loop 1d /career-followup` (career-setup offers to create it). A run
is idempotent: re-running the same day surfaces the same items and changes
nothing without confirmation.

## Boundaries

- Never send — draft only (`rules.md`).
- Never auto-change a status; every status/outcome change is user-confirmed.
- In-place tracker updates only — career-followup never appends new rows
  (career-evaluate owns row creation).
- Never touch pages outside the `career/` namespace.
