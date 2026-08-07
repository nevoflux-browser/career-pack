---
name: career-pdf
description: >-
  Generate an ATS-friendly, JD-tailored CV as a PDF. Reads career/cv (the source
  of truth — never invents), fills the pack's cv-template.html tailored to a
  specific job per the writing conventions, writes it into the session sandbox,
  and renders it via the pdf.render canvas-tool (WeasyPrint). Never renders
  without a JD, and never fails silently if WeasyPrint is missing.
version: 0.1.0
tags:
  - career
  - pdf
  - cv
dependencies:
  - career:conventions/rules.md
  - career:conventions/writing.md
  - career:conventions/data.md
allowed_tools:
  - brain_get_page
  - browser_ask_user
  - pdf.render
enabled: true
---

# /career-pdf

Produce a tailored CV PDF for one job. Read `career:conventions/rules.md` first —
in particular **never generate a CV/PDF without reading the JD first** (NEVER #6),
and **never invent** experience or metrics; everything comes from `career/cv`.

## Step 0 — Contracts + the JD gate

`skill_read('career', 'conventions/rules.md')`, then `writing.md` (ATS + tone
rules). You **must** have the job: if you weren't given one, `browser_ask_user`
for the JD text / URL, or the `career/reports/{slug}` of an already-evaluated
job. **No JD → stop.**

## Step 1 — Sources of truth

`brain_get_page` `career/cv` (source of truth) and `career/profile` (target
archetype, preferences). If a report slug was provided, `brain_get_page` it and
tailor toward its Block B must-haves.

## Step 2 — Compose the HTML

`skill_read('career-pdf', 'cv-template.html')`. Fill every `{{placeholder}}` from
`career/cv` — never add a metric, role, or skill the CV doesn't state. Tailor per
`writing.md`: mirror the JD's exact vocabulary for skills the CV supports,
front-load the most-relevant experience, keep it single-column and plain (ATS).
Write the filled HTML into the session sandbox, e.g. `$SESSION_DIR/cv.html`.

## Step 3 — Probe WeasyPrint

Before rendering, confirm WeasyPrint is available (the pack declares it under
`external_binaries`; `nevoflux pack status career-pack` reports whether it's
present). If it's missing, tell the user to install it (`pip install weasyprint`,
or `brew install weasyprint`) and **stop** — never silently fail or fake a PDF.

## Step 4 — Render

Invoke the `pdf.render` canvas-tool with `input = $SESSION_DIR/cv.html` and
`output = $SESSION_DIR/{company-slug}-cv.pdf` (both paths stay inside
`$SESSION_DIR`; the tool enforces this too). Return the PDF path to the user.

## Step 5 — Don't touch the tracker

career-pdf is not a tracker writer. When run inside `career-auto-pipeline`, the
orchestrator flips that job's row `pdf` to `generated` after a successful render
(`career:conventions/data.md`). Standalone, just report the PDF path.

## Boundaries

- Never invent CV content — fill only from `career/cv`.
- Never render without a JD (the Step 0 gate).
- Keep all paths inside `$SESSION_DIR`.
- WeasyPrint only; a LaTeX high-fidelity branch is future work.
