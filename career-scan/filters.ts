// Pure functions: title filter, location filter, dedup + repost detection.
// All run in-dashboard on already-fetched Job[]; no network, no tokens.

import type { Job, LocationFilter, TitleFilter } from "./types.js";

const lc = (s: string) => s.toLowerCase();

/** At least one positive matches AND no negative matches (case-insensitive). */
export function passesTitle(title: string, f: TitleFilter): boolean {
  const t = lc(title);
  if (f.negative?.some((n) => t.includes(lc(n)))) return false;
  if (!f.positive?.length) return true;
  return f.positive.some((p) => t.includes(lc(p)));
}

/**
 * Location semantics (in order): empty → pass; always_allow hit → pass;
 * block hit → reject; allow empty → pass; allow non-empty → must match one.
 */
export function passesLocation(location: string, f?: LocationFilter): boolean {
  if (!f) return true;
  const loc = lc(location);
  if (!loc) return true;
  if (f.always_allow?.some((k) => loc.includes(lc(k)))) return true;
  if (f.block?.some((k) => loc.includes(lc(k)))) return false;
  if (!f.allow?.length) return true;
  return f.allow.some((k) => loc.includes(lc(k)));
}

export interface DedupResult {
  fresh: Job[]; // genuinely new
  reposts: Job[]; // same company+title, new URL, within window
}

/**
 * Dedup against history (set of seen ids) and flag reposts. `historyTitles`
 * maps `${company}|${title}` → true for company+title seen before.
 */
export function dedup(jobs: Job[], seenIds: Set<string>, historyTitles: Set<string>): DedupResult {
  const fresh: Job[] = [];
  const reposts: Job[] = [];
  const localSeen = new Set<string>();
  for (const j of jobs) {
    if (seenIds.has(j.id) || localSeen.has(j.id)) continue;
    localSeen.add(j.id);
    const key = `${lc(j.company)}|${lc(j.title)}`;
    if (historyTitles.has(key)) {
      reposts.push({ ...j, repost: true });
    } else {
      fresh.push(j);
    }
  }
  return { fresh, reposts };
}
