import { describe, expect, it } from "vitest";
import { calculerDimensionsCible, remplacerExtension } from "./compression";

describe("calculerDimensionsCible", () => {
  it("ne change rien si l'image est déjà sous la limite", () => {
    expect(calculerDimensionsCible({ largeur: 800, hauteur: 600 })).toEqual({
      largeur: 800,
      hauteur: 600,
    });
  });

  it("redimensionne en conservant le ratio d'aspect (paysage)", () => {
    const resultat = calculerDimensionsCible(
      { largeur: 4000, hauteur: 3000 },
      2000,
    );
    expect(resultat).toEqual({ largeur: 2000, hauteur: 1500 });
  });

  it("redimensionne en conservant le ratio d'aspect (portrait)", () => {
    const resultat = calculerDimensionsCible(
      { largeur: 3000, hauteur: 4000 },
      2000,
    );
    expect(resultat).toEqual({ largeur: 1500, hauteur: 2000 });
  });

  it("n'agrandit jamais une image plus petite que la limite", () => {
    expect(calculerDimensionsCible({ largeur: 500, hauteur: 300 }, 2000)).toEqual({
      largeur: 500,
      hauteur: 300,
    });
  });

  it("accepte une dimension exactement égale à la limite", () => {
    expect(calculerDimensionsCible({ largeur: 2000, hauteur: 1000 }, 2000)).toEqual({
      largeur: 2000,
      hauteur: 1000,
    });
  });
});

describe("remplacerExtension", () => {
  it("remplace une extension existante", () => {
    expect(remplacerExtension("facture.heic", "jpg")).toBe("facture.jpg");
  });

  it("ajoute une extension à un nom sans extension", () => {
    expect(remplacerExtension("facture", "jpg")).toBe("facture.jpg");
  });

  it("gère les noms avec plusieurs points", () => {
    expect(remplacerExtension("facture.finale.png", "jpg")).toBe(
      "facture.finale.jpg",
    );
  });
});
