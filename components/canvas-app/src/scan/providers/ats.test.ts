import { expect, test, describe } from "bun:test";
import { greenhouse, ashby, lever } from "./ats.js";
import { mockCtx } from "../testutil.js";

describe("greenhouse", () => {
  test("detect matches greenhouse hosts (incl. .eu and boards.) and explicit api", () => {
    expect(greenhouse.detect({ name: "a", careers_url: "https://job-boards.greenhouse.io/acme" })).toBe(true);
    expect(greenhouse.detect({ name: "a", careers_url: "https://job-boards.eu.greenhouse.io/acme" })).toBe(true);
    expect(greenhouse.detect({ name: "a", careers_url: "https://boards.greenhouse.io/acme" })).toBe(true);
    expect(greenhouse.detect({ name: "a", api: "https://custom/api" })).toBe(true);
    expect(greenhouse.detect({ name: "a", careers_url: "https://acme.com/careers" })).toBe(false);
  });

  test("derives the boards-api URL from careers_url", async () => {
    let called = "";
    const ctx = mockCtx({
      fetchJson: (async (u: string) => {
        called = u;
        return { jobs: [] };
      }) as never,
    });
    await greenhouse.fetch({ name: "Acme", careers_url: "https://job-boards.greenhouse.io/acme" }, ctx);
    expect(called).toBe("https://boards-api.greenhouse.io/v1/boards/acme/jobs");
  });

  test("normalizes jobs and drops entries without absolute_url", async () => {
    const ctx = mockCtx({
      fetchJson: (async () => ({
        jobs: [
          { id: 12, title: "AI Eng", absolute_url: "https://x/12", location: { name: "Remote" }, updated_at: "2026-01-01" },
          { id: 13, title: "No URL" }, // dropped
        ],
      })) as never,
    });
    const jobs = await greenhouse.fetch({ name: "Acme", api: "https://boards-api.greenhouse.io/v1/boards/acme/jobs" }, ctx);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      id: "gh:12",
      title: "AI Eng",
      url: "https://x/12",
      company: "Acme",
      location: "Remote",
      source: "greenhouse",
    });
  });

  test("fetch throws when no API url can be derived", async () => {
    // detect would be false here, but a direct fetch must fail loudly.
    expect(greenhouse.fetch({ name: "Acme", careers_url: "https://acme.com" }, mockCtx())).rejects.toThrow();
  });
});

describe("ashby", () => {
  test("derives the posting-api URL and normalizes", async () => {
    let called = "";
    const ctx = mockCtx({
      fetchJson: (async (u: string) => {
        called = u;
        return { jobs: [{ id: "p1", title: "Eng", jobUrl: "https://a/p1", location: "EU" }] };
      }) as never,
    });
    const jobs = await ashby.fetch({ name: "Acme", careers_url: "https://jobs.ashbyhq.com/acme" }, ctx);
    expect(called).toBe("https://api.ashbyhq.com/posting-api/job-board/acme?includeCompensation=true");
    expect(jobs[0]).toMatchObject({ id: "ashby:p1", url: "https://a/p1", company: "Acme", location: "EU", source: "ashby" });
  });
});

describe("lever", () => {
  test("normalizes an array response", async () => {
    const ctx = mockCtx({
      fetchJson: (async () => [
        { id: "l1", text: "Eng", hostedUrl: "https://l/l1", categories: { location: "Remote" }, createdAt: 1700000000000 },
      ]) as never,
    });
    const jobs = await lever.fetch({ name: "Acme", careers_url: "https://jobs.lever.co/acme" }, ctx);
    expect(jobs[0]).toMatchObject({ id: "lever:l1", title: "Eng", url: "https://l/l1", location: "Remote", source: "lever" });
    expect(jobs[0].postedAt).toBe(new Date(1700000000000).toISOString());
  });

  test("returns [] for a non-array response", async () => {
    const ctx = mockCtx({ fetchJson: (async () => ({})) as never });
    expect(await lever.fetch({ name: "Acme", api: "https://api.lever.co/v0/postings/acme" }, ctx)).toEqual([]);
  });
});
