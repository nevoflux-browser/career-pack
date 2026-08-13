// ScanContext — wraps NevofluxSDK.callTool so providers stay decoupled and
// testable. Every method here is a direct browser dispatch (zero LLM tokens).
//
// FETCH STRATEGY (A′, zero-token): the platform's `web_fetch` action is HTML-only
// (rejects application/json) and returns a cached file path, so it can't serve the
// ATS JSON APIs. `eval_js` is synchronous (no async/await of fetch()). So we read
// JSON with a *synchronous* XMLHttpRequest inside eval_js: it blocks in the sandbox
// and returns the body directly. To avoid CORS entirely we first navigate the scan
// tab TO the target URL, so the XHR to that same URL is SAME-ORIGIN (a cross-origin
// XHR from about:blank's null origin was blocked with "network error").
//
// eval_js contract (verified against the engine): param is `script` (not `code`);
// the result comes back on `.value` (not `.result`); the evaluated value must be
// JSON-serializable (so the sync XHR returns a plain {ok,status,text} object).

import type { ScanContext } from "./types.js";

type LogSink = (level: "info" | "warn" | "error", msg: string) => void;

/** Raw callTool wrapper. Returns the action's `result` (or `value` for eval_js). */
async function call(action: string, params: Record<string, unknown> = {}): Promise<any> {
  const r = await window.NevofluxSDK.callTool(action, params);
  if (!r.success) {
    const err = typeof r.error === "string" ? r.error : JSON.stringify(r.error);
    throw new Error(`callTool(${action}) failed: ${err ?? "unknown"}`);
  }
  return r.result ?? (r as { value?: unknown }).value;
}

function asText(result: any): string {
  if (typeof result === "string") return result;
  return result?.content ?? result?.body ?? result?.text ?? result?.markdown ?? "";
}

// One reused scan tab. The platform exposes no "close tab" action to canvas
// apps, so instead of opening a fresh tab per company (8 tabs left open), we
// reuse a single tab. If a reuse-navigate drifts to the wrong tab, we reset and
// open a fresh one — so the happy path is ONE tab, and correctness never depends
// on the reuse sticking. The tab is reused across scan runs too (self-heals if
// the user closed it).
let scanTabId: string | undefined;

/**
 * Zero-token GET of a URL's raw body. The eval sandbox cannot make network
 * requests (XHR and fetch both fail with NetworkError even same-origin), but it
 * CAN read a loaded document. So we open `view-source:<url>` — Firefox renders
 * the raw response bytes as plain text (no JSON viewer) — and read
 * document.body.textContent. Zero token: the browser fetches, we just read. We
 * verify the tab's href each attempt and retry on drift, so eval never hands
 * back one of the user's other open tabs.
 */
async function evalFetchText(url: string): Promise<string> {
  const host = new URL(url).host;
  const vsUrl = "view-source:" + url;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const navParams: Record<string, unknown> =
        scanTabId == null ? { url: vsUrl, new_tab: true } : { url: vsUrl, tab_id: scanTabId };
      const nav = (await call("navigate", navParams)) as { tab_id?: string; tabId?: string } | undefined;
      if (scanTabId == null) scanTabId = nav?.tab_id ?? nav?.tabId;

      const evalParams: Record<string, unknown> = {
        script: `(function () { var b = document.body; return { href: location.href, text: b ? b.textContent : "" }; })()`,
      };
      if (scanTabId != null) evalParams.tab_id = scanTabId;
      const v = (await call("eval_js", evalParams)) as { href?: string; text?: string } | undefined;
      if (v?.href?.includes(host) && v.text) return v.text;
    } catch {
      // fall through and retry with a fresh tab
    }
    scanTabId = undefined; // drift or error → next attempt opens a fresh tab
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`fetch ${url}: could not load after retries`);
}

export function makeScanContext(logSink?: LogSink): ScanContext {
  const log: ScanContext["log"] = (level, msg) => (logSink ? logSink(level, msg) : console[level](msg));

  return {
    async fetchText(url) {
      return evalFetchText(url);
    },
    async fetchJson<T>(url: string): Promise<T> {
      const text = await evalFetchText(url);
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new Error(`fetchJson: response from ${url} was not JSON (${text.slice(0, 80)})`);
      }
    },
    async navigate(url, newTab) {
      // Pin the session tab so a following evalJs reads THIS page, not another
      // of the user's open tabs (same drift fix as the view-source path).
      const navParams: Record<string, unknown> = { url };
      if (newTab || scanTabId == null) navParams.new_tab = true;
      else navParams.tab_id = scanTabId;
      const result = (await call("navigate", navParams)) as { tab_id?: string; tabId?: string } | undefined;
      scanTabId = result?.tab_id ?? result?.tabId ?? scanTabId;
      return { tabId: scanTabId };
    },
    async evalJs<T>(code: string): Promise<T> {
      const params: Record<string, unknown> = { script: code };
      if (scanTabId != null) params.tab_id = scanTabId;
      return (await call("eval_js", params)) as T;
    },
    async getMarkdown() {
      return asText(await call("get_markdown", {}));
    },
    async listTabs() {
      const result = await call("list_tabs", {});
      return Array.isArray(result) ? result : (result?.tabs ?? []);
    },
    async activateTab(tabId) {
      await call("activateTab", { tab_id: tabId });
    },
    async closeTab(tabId) {
      // close_tab is best-effort; some builds expose it under a different name.
      try {
        await call("close_tab", { tab_id: tabId });
      } catch {
        log("warn", `could not close tab ${tabId}`);
      }
    },
    wait: (ms) => new Promise((res) => setTimeout(res, ms)),
    log,
  };
}
