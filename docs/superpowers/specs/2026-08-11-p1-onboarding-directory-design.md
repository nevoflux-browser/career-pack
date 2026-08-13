# Design: P1 — in-panel onboarding + built-in company directory (needs-based)

- **日期**: 2026-08-11
- **范围**: P1 of the auto-apply vision. Two coupled pieces:
  1. A **built-in company directory** (`career/directory`) — a broad, tagged
     universe of companies on greenhouse/ashby/lever (big/medium/small).
  2. **In-dashboard onboarding**: upload a PDF résumé (agent parses → `career/cv`)
     and describe needs (→ `career/profile` filters + archetypes). **No company
     names from the user** — jobs are discovered from the directory by the user's
     needs.
- **决策(已确认)**: model A (built-in directory + needs filtering), directory
  large/comprehensive; PDF upload parsed by the agent; onboarding lives in the
  panel. Downstream P2–P4 (scores in panel, select+fill, one-click submit) are
  separate later phases; P5 (full-auto loop) is out of scope.

## 1. Architecture: where jobs come from

- **`career/directory`** (system seed, protected, not user-edited): a `## Companies`
  YAML block of `{ name, careers_url, tags[] }`. Broad universe; grows over time.
  Wrong slugs just log a failed portal (non-fatal), so breadth is safe.
- **`career/profile`** (user needs): north-star, target archetypes, `title_filter`,
  `location_filter`, salary. **No companies.** Onboarding writes this.
- **Scan config** = directory (companies whose `tags` intersect the user's target
  archetypes) + profile (title/location filters). The dashboard's `loadConfig`
  reads BOTH pages via one `agent.chat` and merges them into a `PortalConfig`.
  Scanning a tag-matched subset keeps scans tractable even with a large directory.

## 2. Company directory (`components/seed/directory.template.md`)

`## Companies` YAML list, each entry tagged by domain and size:

```yaml
companies:
  - { name: "OpenAI", careers_url: "https://jobs.ashbyhq.com/openai", tags: [ai, large] }
  - { name: "Stripe", careers_url: "https://job-boards.greenhouse.io/stripe", tags: [fintech, devtools, large] }
  # …broad set across ai / devtools / fintech / data / infra / security / consumer,
  #   and sizes large / mid / startup…
```

Tags drive selection: a user targeting `AI/ML Engineer` scans `ai`-tagged (and
adjacent) companies. Seeded only-if-absent; user may edit/extend it.

## 3. In-dashboard onboarding (P1 UI)

Shown when `career/profile` is absent/template, else via a "Setup" button.

- **Résumé**: `<input type="file" accept=".pdf,.md,.txt,.docx">`. On save, the file
  bytes are handed to the platform so the agent can read them — dashboard calls
  `callTool("cache_file", …)` to persist the upload and get a path, then
  `agent.chat("read the résumé at <path>, parse it, and write career/cv")`.
- **Needs form** (no companies):
  - North-star (one line)
  - Target archetypes (multi-select from the scoring taxonomy)
  - Seniority
  - Remote / location preference (→ `location_filter`)
  - Must-have / nice-to-have keywords (→ `title_filter` positive)
  - Exclude keywords (→ `title_filter` negative)
  - Salary target
- **Save** → one `agent.chat` writes `career/cv` (from the parsed résumé) and
  `career/profile` (needs → archetypes + `## Portals` filters, per career-setup's
  contract). Costs a small, one-off token amount. On success, switch to the scan
  view.

## 4. Scan wiring change

`loadConfig` (dashboard) currently reads only `career/profile`'s `## Portals`. It
now asks the agent to return a `PortalConfig` merging:
- `tracked_companies` = `career/directory` entries whose `tags` match the
  profile's target archetypes (cap to a reasonable N to bound scan time),
- `title_filter` / `location_filter` / `max_jobs` from `career/profile`.

The scan engine (`scanAll`, providers, view-source fetch) is unchanged.

## 5. pack.toml

- Add `[[components.seed]] slug = "career/directory"` from the new template.
- Add `career/directory` to `[components.protected].slugs`.

## 6. 非目标 / 后续

- P2 scores-in-panel, P3 select+fill, P4 one-click-submit — later phases.
- PDF parsing robustness depends on the agent; complex layouts may need the user
  to correct `career/cv` after.
- Directory accuracy: a starting universe; failed slugs are logged and easy to fix.
- Optional future: LinkedIn/aggregator search (opt-in, ToS-noticed) for
  beyond-directory discovery.

## 7. 验收

- `pack validate` ok; `inspect` shows the new seed; directory seed ⊆ protected.
- Dashboard: onboarding form saves cv/profile; scan then finds matching jobs from
  the directory filtered by needs. typecheck/tests/CI green.
