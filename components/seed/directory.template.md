# Company directory

> The built-in company universe the scan draws from. You describe your **needs**
> (in `career/profile`); the scan picks companies here whose `tags` match your
> target archetypes and applies your filters — so you never have to name
> companies. This is a broad starting set across domains and sizes; add or fix
> entries freely. A wrong slug just logs a failed portal (harmless).
>
> ATS URL shapes (no code needed): greenhouse `job-boards.greenhouse.io/<slug>`,
> ashby `jobs.ashbyhq.com/<slug>`, lever `jobs.lever.co/<slug>`.
> tags: domain (ai, ml-infra, devtools, data, fintech, security, infra, consumer,
> healthtech, crypto, robotics, enterprise) + size (large, mid, startup).

## Companies

```yaml
companies:
  # ── AI / ML ────────────────────────────────────────────────
  - { name: "OpenAI",        careers_url: "https://jobs.ashbyhq.com/openai",        tags: [ai, large] }
  - { name: "Anthropic",     careers_url: "https://job-boards.greenhouse.io/anthropic", tags: [ai, large] }
  - { name: "Cohere",        careers_url: "https://jobs.ashbyhq.com/cohere",        tags: [ai, mid] }
  - { name: "Perplexity",    careers_url: "https://jobs.ashbyhq.com/perplexity",    tags: [ai, mid] }
  - { name: "Together AI",   careers_url: "https://job-boards.greenhouse.io/togetherai", tags: [ai, ml-infra, startup] }
  - { name: "Sierra",        careers_url: "https://jobs.ashbyhq.com/sierra",        tags: [ai, startup] }
  - { name: "Decagon",       careers_url: "https://jobs.ashbyhq.com/decagon",       tags: [ai, startup] }
  - { name: "LangChain",     careers_url: "https://jobs.ashbyhq.com/langchain",     tags: [ai, devtools, startup] }
  - { name: "ElevenLabs",    careers_url: "https://jobs.ashbyhq.com/elevenlabs",    tags: [ai, startup] }
  - { name: "Character.AI",  careers_url: "https://jobs.ashbyhq.com/character",     tags: [ai, startup] }
  - { name: "Harvey",        careers_url: "https://jobs.ashbyhq.com/harvey",        tags: [ai, startup] }

  # ── ML infra / dev tools ───────────────────────────────────
  - { name: "Modal",         careers_url: "https://jobs.ashbyhq.com/modal",         tags: [ml-infra, devtools, startup] }
  - { name: "Baseten",       careers_url: "https://jobs.ashbyhq.com/baseten",       tags: [ml-infra, startup] }
  - { name: "Pinecone",      careers_url: "https://jobs.ashbyhq.com/pinecone",      tags: [ml-infra, data, startup] }
  - { name: "Weaviate",      careers_url: "https://jobs.ashbyhq.com/weaviate",      tags: [ml-infra, data, startup] }
  - { name: "Fireworks AI",  careers_url: "https://jobs.ashbyhq.com/fireworks",     tags: [ml-infra, startup] }
  - { name: "Vercel",        careers_url: "https://jobs.ashbyhq.com/vercel",        tags: [devtools, mid] }
  - { name: "Replit",        careers_url: "https://jobs.ashbyhq.com/replit",        tags: [devtools, startup] }
  - { name: "Linear",        careers_url: "https://jobs.ashbyhq.com/linear",        tags: [devtools, startup] }
  - { name: "Supabase",      careers_url: "https://jobs.ashbyhq.com/supabase",      tags: [devtools, infra, startup] }
  - { name: "HashiCorp",     careers_url: "https://job-boards.greenhouse.io/hashicorp", tags: [devtools, infra, large] }
  - { name: "GitLab",        careers_url: "https://job-boards.greenhouse.io/gitlab", tags: [devtools, large] }
  - { name: "Sentry",        careers_url: "https://job-boards.greenhouse.io/sentry", tags: [devtools, mid] }
  - { name: "Retool",        careers_url: "https://jobs.ashbyhq.com/retool",        tags: [devtools, mid] }
  - { name: "Postman",       careers_url: "https://job-boards.greenhouse.io/postman", tags: [devtools, mid] }

  # ── Data / infra ───────────────────────────────────────────
  - { name: "Databricks",    careers_url: "https://job-boards.greenhouse.io/databricks", tags: [data, ml-infra, large] }
  - { name: "Confluent",     careers_url: "https://job-boards.greenhouse.io/confluent", tags: [data, infra, large] }
  - { name: "MongoDB",       careers_url: "https://job-boards.greenhouse.io/mongodb", tags: [data, infra, large] }
  - { name: "Elastic",       careers_url: "https://job-boards.greenhouse.io/elastic", tags: [data, infra, large] }
  - { name: "dbt Labs",      careers_url: "https://job-boards.greenhouse.io/dbtlabs", tags: [data, startup] }
  - { name: "Airbyte",       careers_url: "https://jobs.ashbyhq.com/airbyte",       tags: [data, startup] }
  - { name: "Cloudflare",    careers_url: "https://job-boards.greenhouse.io/cloudflare", tags: [infra, security, large] }
  - { name: "Datadog",       careers_url: "https://job-boards.greenhouse.io/datadog", tags: [infra, observability, large] }
  - { name: "Temporal",      careers_url: "https://jobs.ashbyhq.com/temporal",      tags: [infra, devtools, startup] }

  # ── Fintech ────────────────────────────────────────────────
  - { name: "Stripe",        careers_url: "https://job-boards.greenhouse.io/stripe", tags: [fintech, large] }
  - { name: "Plaid",         careers_url: "https://job-boards.greenhouse.io/plaid", tags: [fintech, mid] }
  - { name: "Brex",          careers_url: "https://job-boards.greenhouse.io/brex", tags: [fintech, mid] }
  - { name: "Ramp",          careers_url: "https://jobs.ashbyhq.com/ramp",         tags: [fintech, mid] }
  - { name: "Mercury",       careers_url: "https://jobs.ashbyhq.com/mercury",      tags: [fintech, startup] }
  - { name: "Robinhood",     careers_url: "https://job-boards.greenhouse.io/robinhood", tags: [fintech, large] }
  - { name: "Coinbase",      careers_url: "https://job-boards.greenhouse.io/coinbase", tags: [fintech, crypto, large] }
  - { name: "Affirm",        careers_url: "https://job-boards.greenhouse.io/affirm", tags: [fintech, large] }
  - { name: "Deel",          careers_url: "https://jobs.ashbyhq.com/deel",         tags: [fintech, hr, mid] }
  - { name: "Rippling",      careers_url: "https://www.rippling.com/careers/open-roles", tags: [fintech, hr, mid], extract: { prefer_json_ld: true } }

  # ── Security ───────────────────────────────────────────────
  - { name: "Wiz",           careers_url: "https://jobs.ashbyhq.com/wiz",          tags: [security, mid] }
  - { name: "Snyk",          careers_url: "https://job-boards.greenhouse.io/snyk", tags: [security, devtools, mid] }
  - { name: "1Password",     careers_url: "https://jobs.lever.co/1password",       tags: [security, mid] }
  - { name: "Abnormal Security", careers_url: "https://job-boards.greenhouse.io/abnormalsecurity", tags: [security, ai, mid] }

  # ── Consumer / marketplace / enterprise ────────────────────
  - { name: "Airbnb",        careers_url: "https://job-boards.greenhouse.io/airbnb", tags: [consumer, large] }
  - { name: "DoorDash",      careers_url: "https://job-boards.greenhouse.io/doordash", tags: [consumer, large] }
  - { name: "Instacart",     careers_url: "https://job-boards.greenhouse.io/instacart", tags: [consumer, large] }
  - { name: "Pinterest",     careers_url: "https://job-boards.greenhouse.io/pinterest", tags: [consumer, large] }
  - { name: "Reddit",        careers_url: "https://job-boards.greenhouse.io/reddit", tags: [consumer, large] }
  - { name: "Discord",       careers_url: "https://job-boards.greenhouse.io/discord", tags: [consumer, mid] }
  - { name: "Dropbox",       careers_url: "https://job-boards.greenhouse.io/dropbox", tags: [consumer, enterprise, large] }
  - { name: "Figma",         careers_url: "https://job-boards.greenhouse.io/figma", tags: [devtools, consumer, mid] }
  - { name: "Notion",        careers_url: "https://job-boards.greenhouse.io/notion", tags: [consumer, devtools, mid] }
  - { name: "Roblox",        careers_url: "https://job-boards.greenhouse.io/roblox", tags: [consumer, gaming, large] }
```
