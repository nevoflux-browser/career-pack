import { expect, test, describe } from "bun:test";
import { genericSession } from "./genericSession.js";
import { linkedin } from "./linkedin.js";
import { mockCtx } from "../testutil.js";

describe("genericSession", () => {
  test("detect: extract config or explicit provider only", () => {
    expect(genericSession.detect({ name: "a", extract: { prefer_json_ld: true } })).toBe(true);
    expect(genericSession.detect({ name: "a", provider: "session" })).toBe(true);
    expect(genericSession.detect({ name: "a", careers_url: "https://acme.com" })).toBe(false);
  });

  test("throws without a careers_url", () => {
    expect(genericSession.fetch({ name: "Acme", extract: { prefer_json_ld: true } }, mockCtx())).rejects.toThrow(/careers_url/);
  });

  test("extracts JSON-LD rows and closes the tab", async () => {
    let closed = false;
    const ctx = mockCtx({
      navigate: (async () => ({ tabId: "t9" })) as never,
      evalJs: (async () => [{ title: "Eng", url: "https://x/1", company: "Acme", location: "Remote" }]) as never,
      closeTab: (async () => {
        closed = true;
      }) as never,
    });
    const jobs = await genericSession.fetch({ name: "Acme", careers_url: "https://acme.com/careers" }, ctx);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ id: "session:https://x/1", title: "Eng", company: "Acme", location: "Remote", source: "session" });
    expect(closed).toBe(true);
  });

  test("empty extraction logs a warning and returns []", async () => {
    const logs: [string, string][] = [];
    const ctx = mockCtx({
      evalJs: (async () => []) as never,
      log: ((lvl: string, msg: string) => logs.push([lvl, msg])) as never,
    });
    const jobs = await genericSession.fetch({ name: "Acme", careers_url: "https://acme.com/careers" }, ctx);
    expect(jobs).toEqual([]);
    expect(logs.some(([lvl]) => lvl === "warn")).toBe(true);
  });
});

describe("linkedin", () => {
  test("detect: linkedin.com domain or explicit provider", () => {
    expect(linkedin.detect({ name: "a", careers_url: "https://www.linkedin.com/jobs" })).toBe(true);
    expect(linkedin.detect({ name: "a", provider: "linkedin" })).toBe(true);
    expect(linkedin.detect({ name: "a", careers_url: "https://acme.com" })).toBe(false);
  });

  test("throws without a search block", () => {
    expect(linkedin.fetch({ name: "LI", provider: "linkedin" }, mockCtx())).rejects.toThrow(/search/);
  });

  test("normalizes extracted cards and closes the tab", async () => {
    let closed = false;
    const ctx = mockCtx({
      navigate: (async () => ({ tabId: "t1" })) as never,
      evalJs: (async () => [{ id: "123", title: "AI Eng", url: "https://www.linkedin.com/jobs/view/123/", company: "Acme", location: "Remote" }]) as never,
      closeTab: (async () => {
        closed = true;
      }) as never,
    });
    const jobs = await linkedin.fetch({ name: "LI", provider: "linkedin", search: { keywords: "ai engineer", pages: 1 } }, ctx);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ id: "li:123", title: "AI Eng", company: "Acme", source: "linkedin" });
    expect(closed).toBe(true);
  });
});
