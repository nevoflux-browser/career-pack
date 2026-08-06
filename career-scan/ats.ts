// Three zero-token API providers. Each derives a public board-API URL from the
// entry's careers_url (or explicit `api:`), fetches JSON via callTool('web_fetch'),
// and normalizes to Job[]. No auth, no LLM, no scraping.

import type { Job, PortalEntry, Provider, ScanContext } from "../types.js";

// ── Greenhouse ──────────────────────────────────────────────────────
const GH_HOSTS = /(?:job-boards(?:\.eu)?|boards)\.greenhouse\.io\/([^/?#]+)/;

function ghApiUrl(entry: PortalEntry): string | null {
  if (entry.api) return entry.api;
  const m = (entry.careers_url ?? "").match(GH_HOSTS);
  return m ? `https://boards-api.greenhouse.io/v1/boards/${m[1]}/jobs` : null;
}

export const greenhouse: Provider = {
  id: "greenhouse",
  kind: "api",
  detect: (e) => ghApiUrl(e) !== null,
  async fetch(entry, ctx) {
    const url = ghApiUrl(entry);
    if (!url) throw new Error(`greenhouse: no API url for ${entry.name}`);
    const json = await ctx.fetchJson<{ jobs?: any[] }>(url);
    return (json.jobs ?? [])
      .filter((j) => j.absolute_url)
      .map<Job>((j) => ({
        id: `gh:${j.id ?? j.absolute_url}`,
        title: j.title ?? "",
        url: j.absolute_url,
        company: entry.name,
        location: j.location?.name ?? "",
        postedAt: j.updated_at,
        source: "greenhouse",
      }));
  },
};

// ── Ashby ───────────────────────────────────────────────────────────
const ASHBY_HOST = /jobs\.ashbyhq\.com\/([^/?#]+)/;

function ashbyApiUrl(entry: PortalEntry): string | null {
  if (entry.api) return entry.api;
  const m = (entry.careers_url ?? "").match(ASHBY_HOST);
  return m ? `https://api.ashbyhq.com/posting-api/job-board/${m[1]}?includeCompensation=true` : null;
}

export const ashby: Provider = {
  id: "ashby",
  kind: "api",
  detect: (e) => ashbyApiUrl(e) !== null,
  async fetch(entry, ctx) {
    const url = ashbyApiUrl(entry);
    if (!url) throw new Error(`ashby: no API url for ${entry.name}`);
    // Ashby's posting-api has a ~10s+ server-side latency floor — be patient.
    const json = await ctx.fetchJson<{ jobs?: any[] }>(url);
    return (json.jobs ?? []).map<Job>((j) => ({
      id: `ashby:${j.id ?? j.jobUrl ?? j.applyUrl}`,
      title: j.title ?? "",
      url: j.jobUrl ?? j.applyUrl ?? "",
      company: entry.name,
      location: j.location ?? j.locationName ?? "",
      postedAt: j.publishedDate,
      source: "ashby",
    }));
  },
};

// ── Lever ───────────────────────────────────────────────────────────
const LEVER_HOST = /jobs\.lever\.co\/([^/?#]+)/;

function leverApiUrl(entry: PortalEntry): string | null {
  if (entry.api) return entry.api;
  const m = (entry.careers_url ?? "").match(LEVER_HOST);
  return m ? `https://api.lever.co/v0/postings/${m[1]}` : null;
}

export const lever: Provider = {
  id: "lever",
  kind: "api",
  detect: (e) => leverApiUrl(e) !== null,
  async fetch(entry, ctx) {
    const url = leverApiUrl(entry);
    if (!url) throw new Error(`lever: no API url for ${entry.name}`);
    const json = await ctx.fetchJson<any[]>(url);
    if (!Array.isArray(json)) return [];
    return json.map<Job>((j) => ({
      id: `lever:${j.id ?? j.hostedUrl}`,
      title: j.text ?? "",
      url: j.hostedUrl ?? j.applyUrl ?? "",
      company: entry.name,
      location: j.categories?.location ?? "",
      postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : undefined,
      source: "lever",
    }));
  },
};
