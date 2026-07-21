import { describe, expect, it } from "vitest";
import { eurosVersCentimes } from "./argent";

describe("eurosVersCentimes", () => {
  it("convertit un montant simple", () => {
    expect(eurosVersCentimes(12.5)).toBe(1250);
  });

  it("arrondit les imprécisions flottantes", () => {
    expect(eurosVersCentimes(19.99)).toBe(1999);
  });

  it("gère zéro", () => {
    expect(eurosVersCentimes(0)).toBe(0);
  });

  it("gère les montants négatifs (avoir fournisseur)", () => {
    expect(eurosVersCentimes(-5.4)).toBe(-540);
  });
});
