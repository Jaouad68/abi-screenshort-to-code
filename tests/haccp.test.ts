import { describe, it, expect } from "vitest";
import { isConforme, computeDlc, isDlcDepassee, periodStart } from "@/lib/haccp";

describe("isConforme", () => {
  it("accepte une valeur dans la plage (bornes incluses)", () => {
    expect(isConforme(2, 0, 4)).toBe(true);
    expect(isConforme(0, 0, 4)).toBe(true);
    expect(isConforme(4, 0, 4)).toBe(true);
  });
  it("rejette une valeur hors plage", () => {
    expect(isConforme(-1, 0, 4)).toBe(false);
    expect(isConforme(5, 0, 4)).toBe(false);
  });
  it("gère les plages négatives (congélateur)", () => {
    expect(isConforme(-20, -25, -18)).toBe(true);
    expect(isConforme(-10, -25, -18)).toBe(false);
  });
});

describe("computeDlc", () => {
  it("ajoute le nombre de jours à la date d'ouverture", () => {
    const ouverture = new Date("2026-06-01T10:00:00.000Z");
    const dlc = computeDlc(ouverture, 3);
    expect(dlc.getDate()).toBe(4);
  });
  it("ne mute pas la date d'origine", () => {
    const ouverture = new Date("2026-06-01T10:00:00.000Z");
    computeDlc(ouverture, 3);
    expect(ouverture.toISOString()).toBe("2026-06-01T10:00:00.000Z");
  });
});

describe("isDlcDepassee", () => {
  it("détecte une DLC passée", () => {
    const now = new Date("2026-06-10T12:00:00Z");
    expect(isDlcDepassee(new Date("2026-06-09T12:00:00Z"), now)).toBe(true);
    expect(isDlcDepassee(new Date("2026-06-11T12:00:00Z"), now)).toBe(false);
  });
});

describe("periodStart", () => {
  const ref = new Date("2026-06-17T15:30:00"); // un mercredi

  it("quotidienne = minuit du jour", () => {
    const d = periodStart("QUOTIDIENNE", ref);
    expect(d.getHours()).toBe(0);
    expect(d.getDate()).toBe(17);
  });
  it("hebdomadaire = lundi de la semaine", () => {
    const d = periodStart("HEBDOMADAIRE", ref);
    expect(d.getDay()).toBe(1); // lundi
    expect(d.getDate()).toBe(15);
  });
  it("mensuelle = 1er du mois", () => {
    const d = periodStart("MENSUELLE", ref);
    expect(d.getDate()).toBe(1);
    expect(d.getMonth()).toBe(5); // juin
  });
});
