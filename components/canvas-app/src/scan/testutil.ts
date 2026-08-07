// Test helpers: a partial mock ScanContext and an in-memory NevofluxSDK.storage
// stub. Not imported by the app (main.ts) — only by *.test.ts, so it never ships
// in the bundle.

import type { ScanContext } from "./scan.js";

/** Build a ScanContext where every method is a harmless default; override what a test needs. */
export function mockCtx(over: Partial<ScanContext> = {}): ScanContext {
  const base = {
    fetchJson: async () => ({}),
    fetchText: async () => "",
    navigate: async () => ({ tabId: "t1" }),
    evalJs: async () => [],
    getMarkdown: async () => "",
    listTabs: async () => [],
    activateTab: async () => {},
    closeTab: async () => {},
    wait: async () => {},
    log: () => {},
  };
  return { ...base, ...over } as unknown as ScanContext;
}

/**
 * Install a fresh in-memory `window.NevofluxSDK.storage` (get/set) so scanAll's
 * history load/save works under `bun test`. Returns the backing map for asserts.
 */
export function installStorageStub(initial: Record<string, unknown> = {}): Map<string, unknown> {
  const store = new Map<string, unknown>(Object.entries(initial));
  (globalThis as unknown as { window: unknown }).window = {
    NevofluxSDK: {
      storage: {
        get: async (k: string) => (store.has(k) ? store.get(k) : null),
        set: async (k: string, v: unknown) => {
          store.set(k, v);
        },
      },
    },
  };
  return store;
}
