import { describe, it, expect } from "vitest";
import { debutDeSemaineIso } from "./datetime";

describe("debutDeSemaineIso", () => {
  it("returns the same date when given a Monday", () => {
    expect(debutDeSemaineIso("2026-07-13")).toBe("2026-07-13");
  });

  it("returns the preceding Monday for a mid-week date", () => {
    expect(debutDeSemaineIso("2026-07-16")).toBe("2026-07-13");
  });

  it("returns the preceding Monday for a Sunday", () => {
    expect(debutDeSemaineIso("2026-07-19")).toBe("2026-07-13");
  });
});
