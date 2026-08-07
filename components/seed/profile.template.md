# Career profile

> Your targeting + preferences. The pack reads this page; only career-patterns
> edits it (with your confirmation). The **`## Portals`** block below is what the
> scan dashboard reads to know where to look — edit it to your real targets.

## North-star

{One sentence: where you want to be in ~2 years. e.g. "Production-grade AI
engineer at a company shipping LLM products at scale."}

## Target archetypes

{Pick from — or extend — the taxonomy in career:conventions/scoring.md.}
- AI/ML Engineer (production-grade)
- Backend Engineer
- {add / remove to match what you're actually applying for}

## Portals

<!-- The scan dashboard parses this YAML into a PortalConfig. Replace the
     example companies with real ones. Supported hosts need no code:
     greenhouse (job-boards.greenhouse.io/<slug>), ashby (jobs.ashbyhq.com/<slug>),
     lever (jobs.lever.co/<slug>). Others: add an `extract:` block or a linkedin
     `search:` block — see career-scan. -->

```yaml
title_filter:
  positive: [engineer, "machine learning", "ai", llm]
  negative: [sales, intern, manager, principal]
location_filter:
  always_allow: [remote]
  allow: [germany, eu, "united kingdom"]
  block: ["us only"]
tracked_companies:
  - name: "Example Co (Greenhouse)"        # ← replace with a real company
    careers_url: "https://job-boards.greenhouse.io/exampleco"
  - name: "Example Co (Ashby)"             # ← replace with a real company
    careers_url: "https://jobs.ashbyhq.com/exampleco"
  # - name: "Acme (own careers page)"      # no public API? drive the page:
  #   careers_url: "https://acme.com/careers"
  #   extract: { prefer_json_ld: true }
throttle_ms: 800
max_jobs: 300
```

## Preferences

- **Generate CV/PDF for scores ≥** {4}
- **Salary target:** {currency + range — never below market}
- **Deal-breakers:** {onsite-only, no visa support, …}
