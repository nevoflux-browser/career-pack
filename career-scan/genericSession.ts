// Generic real-session provider — the catch-all for any career page that has
// no public API. Driven entirely by the entry's `extract:` config so NEW SITES
// CAN BE ADDED WITHOUT CODE: just add a tracked_companies entry with selectors
// (or rely on embedded JSON-LD). Complex/auth sites (LinkedIn) get a dedicated
// provider instead.
//
// Strategy per page:
//   1. If prefer_json_ld: read <script type="application/ld+json"> JobPosting
//      objects — the most stable signal, since it's schema.org structured data.
//   2. Else/also: query the configured card selectors.
// Uses the user's real session (callTool navigate), so SPA + auth-gated pages render.

import type { Job, PortalEntry, Provider, ScanContext, SessionExtractConfig } from "../types.js";

function jsonLdExtractorSource(): string {
  return `(() => {
    const jobs = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
      let data; try { data = JSON.parse(s.textContent || 'null'); } catch { return; }
      const arr = Array.isArray(data) ? data : [data];
      arr.forEach((d) => {
        const items = d && d['@graph'] ? d['@graph'] : [d];
        items.forEach((it) => {
          if (it && it['@type'] === 'JobPosting') {
            jobs.push({
              title: it.title || '',
              url: it.url || (it.hiringOrganization && it.hiringOrganization.sameAs) || location.href,
              company: (it.hiringOrganization && it.hiringOrganization.name) || '',
              location: (it.jobLocation && (it.jobLocation.address && (it.jobLocation.address.addressLocality || it.jobLocation.address.addressRegion))) || '',
              postedAt: it.datePosted || '',
            });
          }
        });
      });
    });
    return jobs;
  })()`;
}

function selectorExtractorSource(cfg: SessionExtractConfig): string {
  return `(() => {
    const out = [];
    document.querySelectorAll(${JSON.stringify(cfg.card_selector ?? "")}).forEach((card) => {
      const txt = (s) => { if (!s) return ''; const el = card.querySelector(s); return el ? el.textContent.trim() : ''; };
      const linkEl = ${JSON.stringify(cfg.link_selector ?? "")} ? card.querySelector(${JSON.stringify(cfg.link_selector ?? "")}) : card.querySelector('a');
      out.push({
        title: txt(${JSON.stringify(cfg.title_selector ?? "")}) || (linkEl ? linkEl.textContent.trim() : ''),
        url: linkEl ? linkEl.href : location.href,
        company: txt(${JSON.stringify(cfg.company_selector ?? "")}),
        location: txt(${JSON.stringify(cfg.location_selector ?? "")}),
      });
    });
    return out;
  })()`;
}

export const genericSession: Provider = {
  id: "session",
  kind: "session",
  // Lowest priority: only handles entries that explicitly opt in via provider:"session"
  // or that carry an extract config. detect() in the registry runs last for this.
  detect: (e) => e.provider === "session" || !!e.extract,
  async fetch(entry: PortalEntry, ctx: ScanContext): Promise<Job[]> {
    const cfg = entry.extract ?? { prefer_json_ld: true };
    const url = entry.careers_url;
    if (!url) throw new Error(`session: entry "${entry.name}" needs careers_url`);

    const pages = Math.max(1, Math.min(cfg.pagination?.pages ?? 1, 5));
    const out: Job[] = [];
    let tabId: string | undefined;

    try {
      for (let page = 0; page < pages; page++) {
        const pageUrl =
          cfg.pagination?.kind === "param" && page > 0
            ? `${url}${url.includes("?") ? "&" : "?"}${cfg.pagination.param ?? "start"}=${page * 25}`
            : url;
        const nav = await ctx.navigate(pageUrl, page === 0);
        tabId = nav.tabId ?? tabId;
        await ctx.wait(2000);

        if (cfg.pagination?.kind === "scroll" && page > 0) {
          await ctx.evalJs<void>(`window.scrollTo(0, document.body.scrollHeight)`);
          await ctx.wait(900);
        }

        let rows: any[] = [];
        if (cfg.prefer_json_ld !== false) rows = await ctx.evalJs<any[]>(jsonLdExtractorSource());
        if (!rows.length && cfg.card_selector) rows = await ctx.evalJs<any[]>(selectorExtractorSource(cfg));

        if (!rows.length) {
          ctx.log("warn", `session: no jobs extracted from ${entry.name} (page ${page + 1})`);
          break;
        }
        for (const r of rows) {
          if (!r.title) continue;
          out.push({
            id: `session:${r.url || entry.name + ":" + r.title}`,
            title: r.title,
            url: r.url || pageUrl,
            company: r.company || entry.name,
            location: r.location || "",
            postedAt: r.postedAt || undefined,
            source: "session",
          });
        }
      }
    } finally {
      if (tabId) await ctx.closeTab(tabId);
    }
    return out;
  },
};
