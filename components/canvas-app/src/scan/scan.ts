// career-scan orchestrator — the single entry point the dashboard calls.
//
// WHERE THINGS LIVE:
//   - This runs in the Canvas dashboard's JS. callTool = zero tokens.
//   - scan-history lives in NevofluxSDK.storage (dashboard-local), NOT GBrain.
//   - Persisting the shortlist to the GBrain tracker (career/applications) needs
//     the agent (brain_* are agent tools, not browser actions). Do that OUTSIDE
//     this module, e.g. on "evaluate" click, or one batched:
//       NevofluxSDK.agent.chat("append these inbox rows to career/applications: <json>")
//     so only the compact, already-filtered shortlist ever touches the LLM.
//
// USAGE (in the dashboard):
//   const ctx = makeScanContext(uiLogSink);
//   const res = await scanAll(config, ctx);   // config from career/profile ## Portals
//   render(res.fresh);                          // show new jobs; persist on demand

import { makeScanContext } from "./context.js";
import { dedup, passesLocation, passesTitle } from "./filters.js";
import { resolveProvider } from "./providers/index.js";
import type { Job, PortalConfig, ScanContext } from "./types.js";

const HISTORY_IDS_KEY = "career:scan:seen-ids";
const HISTORY_TITLES_KEY = "career:scan:seen-titles";

export interface ScanResult {
  fresh: Job[];
  reposts: Job[];
  stats: {
    portals: number;
    failed: { name: string; error: string }[];
    rawJobs: number;
    afterFilter: number;
    fresh: number;
    reposts: number;
  };
}

async function loadHistory(): Promise<{ ids: Set<string>; titles: Set<string> }> {
  const ids = (await window.NevofluxSDK.storage.get(HISTORY_IDS_KEY)) as string[] | null;
  const titles = (await window.NevofluxSDK.storage.get(HISTORY_TITLES_KEY)) as string[] | null;
  return { ids: new Set(ids ?? []), titles: new Set(titles ?? []) };
}

async function saveHistory(ids: Set<string>, titles: Set<string>): Promise<void> {
  await window.NevofluxSDK.storage.set(HISTORY_IDS_KEY, [...ids]);
  await window.NevofluxSDK.storage.set(HISTORY_TITLES_KEY, [...titles]);
}

/** Run the full scan over a portal config. Sequential + throttled (browser is serial). */
export async function scanAll(config: PortalConfig, ctx?: ScanContext): Promise<ScanResult> {
  const c = ctx ?? makeScanContext();
  const throttle = config.throttle_ms ?? 800;
  const cap = config.max_jobs ?? 300;

  const failed: { name: string; error: string }[] = [];
  let rawJobs = 0;
  const filtered: Job[] = [];

  for (const entry of config.tracked_companies) {
    if (entry.enabled === false) continue;
    const provider = resolveProvider(entry);
    if (!provider) {
      failed.push({ name: entry.name, error: "no provider matched" });
      continue;
    }
    try {
      c.log("info", `scanning ${entry.name} via ${provider.id} (${provider.kind})`);
      const jobs = await provider.fetch(entry, c);
      rawJobs += jobs.length;
      // Filter each company's jobs as they arrive: the cap counts RELEVANT jobs,
      // so one big board's many off-target postings don't stop the scan before
      // the other companies are ever reached.
      for (const j of jobs) {
        // LinkedIn results are already keyword-filtered by the search query, so
        // don't re-apply the title filter to them (it drops jobs whose title
        // lacks the exact keyword). API boards return everything, so those keep
        // the title filter. Location filter applies to all.
        const titleOk = j.source === "linkedin" || passesTitle(j.title, config.title_filter);
        if (titleOk && passesLocation(j.location, config.location_filter)) {
          filtered.push(j);
        }
      }
    } catch (e) {
      failed.push({ name: entry.name, error: (e as Error).message });
      c.log("error", `${entry.name}: ${(e as Error).message}`);
    }
    await c.wait(throttle); // serial + polite; never fan out browser actions
    if (filtered.length >= cap) {
      c.log("warn", `hit max_jobs cap (${cap}) of relevant jobs; stopping early`);
      break;
    }
  }

  // Dedup the filtered jobs against history.

  const { ids, titles } = await loadHistory();
  const { fresh, reposts } = dedup(filtered, ids, titles);

  // Update history with everything we just saw.
  for (const j of [...fresh, ...reposts]) {
    ids.add(j.id);
    titles.add(`${j.company.toLowerCase()}|${j.title.toLowerCase()}`);
  }
  await saveHistory(ids, titles);

  return {
    fresh,
    reposts,
    stats: {
      portals: config.tracked_companies.filter((e) => e.enabled !== false).length,
      failed,
      rawJobs,
      afterFilter: filtered.length,
      fresh: fresh.length,
      reposts: reposts.length,
    },
  };
}

export { makeScanContext } from "./context.js";
export * from "./types.js";
