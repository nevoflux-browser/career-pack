import { expect, test, describe } from "bun:test";
import { resolveProvider } from "./index.js";

describe("resolveProvider routing (first match wins)", () => {
  test("greenhouse / ashby / lever by careers_url host", () => {
    expect(resolveProvider({ name: "a", careers_url: "https://job-boards.greenhouse.io/acme" })?.id).toBe("greenhouse");
    expect(resolveProvider({ name: "a", careers_url: "https://jobs.ashbyhq.com/acme" })?.id).toBe("ashby");
    expect(resolveProvider({ name: "a", careers_url: "https://jobs.lever.co/acme" })?.id).toBe("lever");
  });

  test("linkedin by domain or explicit provider", () => {
    expect(resolveProvider({ name: "a", careers_url: "https://www.linkedin.com/company/acme" })?.id).toBe("linkedin");
    expect(resolveProvider({ name: "a", provider: "linkedin" })?.id).toBe("linkedin");
  });

  test("session (generic) via extract config or explicit provider", () => {
    expect(resolveProvider({ name: "a", careers_url: "https://acme.com/careers", extract: { prefer_json_ld: true } })?.id).toBe("session");
    expect(resolveProvider({ name: "a", provider: "session" })?.id).toBe("session");
  });

  test("explicit provider overrides URL-based detection", () => {
    expect(resolveProvider({ name: "a", provider: "greenhouse", careers_url: "https://jobs.lever.co/acme" })?.id).toBe("greenhouse");
  });

  test("null when nothing matches (bare non-ATS careers_url, no extract)", () => {
    expect(resolveProvider({ name: "a", careers_url: "https://acme.com/careers" })).toBeNull();
  });

  test("null for an unknown explicit provider", () => {
    expect(resolveProvider({ name: "a", provider: "does-not-exist" })).toBeNull();
  });
});
