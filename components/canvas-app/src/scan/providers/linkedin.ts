// LinkedIn provider — REAL AUTHENTICATED SESSION.
//
// ⚠️ COMPLIANCE: LinkedIn's Terms of Service restrict automated data collection.
// This provider is therefore:
//   - opt-in and DISABLED by default (the user must add a linkedin entry),
//   - read-only and human-initiated (runs only when the user clicks "scan"),
//   - rate-limited and page-capped (mirrors what a person could read by hand),
//   - credential-free: it NEVER logs in or handles passwords — it reuses the
//     session the user already established in their own browser.
// Even so, the user is responsible for their own ToS compliance. nevoflux's
// edge over headless scrapers is precisely that this is the user's real
// browser, not a masked bot — but that does not make scraping ToS-clean.
// Show the runtime notice in COMPLIANCE_NOTICE before enabling.
//
// career-ops deliberately never shipped LinkedIn scanning (issue #238). We do,
// behind these guardrails, because the real-session model makes it materially
// different — but we keep the warning honest.

import type { Job, LinkedInSearch, PortalEntry, Provider, ScanContext } from "../types.js";

export const COMPLIANCE_NOTICE =
  "LinkedIn scanning uses your own logged-in session, read-only and rate-limited. " +
  "Automated collection may conflict with LinkedIn's Terms of Service; you are responsible for your use. Continue?";

// Selectors ROT — keep them here for one-line hot-fixes. The extraction strategy
// is defensive: it anchors on job-view links (stable) and reads sibling text
// with multiple fallbacks rather than trusting one brittle class.
const SELECTORS = {
  viewLink: 'a[href*="/jobs/view/"]',
  cardCompany: '[class*="subtitle"], [class*="company"], .job-card-container__company-name',
  cardLocation: '[class*="location"], .job-card-container__metadata-item',
  resultsContainer: '.scaffold-layout__list, .jobs-search__results-list, main',
};

const PAGE_SIZE = 25;

function buildSearchUrl(s: LinkedInSearch, start: number): string {
  const p = new URLSearchParams();
  p.set("keywords", s.keywords);
  if (s.location) p.set("location", s.location);
  if (s.posted_within) p.set("f_TPR", s.posted_within); // e.g. r86400 (24h), r604800 (week)
  if (s.remote) p.set("f_WT", "2");
  if (start > 0) p.set("start", String(start));
  return `https://www.linkedin.com/jobs/search/?${p.toString()}`;
}

// Runs IN the page. Returns minimal serializable rows. Pure DOM, no network.
function extractorSource(sel: typeof SELECTORS): string {
  return `(() => {
    const out = [];
    const seen = new Set();
    document.querySelectorAll(${JSON.stringify(sel.viewLink)}).forEach((a) => {
      const href = a.href.split('?')[0];
      const m = href.match(/\\/jobs\\/view\\/(\\d+)/);
      if (!m || seen.has(m[1])) return;
      seen.add(m[1]);
      const card = a.closest('li') || a.closest('[data-job-id]') || a.parentElement;
      const text = (s) => { const el = card && card.querySelector(s); return el ? el.textContent.trim() : ''; };
      out.push({
        id: m[1],
        title: (a.getAttribute('aria-label') || a.textContent || '').trim(),
        url: 'https://www.linkedin.com/jobs/view/' + m[1] + '/',
        company: text(${JSON.stringify(sel.cardCompany)}),
        location: text(${JSON.stringify(sel.cardLocation)}),
      });
    });
    return out;
  })()`;
}

export const linkedin: Provider = {
  id: "linkedin",
  kind: "session",
  detect: (e) => e.provider === "linkedin" || /(^|\.)linkedin\.com/.test(e.careers_url ?? ""),
  async fetch(entry: PortalEntry, ctx: ScanContext): Promise<Job[]> {
    const search = entry.search;
    if (!search) throw new Error(`linkedin: entry "${entry.name}" needs a search:{keywords,...} block`);

    const pages = Math.max(1, Math.min(search.pages ?? 1, 5)); // hard cap: be polite
    const jobs: Job[] = [];
    let tabId: string | undefined;

    try {
      for (let page = 0; page < pages; page++) {
        const url = buildSearchUrl(search, page * PAGE_SIZE);
        const nav = await ctx.navigate(url, page === 0); // reuse the tab after page 1
        tabId = nav.tabId ?? tabId;
        await ctx.wait(2500); // let results render in the real session

        // Nudge lazy-loading with several scrolls so more cards render.
        for (let s = 0; s < 4; s++) {
          await ctx.evalJs<void>(`window.scrollTo(0, document.body.scrollHeight)`);
          await ctx.wait(700);
        }
        const rows = await ctx.evalJs<Array<Omit<Job, "company" | "source"> & { company: string }>>(
          extractorSource(SELECTORS),
        );

        if (!rows?.length) {
          ctx.log("warn", `linkedin: no cards on page ${page + 1} — selectors may have changed, or session not logged in`);
          break;
        }
        for (const r of rows) {
          jobs.push({
            id: `li:${r.id}`,
            title: r.title,
            url: r.url,
            company: r.company || entry.name,
            location: r.location,
            source: "linkedin",
          });
        }
        await ctx.wait(1200); // inter-page politeness
      }
    } finally {
      if (tabId) await ctx.closeTab(tabId);
    }
    return jobs;
  },
};
