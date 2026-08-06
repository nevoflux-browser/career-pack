// career-scan — in-dashboard scanning module (types)
//
// This module runs ENTIRELY inside the Canvas dashboard's JavaScript. It talks
// to the browser through `NevofluxSDK.callTool(...)`, which is a direct iframe→
// daemon dispatch — the LLM/agent is NOT in the loop, so scanning costs zero
// tokens. (Only persisting results to GBrain needs the agent; that happens
// outside this module — see scan.ts header.)

/** A normalized job posting, the common currency every provider emits. */
export interface Job {
  /** Stable dedup key — provider-specific id if available, else the URL. */
  id: string;
  title: string;
  url: string;
  company: string;
  location: string;
  /** ISO date or raw "x days ago" string when the source exposes it. */
  postedAt?: string;
  /** provider id that produced this row (greenhouse|ashby|lever|linkedin|session). */
  source: string;
  /** Set by dedup against scan-history when the same company+title reappears at a new URL. */
  repost?: boolean;
}

/** One configured portal/company from the user's `## Portals` list. */
export interface PortalEntry {
  name: string;
  /** Branded careers URL preferred; ATS-hosted URL acceptable as fallback. */
  careers_url?: string;
  /** Explicit API endpoint (overrides slug auto-derivation). */
  api?: string;
  /** Force a specific provider id, bypassing detect(). */
  provider?: string;
  /** For genericSession: per-site extraction config (selectors / json-ld). */
  extract?: SessionExtractConfig;
  /** For linkedin: search params. */
  search?: LinkedInSearch;
  enabled?: boolean;
}

export interface TitleFilter {
  positive: string[];
  negative?: string[];
}

export interface LocationFilter {
  always_allow?: string[];
  allow?: string[];
  block?: string[];
}

export interface PortalConfig {
  title_filter: TitleFilter;
  location_filter?: LocationFilter;
  tracked_companies: PortalEntry[];
  /** Politeness: ms between network actions / tab opens. Default 800. */
  throttle_ms?: number;
  /** Hard cap on jobs returned per scan, to stay light. Default 300. */
  max_jobs?: number;
}

/** Per-entry extraction recipe for the generic real-session provider. */
export interface SessionExtractConfig {
  /** Prefer structured data when present (most stable). */
  prefer_json_ld?: boolean;
  /** CSS for the repeating job card (used if no/insufficient JSON-LD). */
  card_selector?: string;
  /** CSS within a card. Kept in config because selectors ROT — easy to hot-fix. */
  title_selector?: string;
  link_selector?: string;
  company_selector?: string;
  location_selector?: string;
  /** How to advance pages: scroll the SPA, or append &start=N, or none. */
  pagination?: { kind: "scroll" | "param"; param?: string; pages?: number };
}

export interface LinkedInSearch {
  keywords: string;
  location?: string;
  /** f_TPR window, e.g. "r86400" = past 24h, "r604800" = past week. */
  posted_within?: string;
  /** Remote filter: f_WT=2 (remote). */
  remote?: boolean;
  pages?: number;
}

/**
 * The capability surface providers are allowed to use. It wraps
 * NevofluxSDK.callTool so providers never touch the SDK directly and stay
 * testable. Result payload shapes of callTool are ASSUMED here (see comments);
 * adjust to the real schemas if they differ.
 */
export interface ScanContext {
  /** GET a URL and parse JSON. Uses callTool('web_fetch'). Zero token. */
  fetchJson<T = unknown>(url: string): Promise<T>;
  /** GET a URL, return raw text. */
  fetchText(url: string): Promise<string>;
  /** Open url (optionally in a new tab). Returns the tab id when available. */
  navigate(url: string, newTab?: boolean): Promise<{ tabId?: string }>;
  /** Run a self-contained JS expression/IIFE in the active tab; returns its value. */
  evalJs<T = unknown>(code: string): Promise<T>;
  /** Read the active tab rendered as markdown. */
  getMarkdown(): Promise<string>;
  listTabs(): Promise<Array<{ tab_id: string; url: string; title: string }>>;
  activateTab(tabId: string): Promise<void>;
  closeTab(tabId: string): Promise<void>;
  /** Politeness sleep. */
  wait(ms: number): Promise<void>;
  /** Structured log surfaced in the dashboard UI. */
  log(level: "info" | "warn" | "error", msg: string): void;
}

/**
 * A scan provider. Add a new job site by implementing this and registering it
 * in providers/index.ts. `kind` documents whether it hits a public API
 * (zero-network-auth) or drives the user's real authenticated session.
 */
export interface Provider {
  id: string;
  kind: "api" | "session";
  /** Auto-route: return true/derived-url if this provider handles the entry. */
  detect(entry: PortalEntry): boolean;
  /** Produce normalized jobs for one entry. Throw to signal failure (scan continues). */
  fetch(entry: PortalEntry, ctx: ScanContext): Promise<Job[]>;
}

/** Global ambient for the SDK injected into every Canvas iframe. */
declare global {
  interface Window {
    NevofluxSDK: {
      callTool(
        action: string,
        params?: Record<string, unknown>,
      ): Promise<{ success: boolean; result?: any; error?: string }>;
      storage: {
        get(key: string): Promise<any>;
        set(key: string, value: unknown): Promise<void>;
        delete(key: string): Promise<void>;
        query(prefix: string): Promise<string[]>;
      };
      agent: { chat(message: string, opts?: Record<string, unknown>): Promise<any> };
    };
  }
}
