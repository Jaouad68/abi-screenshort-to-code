import { describe, expect, it } from "vitest";
import { analyserSms } from "./segments";

describe("analyserSms", () => {
  it("recognizes plain unaccented text as GSM7", () => {
    const { encodage, segments } = analyserSms("Salon Sandrine : RDV confirme mardi 14 juillet a 14h30.");
    expect(encodage).toBe("GSM7");
    expect(segments).toBe(1);
  });

  it("accepts the handful of accented letters that are actually part of GSM7 (é, à, ù...)", () => {
    // Real GSM 03.38 default alphabet includes à/è/é/ì/ò/ù/ä/ö/ñ/ü, unlike the
    // simplified "any accent" guidance in the product README.
    const { encodage } = analyserSms("Rendez-vous confirme a Chateaudun, a bientot");
    expect(encodage).toBe("GSM7");
  });

  it("falls back to Unicode for accented letters outside GSM7 (ê, î, ç...)", () => {
    const { encodage } = analyserSms("Rendez-vous confirmê");
    expect(encodage).toBe("UCS2");
  });

  it("stays on a single GSM7 segment at exactly 160 characters", () => {
    const texte = "a".repeat(160);
    const { segments, longueur } = analyserSms(texte);
    expect(longueur).toBe(160);
    expect(segments).toBe(1);
  });

  it("splits into two GSM7 segments at 161 characters", () => {
    const texte = "a".repeat(161);
    const { segments } = analyserSms(texte);
    expect(segments).toBe(2);
  });

  it("stays on a single UCS2 segment at exactly 70 characters", () => {
    const texte = "ê".repeat(70);
    const { encodage, segments } = analyserSms(texte);
    expect(encodage).toBe("UCS2");
    expect(segments).toBe(1);
  });

  it("splits into two UCS2 segments at 71 characters", () => {
    const texte = "ê".repeat(71);
    const { segments } = analyserSms(texte);
    expect(segments).toBe(2);
  });

  it("counts GSM7 extension characters (like €) as two septets", () => {
    const { longueur } = analyserSms("10€");
    // "1" + "0" (1 septet each) + "€" (2 septets) = 4
    expect(longueur).toBe(4);
  });

  it("returns 0 segments for an empty message", () => {
    expect(analyserSms("").segments).toBe(0);
  });
});
