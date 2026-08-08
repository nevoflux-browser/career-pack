---
name: career-dashboard
description: >-
  Conversational entry point that opens the career pack's persistent Canvas
  dashboard (the career-pack-dashboard artifact) — the clustered scan inbox +
  live stats. Say "open my career dashboard".
version: 0.1.0
tags:
  - career
  - dashboard
allowed_tools:
  - browser_navigate
  - browser_ask_user
enabled: true
---

# /career-dashboard

A thin entry point: when the user asks to open their career dashboard, surface
the persistent Canvas artifact **`career-pack-dashboard`** the pack installed —
the clustered-by-company scan inbox + live stats.

## Step 1 — Open it

Open the `career-pack-dashboard` artifact (the platform surfaces installed
dashboards through its Canvas / artifact UI — navigate to it or pick it from the
dashboard list). If the pack isn't installed, say so and point to
`nevoflux pack install`.

## Step 2 — Orient

Briefly say what's there: click **Scan** to sweep the tracked portals (configure
them in `career/profile`'s `## Portals` — career-setup helps), then review the
clustered inbox. Scanning is zero-token; evaluating a job is a separate step
(career-evaluate / career-auto-pipeline).

## Boundaries

- This skill only opens / points to the dashboard — it does not scan or evaluate.
