import { expect, test, describe } from "bun:test";
import { passesTitle, passesLocation, dedup } from "./filters.js";
import type { Job } from "./types.js";

describe("passesTitle", () => {
  test("passes when a positive term matches (case-insensitive)", () => {
    expect(passesTitle("Senior AI Engineer", { positive: ["engineer"] })).toBe(true);
  });
  test("rejects when no positive term matches", () => {
    expect(passesTitle("Product Designer", { positive: ["engineer"] })).toBe(false);
  });
  test("a negative term rejects even if a positive matches", () => {
    expect(passesTitle("Senior Engineer, Sales", { positive: ["engineer"], negative: ["sales"] })).toBe(false);
  });
  test("empty positive list passes anything (no negative hit)", () => {
    expect(passesTitle("Anything", { positive: [] })).toBe(true);
  });
});

describe("passesLocation", () => {
  const f = { always_allow: ["remote"], allow: ["germany", "eu"], block: ["us only", "onsite"] };
  test("no filter → pass", () => {
    expect(passesLocation("Anywhere")).toBe(true);
  });
  test("empty location string → pass", () => {
    expect(passesLocation("", f)).toBe(true);
  });
  test("always_allow wins even over a block hit", () => {
    expect(passesLocation("Remote (US only)", f)).toBe(true);
  });
  test("block rejects", () => {
    expect(passesLocation("Onsite, Berlin", f)).toBe(false);
  });
  test("allow non-empty → must match one", () => {
    expect(passesLocation("Germany", f)).toBe(true);
    expect(passesLocation("Brazil", f)).toBe(false);
  });
  test("empty allow list → pass (when not blocked)", () => {
    expect(passesLocation("Brazil", { allow: [] })).toBe(true);
  });
});

describe("dedup", () => {
  const job = (id: string, company: string, title: string): Job => ({
    id,
    company,
    title,
    url: `https://x/${id}`,
    location: "",
    source: "test",
  });

  test("skips ids already in history", () => {
    const { fresh } = dedup([job("a", "Acme", "Eng")], new Set(["a"]), new Set());
    expect(fresh).toHaveLength(0);
  });

  test("skips in-batch duplicate ids", () => {
    const { fresh } = dedup([job("a", "Acme", "Eng"), job("a", "Acme", "Eng")], new Set(), new Set());
    expect(fresh).toHaveLength(1);
  });

  test("flags a repost when company|title seen before at a new id", () => {
    const { fresh, reposts } = dedup([job("new", "Acme", "Eng")], new Set(), new Set(["acme|eng"]));
    expect(fresh).toHaveLength(0);
    expect(reposts).toHaveLength(1);
    expect(reposts[0].repost).toBe(true);
  });

  test("genuinely new job goes to fresh without a repost flag", () => {
    const { fresh, reposts } = dedup([job("new", "Acme", "Eng")], new Set(), new Set());
    expect(fresh).toHaveLength(1);
    expect(fresh[0].repost).toBeUndefined();
    expect(reposts).toHaveLength(0);
  });
});
