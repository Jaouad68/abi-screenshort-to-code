import { describe, expect, it } from "vitest";
import { getOrganById, groupBySystem, organs, searchOrgans } from "./organs";

describe("organs data", () => {
  it("has a unique id for every organ", () => {
    const ids = organs.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every organ exactly six key facts covering the required labels", () => {
    const requiredLabels = ["Size", "Weight", "Daily", "Location", "Blood supply", "Function"];
    for (const organ of organs) {
      expect(organ.keyFacts).toHaveLength(6);
      expect(organ.keyFacts.map((f) => f.label).sort()).toEqual([...requiredLabels].sort());
    }
  });

  it("gives every organ at least three hotspots with non-empty descriptions", () => {
    for (const organ of organs) {
      expect(organ.hotspots.length).toBeGreaterThanOrEqual(3);
      for (const hotspot of organ.hotspots) {
        expect(hotspot.description.length).toBeGreaterThan(0);
        expect(hotspot.position).toHaveLength(3);
      }
    }
  });

  it("gives every organ microscopic detail and at least two clinical notes", () => {
    for (const organ of organs) {
      expect(organ.microscopic.cellTypes.length).toBeGreaterThan(0);
      expect(organ.clinicalNotes.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("places every organ's body position within the 0-100 percent range", () => {
    for (const organ of organs) {
      expect(organ.bodyPosition.x).toBeGreaterThanOrEqual(0);
      expect(organ.bodyPosition.x).toBeLessThanOrEqual(100);
      expect(organ.bodyPosition.y).toBeGreaterThanOrEqual(0);
      expect(organ.bodyPosition.y).toBeLessThanOrEqual(100);
    }
  });
});

describe("getOrganById", () => {
  it("finds an existing organ", () => {
    expect(getOrganById("heart")?.name).toBe("Heart");
  });

  it("returns undefined for an unknown id", () => {
    expect(getOrganById("spleen")).toBeUndefined();
  });
});

describe("searchOrgans", () => {
  it("returns every organ for an empty query", () => {
    expect(searchOrgans("")).toHaveLength(organs.length);
    expect(searchOrgans("   ")).toHaveLength(organs.length);
  });

  it("matches by name case-insensitively", () => {
    const results = searchOrgans("hEaRt");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("heart");
  });

  it("matches by body system", () => {
    const results = searchOrgans("digestive");
    expect(results.map((o) => o.id).sort()).toEqual(["intestine", "liver"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(searchOrgans("xylophone")).toHaveLength(0);
  });
});

describe("groupBySystem", () => {
  it("groups every organ under its system with no duplicates or omissions", () => {
    const groups = groupBySystem();
    const total = Object.values(groups).reduce((sum, list) => sum + list.length, 0);
    expect(total).toBe(organs.length);
  });
});
