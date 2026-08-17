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

// agent.chat resolves to an unknown shape (typed `any`). Accept a string, an
// object that is already the config, or a common chat-envelope text field.
function parseConfig(raw: unknown): PortalConfig {
  if (raw && typeof raw === "object" && Array.isArray((raw as PortalConfig).tracked_companies)) {
    return raw as PortalConfig;
  }
  const text =
    typeof raw === "string"
      ? raw
      : ((["text", "content", "message", "output_text", "response"] as const)
          .map((k) => (raw as Record<string, unknown> | null)?.[k])
          .find((v): v is string => typeof v === "string") ?? JSON.stringify(raw));
  return JSON.parse(stripFences(text)) as PortalConfig;
}

async function loadConfig(): Promise<PortalConfig> {
  const raw = await window.NevofluxSDK.agent.chat(
    "Build a PortalConfig JSON for a job scan by combining two GBrain pages. " +
      "1) career/profile — the user's needs: target archetypes, and title/location/salary preferences. " +
      "2) career/directory — its `## Companies` YAML list of {name, careers_url, tags}. " +
      "Return ONLY a JSON object with keys: " +
      "title_filter {positive[], negative?[]} (from the user's must-have / exclude keywords), " +
      "location_filter? {always_allow?[], allow?[], block?[]} (from the user's remote/location prefs), " +
      "tracked_companies[] (each {name, careers_url, extract?}) — take these from career/directory, " +
      "keeping ONLY companies whose tags match the user's target archetypes/domains, capped at 40 " +
      "(preserve any `extract` field), " +
      "throttle_ms?, max_jobs?. " +
      "ALSO append exactly ONE more entry to tracked_companies to search LinkedIn from the same needs: " +
      "{name: \"LinkedIn\", provider: \"linkedin\", search: {keywords: \"<a LinkedIn BOOLEAN query built from the needs: " +
      "wrap every multi-word phrase in double quotes, join the must-have terms with OR, and append the excludes as " +
      "NOT (...); e.g. (\\\"machine learning\\\" OR \\\"ai engineer\\\" OR llm) NOT (sales OR intern OR manager)>\", " +
      "location: \"<the user's location, or omit>\", remote: <true if the user wants remote>, posted_within: \"r604800\", pages: 3}}. " +
      "If career/directory is missing, fall back to career/profile's own `## Portals` list (still append the LinkedIn entry). " +
      "Return JSON only — no prose, no explanation.",
  );
  const config = parseConfig(raw);
  if (!config || !Array.isArray(config.tracked_companies)) {
    throw new Error("no usable scan config (career/directory + career/profile produced no companies)");
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
    // Canvas artifacts run in a sandboxed iframe where <a target="_blank"> is
    // blocked, so open the JD via the SDK's navigate action instead.
    const link = el("a", { href, class: "job-link" }, [job.title]);
    link.addEventListener("click", (e) => {
      e.preventDefault();
      void window.NevofluxSDK.callTool("navigate", { url: href, new_tab: true });
    });
    titleChildren.push(link);
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

  // Cluster fresh + reposts together; reposts carry `.repost === true` (set by
  // dedup) so their badges render. Stats still report the two counts separately.
  const allJobs = [...res.fresh, ...res.reposts];
  if (allJobs.length === 0) {
    inboxRoot.append(el("p", { class: "empty" }, ["No new jobs this scan."]));
  } else {
    for (const [company, companyJobs] of clusterByCompany(allJobs)) {
      const repostCount = companyJobs.filter((j) => j.repost).length;
      const header = el("div", { class: "cluster-header" }, [
        el("span", { class: "cluster-name" }, [company]),
        el("span", { class: "cluster-count" }, [`${companyJobs.length} job${companyJobs.length === 1 ? "" : "s"}`]),
      ]);
      if (repostCount > 0) header.append(el("span", { class: "badge badge-repost" }, [`${repostCount} repost`]));
      const cluster = el("div", { class: "cluster" }, [header]);
      for (const job of companyJobs) cluster.append(renderJobRow(job));
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
    const activeCount = config.tracked_companies.filter((e) => e.enabled !== false).length;
    appendLog("info", `scanning ${activeCount} tracked companies…`);
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

// ---- scan the page the user has open (any job platform: Indeed, LinkedIn, …) ----

type RawJob = { title: string; url: string; company: string; location: string };

async function scanCurrentPage(): Promise<void> {
  scanBtn.disabled = true;
  logRoot.replaceChildren();
  try {
    appendLog("info", "reading the page you have open (scrolling to load more)…");
    // Scroll the active tab a few times so lazy-loaded job cards render, then extract.
    for (let i = 0; i < 6; i++) {
      await window.NevofluxSDK.callTool("eval_js", {
        script: "window.scrollTo(0, document.body.scrollHeight); 1",
      });
      await new Promise((r) => setTimeout(r, 700));
    }
    // Runs in the user's active web tab (no tab_id → active tab). Prefers JSON-LD
    // JobPosting (schema.org, embedded by many boards); falls back to job-like links.
    const script = `(function () {
      var out = [], seenUrl = {}, counts = { jsonld: 0, datajk: 0, linkedin: 0, generic: 0 };
      function push(t, u, c, l) {
        t = (t || "").replace(/\\s+/g, " ").trim();
        u = u || location.href;
        if (!t || t.length < 3 || t.length > 180 || seenUrl[u]) return;
        seenUrl[u] = 1;
        out.push({ title: t, url: u, company: (c || "").trim(), location: (l || "").trim() });
      }
      // 1) JSON-LD JobPosting
      try {
        document.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) {
          var d; try { d = JSON.parse(s.textContent || "null"); } catch (e) { return; }
          (Array.isArray(d) ? d : [d]).forEach(function (x) {
            (x && x["@graph"] ? x["@graph"] : [x]).forEach(function (it) {
              if (it && it["@type"] === "JobPosting") { counts.jsonld++; push(it.title, it.url, (it.hiringOrganization || {}).name, (((it.jobLocation || {}).address) || {}).addressLocality); }
            });
          });
        });
      } catch (e) {}
      // 2) Indeed (each result card carries data-jk)
      try {
        document.querySelectorAll("[data-jk]").forEach(function (card) {
          counts.datajk++;
          var jk = card.getAttribute("data-jk");
          var a = card.querySelector('h2 a, a.jcs-JobTitle, a[id^="job_"]') || card.querySelector("a[href]");
          var title = a ? (a.getAttribute("title") || a.textContent) : "";
          if (!title) { var sp = card.querySelector('h2 span[title], .jobTitle span'); if (sp) title = sp.getAttribute("title") || sp.textContent; }
          var ce = card.querySelector('[data-testid="company-name"], [class*="ompanyName"]');
          var le = card.querySelector('[data-testid="text-location"], [class*="ompanyLocation"]');
          push(title, (a && a.href) || (location.origin + "/viewjob?jk=" + jk), ce && ce.textContent, le && le.textContent);
        });
      } catch (e) {}
      // 3) LinkedIn (/jobs/view/ anchors)
      try {
        document.querySelectorAll('a[href*="/jobs/view/"]').forEach(function (a) {
          counts.linkedin++;
          push(a.getAttribute("aria-label") || a.textContent, a.href.split("?")[0], "", "");
        });
      } catch (e) {}
      // 4) generic job-like links (only if nothing structured matched)
      if (!out.length) {
        document.querySelectorAll("a[href]").forEach(function (a) {
          var href = a.href || "";
          if (/\\/(viewjob|job-details|jobs?|careers?|rc\\/clk|pagead\\/clk)[\\/?]/i.test(href)) { counts.generic++; push(a.textContent, href, "", ""); }
        });
      }
      return { href: location.href, counts: counts, jobs: out.slice(0, 300) };
    })()`;
    const r = (await window.NevofluxSDK.callTool("eval_js", { script })) as {
      value?: { href?: string; counts?: Record<string, number>; jobs?: RawJob[] };
      result?: { href?: string; counts?: Record<string, number>; jobs?: RawJob[] };
    };
    const v = r?.value ?? r?.result;
    const raw = (v?.jobs ?? []) as RawJob[];
    appendLog("info", `page: ${v?.href ?? "(unknown)"}`);
    appendLog("info", `matched — ${JSON.stringify(v?.counts ?? {})}`);
    const jobs: Job[] = raw
      .filter((j) => j.title && j.url)
      .map((j) => ({
        id: "page:" + j.url,
        title: j.title,
        url: j.url,
        company: j.company || "This page",
        location: j.location || "",
        source: "page",
      }));
    const res: ScanResult = {
      fresh: jobs,
      reposts: [],
      stats: { portals: 1, failed: [], rawJobs: raw.length, afterFilter: jobs.length, fresh: jobs.length, reposts: 0 },
    };
    renderStats(res.stats);
    renderInbox(res);
    appendLog("info", `done: ${jobs.length} jobs read from this page.`);
  } catch (e) {
    appendLog("error", (e as Error).message);
  } finally {
    scanBtn.disabled = false;
  }
}

// ---- onboarding (P1: upload résumé + describe needs → career/cv + career/profile) ----

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      resolve(s.slice(s.indexOf(",") + 1)); // strip the data:…;base64, prefix
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function field(label: string, input: HTMLElement): HTMLElement {
  return el("label", { class: "field" }, [el("span", { class: "field-label" }, [label]), input]);
}

function renderOnboarding(): void {
  const resume = el("input", { type: "file", accept: ".pdf,.md,.txt,.docx", class: "inp" });
  const northStar = el("input", { type: "text", class: "inp", placeholder: "Production-grade AI engineer shipping LLM products" });
  const roles = el("input", { type: "text", class: "inp", placeholder: "AI/ML Engineer, Backend Engineer" });
  const location = el("input", { type: "text", class: "inp", placeholder: "Remote (EU), or Berlin" });
  const want = el("input", { type: "text", class: "inp", placeholder: "engineer, machine learning, llm" });
  const avoid = el("input", { type: "text", class: "inp", placeholder: "sales, intern, manager" });
  const salary = el("input", { type: "text", class: "inp", placeholder: "$150k–200k or €90k+" });
  const status = el("div", { class: "onb-status" });
  const saveBtn = el("button", { class: "scan-btn" }, ["Save profile"]);
  const backBtn = el("button", { class: "reset-btn" }, ["Back to scan"]);
  backBtn.addEventListener("click", renderShell);

  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    try {
      let resumeClause = "";
      const f = resume.files?.[0];
      if (f) {
        status.textContent = "Uploading résumé…";
        const b64 = await fileToBase64(f);
        const res = (await window.NevofluxSDK.callTool("cache_file", {
          name: f.name,
          content: b64,
          mime_type: f.type,
        })) as { success?: boolean; result?: { file_path?: string; path?: string } };
        const path = res?.result?.file_path ?? res?.result?.path;
        if (!path) throw new Error("could not save the résumé file");
        resumeClause =
          `Read the résumé file at ${path}, parse it, and write its content into the GBrain page ` +
          "career/cv (per career:conventions/data.md — transcribe, never invent). ";
      }
      status.textContent = "Writing your profile…";
      await window.NevofluxSDK.agent.chat(
        resumeClause +
          "Write the GBrain page career/profile from these needs, following the career-setup contract: " +
          `north-star: "${northStar.value.trim()}"; target archetypes: "${roles.value.trim()}"; ` +
          `salary target: "${salary.value.trim()}". Include a ## Portals section with ` +
          `title_filter.positive = [${want.value.trim()}], title_filter.negative = [${avoid.value.trim()}], ` +
          `and location_filter derived from "${location.value.trim()}" (remote → always_allow:[remote]; ` +
          "a named place → allow:[that place]). Do NOT list any companies — the scan draws them from " +
          "career/directory. Return a short confirmation.",
      );
      status.textContent = "Saved ✓ — go back and Scan.";
    } catch (e) {
      status.textContent = "Error: " + (e as Error).message;
    } finally {
      saveBtn.disabled = false;
    }
  });

  app.replaceChildren(
    el("header", { class: "app-header" }, [el("h1", {}, ["Set up your search"]), backBtn]),
    el("div", { class: "onboarding" }, [
      el("p", { class: "onb-intro" }, [
        "Upload your résumé and describe what you want. We find matching jobs from our company " +
          "directory — you never have to name companies.",
      ]),
      field("Résumé (PDF)", resume),
      field("North-star", northStar),
      field("Target roles / archetypes", roles),
      field("Remote / location", location),
      field("Must-have keywords", want),
      field("Exclude keywords", avoid),
      field("Salary target", salary),
      el("div", { class: "onb-actions" }, [saveBtn]),
      status,
    ]),
  );
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
  const resetBtn = el("button", { class: "reset-btn" }, ["Reset seen"]);
  resetBtn.addEventListener("click", () => {
    void window.NevofluxSDK.storage.set("career:scan:seen-ids", []);
    void window.NevofluxSDK.storage.set("career:scan:seen-titles", []);
    appendLog("info", "cleared scan history — the next Scan shows all matching jobs.");
  });
  const setupBtn = el("button", { class: "reset-btn" }, ["Setup"]);
  setupBtn.addEventListener("click", renderOnboarding);
  const pageBtn = el("button", { class: "scan-btn" }, ["Scan this page"]);
  pageBtn.addEventListener("click", scanCurrentPage as unknown as () => void);
  statsRoot = el("div", { class: "stats" });
  inboxRoot = el("div", { class: "inbox" });
  logRoot = el("div", { class: "log-pane" });

  app.replaceChildren(
    el("header", { class: "app-header" }, [
      el("h1", {}, ["Career Scan"]),
      el("div", { class: "actions" }, [setupBtn, resetBtn, pageBtn, scanBtn]),
    ]),
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
