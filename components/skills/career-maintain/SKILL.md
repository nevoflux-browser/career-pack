---
name: career-maintain
description: >-
  Housekeeping for the career pack — dedup and status-normalize the tracker, clean
  orphan reports, sanity-check cv/profile, and list/remove the pack's /loops (which
  uninstall's receipt doesn't cover). Every destructive step is confirmed; never
  edits career/cv or the rules.
version: 0.1.0
tags:
  - career
  - maintain
  - cleanup
dependencies:
  - career:conventions/rules.md
  - career:conventions/data.md
allowed_tools:
  - brain_get_page
  - brain_put_page
  - brain_search
  - brain_list_pages
  - browser_ask_user
enabled: true
---

# /career-maintain

Keep the career data tidy. Read `career:conventions/rules.md` first — never edit
`career/cv` or `conventions/rules.md`, and **confirm every destructive step**
(`browser_ask_user`) before doing it.

## Step 1 — Tracker hygiene

`brain_get_page` `career/applications`. Find issues per `data.md`:

- **Exact-duplicate rows** (same `url`, or same `company` + `role`) — propose
  merging into one (keep the furthest-along status); confirm before merging.
- **Statuses outside the taxonomy** — propose normalizing to the nearest valid one.
- **`followup_due` inconsistencies** (an `applied` row with none; a terminal row
  that still has one) — propose fixes.

Apply only confirmed changes via one `brain_put_page` (serial, in place). Never
delete real history — only merge true duplicates.

## Step 2 — Orphan reports

`brain_list_pages` under `career/reports/`. Any report **not** referenced by a
tracker row's `report` field is an orphan — list them and confirm before deleting.

## Step 3 — cv / profile sanity

Light checks only: `career/cv` is filled (not the seed template), `career/profile`
has target archetypes and a `## Portals` block. Report gaps — do **not** edit these
pages; point the user to career-setup.

## Step 4 — Loop cleanup (honest note)

The pack's loops (`/loop 1d /career-followup`, `/loop 7d /career-patterns`) are
runtime-created and are **not tracked by the pack receipt** — `pack uninstall`
will not remove them. List the pack's loops and, on confirmation, guide their
removal (or use the platform's loop UI). Do this before uninstalling the pack.

## Boundaries

- Confirm every delete / merge / normalize — nothing destructive without a yes.
- Never edit `career/cv` or `conventions/rules.md`.
- Tracker edits are in-place merges/fixes, not history deletion.
