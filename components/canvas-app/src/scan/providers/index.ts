// Provider registry. ADD A NEW JOB SITE HERE:
//   1. API site (Workday, SmartRecruiters, …) → write providers/<id>.ts (kind:"api")
//      deriving its public endpoint, then add it to API_PROVIDERS.
//   2. Auth/complex site (Indeed, …) → write a dedicated session provider like
//      linkedin.ts and add it to SESSION_PROVIDERS.
//   3. Simple SSR/SPA career page → no code: add a tracked_companies entry with
//      an `extract:` config; genericSession handles it.
//
// Resolution order (first match wins):
//   explicit entry.provider  →  API providers (by URL detect)  →
//   dedicated session providers (linkedin)  →  genericSession (catch-all)

import type { PortalEntry, Provider } from "../types.js";
import { ashby, greenhouse, lever } from "./ats.js";
import { linkedin } from "./linkedin.js";
import { genericSession } from "./genericSession.js";

export const API_PROVIDERS: Provider[] = [greenhouse, ashby, lever];
export const SESSION_PROVIDERS: Provider[] = [linkedin];

/** Ordered for detect(): APIs first (cheapest), dedicated sessions, then catch-all. */
export const ALL_PROVIDERS: Provider[] = [...API_PROVIDERS, ...SESSION_PROVIDERS, genericSession];

const byId = new Map(ALL_PROVIDERS.map((p) => [p.id, p]));

export function resolveProvider(entry: PortalEntry): Provider | null {
  if (entry.provider) return byId.get(entry.provider) ?? null;
  for (const p of ALL_PROVIDERS) {
    try {
      if (p.detect(entry)) return p;
    } catch {
      /* detect must never throw fatally; skip */
    }
  }
  return null;
}
