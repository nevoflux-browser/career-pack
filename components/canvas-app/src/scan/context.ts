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

/**
 * Zero-token GET of a URL's raw body. The eval sandbox cannot make network
 * requests (XHR and fetch both fail with NetworkError even same-origin), but it
 * CAN read a loaded document. So we open `view-source:<url>` — Firefox renders
 * the raw response bytes as plain text (no JSON viewer) — and read
 * document.body.textContent. Zero token: the browser fetches, we just read.
 *
 * Each fetch opens its OWN fresh tab (creating a tab with a view-source: URL
 * works; re-navigating an existing tab to view-source did not) and pins the eval
 * to that exact tab via tab_id. navigate resolves only after the page finishes
 * loading, so no extra wait is needed. We verify the tab's href before trusting
 * the text, so eval can never hand back one of the user's other open tabs.
 */
async function evalFetchText(url: string): Promise<string> {
  const host = new URL(url).host;
  const nav = (await call("navigate", { url: "view-source:" + url, new_tab: true })) as
    | { tab_id?: string; tabId?: string }
    | undefined;
  const tabId = nav?.tab_id ?? nav?.tabId;

  const evalParams: Record<string, unknown> = {
    script: `(function () { var b = document.body; return { href: location.href, text: b ? b.textContent : "" }; })()`,
  };
  if (tabId != null) evalParams.tab_id = tabId;
  const v = (await call("eval_js", evalParams)) as { href?: string; text?: string } | undefined;

  const href = v?.href ?? "";
  if (!href.includes(host)) throw new Error(`fetch ${url}: tab showed "${href}" (not ${host})`);
  const text = v?.text ?? "";
  if (!text) throw new Error(`fetch ${url}: empty response [${href}]`);
  return text;
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
      const result = await call("navigate", { url, new_tab: !!newTab });
      return { tabId: result?.tab_id };
    },
    async evalJs<T>(code: string): Promise<T> {
      return (await call("eval_js", { script: code })) as T;
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
