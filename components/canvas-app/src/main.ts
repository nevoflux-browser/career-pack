// Minimal scan dashboard — wraps the zero-token scan engine into a Canvas app.
//
// Runtime: this runs inside the nevoflux Canvas iframe, where the platform
// injects `window.NevofluxSDK`. scanAll drives the browser via callTool (zero
// tokens); config is loaded once from career/profile's `## Portals` via
// agent.chat (a small, one-off token cost, per scan.ts's header note).
//
// Scope: scan → clustered-by-company inbox + stats. Persisting to the GBrain
// tracker needs the agent/evaluate flow and is intentionally out of scope here.

import { scanAll, makeScanContext } from "./scan/scan.js";
import type { PortalConfig, ScanResult, Job } from "./scan/scan.js";

type LogLevel = "info" | "warn" | "error";

// ---- tiny safe DOM helpers (never inject untrusted strings as HTML) ----

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  const { class: className, ...rest } = props as Record<string, unknown> & { class?: string };
  if (className) node.className = className;
  Object.assign(node, rest);
  for (const c of children) node.append(typeof c === "string" ? document.createTextNode(c) : c);
  return node;
}

/** Only allow http(s) links; anything else (javascript:, data:) is dropped. */
function safeHref(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

// ---- app state / roots ----

const app = document.getElementById("app")!;
let logRoot: HTMLElement;
let statsRoot: HTMLElement;
let inboxRoot: HTMLElement;
let scanBtn: HTMLButtonElement;

function appendLog(level: LogLevel, msg: string): void {
  logRoot.append(el("div", { class: `log log-${level}` }, [`[${level}] ${msg}`]));
  logRoot.scrollTop = logRoot.scrollHeight;
}

// ---- config load (one small token cost) ----

function stripFences(s: string): string {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (m ? m[1] : s).trim();
}

async function loadConfig(): Promise<PortalConfig> {
  const raw = await window.NevofluxSDK.agent.chat(
    "Read the GBrain page career/profile and return ONLY its `## Portals` section " +
      "parsed as a PortalConfig JSON object with keys: title_filter {positive[], negative?[]}, " +
      "location_filter? {always_allow?[], allow?[], block?[]}, tracked_companies[] " +
      "(each {name, careers_url?, api?, provider?, extract?, search?, enabled?}), throttle_ms?, max_jobs?. " +
      "Return JSON only — no prose, no explanation.",
  );
  const text = typeof raw === "string" ? raw : (raw?.text ?? JSON.stringify(raw));
  const config = JSON.parse(stripFences(text)) as PortalConfig;
  if (!config || !Array.isArray(config.tracked_companies)) {
    throw new Error("career/profile has no usable `## Portals` config (tracked_companies missing)");
  }
  return config;
}

// ---- rendering ----

function renderStats(stats: ScanResult["stats"]): void {
  statsRoot.replaceChildren();
  const tiles: [string, string][] = [
    ["Portals", String(stats.portals)],
    ["Raw", String(stats.rawJobs)],
    ["Filtered", String(stats.afterFilter)],
    ["Fresh", String(stats.fresh)],
    ["Reposts", String(stats.reposts)],
    ["Failed", String(stats.failed.length)],
  ];
  for (const [label, value] of tiles) {
    statsRoot.append(
      el("div", { class: "stat" }, [
        el("div", { class: "stat-value" }, [value]),
        el("div", { class: "stat-label" }, [label]),
      ]),
    );
  }
}

function clusterByCompany(jobs: Job[]): Map<string, Job[]> {
  const byCompany = new Map<string, Job[]>();
  for (const j of jobs) {
    const key = j.company || "(unknown)";
    (byCompany.get(key) ?? byCompany.set(key, []).get(key)!).push(j);
  }
  return byCompany;
}

function renderJobRow(job: Job): HTMLElement {
  const meta = [job.location, job.source].filter(Boolean).join(" · ");
  const titleChildren: (Node | string)[] = [];
  const href = safeHref(job.url);
  if (href) {
    titleChildren.push(el("a", { href, target: "_blank", rel: "noopener noreferrer" }, [job.title]));
  } else {
    titleChildren.push(job.title);
  }
  if (job.repost) titleChildren.push(el("span", { class: "badge badge-repost" }, ["repost"]));
  return el("div", { class: "job" }, [
    el("div", { class: "job-title" }, titleChildren),
    el("div", { class: "job-meta" }, [meta]),
  ]);
}

function renderInbox(res: ScanResult): void {
  inboxRoot.replaceChildren();

  if (res.fresh.length === 0) {
    inboxRoot.append(el("p", { class: "empty" }, ["No fresh jobs this scan."]));
  } else {
    for (const [company, jobs] of clusterByCompany(res.fresh)) {
      const repostCount = jobs.filter((j) => j.repost).length;
      const header = el("div", { class: "cluster-header" }, [
        el("span", { class: "cluster-name" }, [company]),
        el("span", { class: "cluster-count" }, [`${jobs.length} job${jobs.length === 1 ? "" : "s"}`]),
      ]);
      if (repostCount > 0) header.append(el("span", { class: "badge badge-repost" }, [`${repostCount} repost`]));
      const cluster = el("div", { class: "cluster" }, [header]);
      for (const job of jobs) cluster.append(renderJobRow(job));
      inboxRoot.append(cluster);
    }
  }

  if (res.stats.failed.length > 0) {
    const failed = el("div", { class: "failed" }, [el("div", { class: "failed-title" }, ["Failed portals"])]);
    for (const f of res.stats.failed) {
      failed.append(el("div", { class: "failed-row" }, [`${f.name}: ${f.error}`]));
    }
    inboxRoot.append(failed);
  }
}

// ---- scan handler ----

async function runScan(): Promise<void> {
  scanBtn.disabled = true;
  logRoot.replaceChildren();
  try {
    appendLog("info", "loading portal config from career/profile…");
    const config = await loadConfig();
    appendLog("info", `scanning ${config.tracked_companies.length} tracked companies…`);
    const ctx = makeScanContext((lvl, msg) => appendLog(lvl as LogLevel, msg));
    const res = await scanAll(config, ctx);
    renderStats(res.stats);
    renderInbox(res);
    appendLog("info", `done: ${res.stats.fresh} fresh, ${res.stats.reposts} reposts, ${res.stats.failed.length} failed.`);
  } catch (e) {
    appendLog("error", (e as Error).message);
  } finally {
    scanBtn.disabled = false;
  }
}

// ---- shell / bootstrap ----

function renderNoSdk(): void {
  app.replaceChildren(
    el("div", { class: "notice" }, [
      el("h1", {}, ["Career Scan"]),
      el("p", {}, [
        "NevofluxSDK is not available. Open this dashboard inside the NevoFlux browser " +
          "(it is installed by the career-pack as a Canvas artifact).",
      ]),
    ]),
  );
}

function renderShell(): void {
  scanBtn = el("button", { class: "scan-btn", onclick: runScan as unknown as HTMLButtonElement["onclick"] }, ["Scan"]);
  statsRoot = el("div", { class: "stats" });
  inboxRoot = el("div", { class: "inbox" });
  logRoot = el("div", { class: "log-pane" });

  app.replaceChildren(
    el("header", { class: "app-header" }, [el("h1", {}, ["Career Scan"]), scanBtn]),
    statsRoot,
    el("div", { class: "columns" }, [
      el("section", { class: "col-inbox" }, [el("h2", {}, ["Inbox"]), inboxRoot]),
      el("section", { class: "col-log" }, [el("h2", {}, ["Log"]), logRoot]),
    ]),
  );
}

if (typeof window === "undefined" || !window.NevofluxSDK) {
  renderNoSdk();
} else {
  renderShell();
}
