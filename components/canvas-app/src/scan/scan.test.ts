import { expect, test, describe } from "bun:test";
import { scanAll } from "./scan.js";
import type { PortalConfig } from "./types.js";
import { mockCtx, installStorageStub } from "./testutil.js";

describe("scanAll (fetch → filter → dedup → stats)", () => {
  test("filters by title and reports stats", async () => {
    installStorageStub();
    const config: PortalConfig = {
      title_filter: { positive: ["engineer"] },
      tracked_companies: [{ name: "Acme", careers_url: "https://job-boards.greenhouse.io/acme" }],
      throttle_ms: 0,
    };
    const ctx = mockCtx({
      fetchJson: (async () => ({
        jobs: [
          { id: 1, title: "AI Engineer", absolute_url: "https://x/1", location: { name: "Remote" } },
          { id: 2, title: "Product Designer", absolute_url: "https://x/2", location: { name: "Remote" } },
        ],
      })) as never,
    });

    const res = await scanAll(config, ctx);

    expect(res.stats.rawJobs).toBe(2);
    expect(res.stats.afterFilter).toBe(1);
    expect(res.fresh).toHaveLength(1);
    expect(res.fresh[0].title).toBe("AI Engineer");
    expect(res.stats.failed).toHaveLength(0);
  });

  test("records a failed entry when no provider matches, without aborting the scan", async () => {
    installStorageStub();
    const config: PortalConfig = {
      title_filter: { positive: [] },
      tracked_companies: [
        { name: "NoProvider", careers_url: "https://acme.com/careers" }, // no api/extract/known host → unmatched
        { name: "Acme", careers_url: "https://job-boards.greenhouse.io/acme" },
      ],
      throttle_ms: 0,
    };
    const ctx = mockCtx({
      fetchJson: (async () => ({ jobs: [{ id: 1, title: "Eng", absolute_url: "https://x/1", location: { name: "" } }] })) as never,
    });

    const res = await scanAll(config, ctx);

    expect(res.stats.failed).toHaveLength(1);
    expect(res.stats.failed[0].name).toBe("NoProvider");
    expect(res.fresh).toHaveLength(1); // Acme still scanned
  });

  test("skips disabled entries (portals counts only enabled)", async () => {
    installStorageStub();
    const config: PortalConfig = {
      title_filter: { positive: [] },
      tracked_companies: [
        { name: "Off", careers_url: "https://job-boards.greenhouse.io/off", enabled: false },
        { name: "On", careers_url: "https://job-boards.greenhouse.io/on" },
      ],
      throttle_ms: 0,
    };
    const ctx = mockCtx({ fetchJson: (async () => ({ jobs: [] })) as never });

    const res = await scanAll(config, ctx);
    expect(res.stats.portals).toBe(1);
  });
});
