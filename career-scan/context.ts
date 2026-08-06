// ScanContext — wraps NevofluxSDK.callTool so providers stay decoupled and
// testable. Every method here is a direct browser dispatch (zero LLM tokens).
//
// NOTE: callTool result *payload shapes* are assumed below and centralized here
// so there is exactly one place to adjust if the real schemas differ:
//   - web_fetch  -> result is the body (string) or { content | body | text }
//   - navigate   -> result may carry { tab_id }
//   - eval_js    -> result is the evaluated (serializable) value
//   - get_markdown -> result is a string (or { markdown })
//   - list_tabs  -> result is an array of { tab_id, url, title }

import type { ScanContext } from "./types.js";

type LogSink = (level: "info" | "warn" | "error", msg: string) => void;

async function call(action: string, params: Record<string, unknown> = {}): Promise<any> {
  const r = await window.NevofluxSDK.callTool(action, params);
  if (!r.success) throw new Error(`callTool(${action}) failed: ${r.error ?? "unknown"}`);
  return r.result;
}

function asText(result: any): string {
  if (typeof result === "string") return result;
  return result?.content ?? result?.body ?? result?.text ?? result?.markdown ?? "";
}

export function makeScanContext(logSink?: LogSink): ScanContext {
  const log: ScanContext["log"] = (level, msg) => (logSink ? logSink(level, msg) : console[level](msg));

  return {
    async fetchText(url) {
      return asText(await call("web_fetch", { url }));
    },
    async fetchJson<T>(url: string): Promise<T> {
      const body = await call("web_fetch", { url });
      if (body && typeof body === "object" && !("content" in body) && !("body" in body)) {
        return body as T; // already parsed
      }
      const text = asText(body);
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new Error(`fetchJson: response from ${url} was not JSON`);
      }
    },
    async navigate(url, newTab) {
      const result = await call("navigate", { url, new_tab: !!newTab });
      return { tabId: result?.tab_id };
    },
    async evalJs<T>(code: string): Promise<T> {
      return (await call("eval_js", { code })) as T;
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
