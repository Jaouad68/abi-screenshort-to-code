import { describe, expect, it } from "vitest";
import { validerImageFacture } from "./validationImage";

describe("validerImageFacture", () => {
  it("accepte un JPEG de taille raisonnable", () => {
    expect(
      validerImageFacture({ type: "image/jpeg", size: 2 * 1024 * 1024 }),
    ).toEqual({ valide: true });
  });

  it("accepte un PNG", () => {
    expect(validerImageFacture({ type: "image/png", size: 1024 })).toEqual({
      valide: true,
    });
  });

  it("rejette une image de plus de 10 Mo", () => {
    const resultat = validerImageFacture({
      type: "image/jpeg",
      size: 11 * 1024 * 1024,
    });
    expect(resultat.valide).toBe(false);
  });

  it("accepte une image de exactement 10 Mo", () => {
    const resultat = validerImageFacture({
      type: "image/jpeg",
      size: 10 * 1024 * 1024,
    });
    expect(resultat.valide).toBe(true);
  });

  it("rejette un HEIC non converti", () => {
    const resultat = validerImageFacture({ type: "image/heic", size: 1024 });
    expect(resultat.valide).toBe(false);
    if (resultat.valide) throw new Error("devrait être invalide");
    expect(resultat.erreur).toContain("HEIC");
  });

  it("rejette un PDF", () => {
    expect(
      validerImageFacture({ type: "application/pdf", size: 1024 }).valide,
    ).toBe(false);
  });
});
