import { describe, expect, it } from "vitest";
import { normaliserNomIngredient } from "./normalisation";

describe("normaliserNomIngredient", () => {
  it("met en minuscules", () => {
    expect(normaliserNomIngredient("BEURRE")).toBe("beurre");
  });

  it("retire les espaces en début et fin", () => {
    expect(normaliserNomIngredient("  beurre  ")).toBe("beurre");
  });

  it("réduit les espaces multiples internes", () => {
    expect(normaliserNomIngredient("pomme   de   terre")).toBe("pomme de terre");
  });

  it("laisse les accents intacts", () => {
    expect(normaliserNomIngredient("Crème fraîche")).toBe("crème fraîche");
  });
});
