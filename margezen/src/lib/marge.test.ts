import { describe, expect, it } from "vitest";
import {
  coefficientMultiplicateur,
  classerPlat,
  coutMatierePortion,
  margeBrutePct,
  prixConseille,
  prixVenteHT,
  type LigneFicheTechnique,
  type PrixIngredient,
} from "./marge";

describe("coutMatierePortion", () => {
  const prix: Record<string, PrixIngredient> = {
    beurre: { prixUnitaireCts: 900, uniteRef: "kg" },
    entrecote: { prixUnitaireCts: 2800, uniteRef: "kg" },
    huile: { prixUnitaireCts: 450, uniteRef: "L" },
  };

  it("calcule le coût total d'une fiche à un ingrédient", () => {
    const fiche: LigneFicheTechnique[] = [
      { ingredientId: "beurre", quantite: 0.02, unite: "kg" },
    ];
    expect(coutMatierePortion(fiche, prix)).toEqual({
      coutCts: 18,
      complet: true,
      ingredientsManquants: [],
    });
  });

  it("additionne plusieurs ingrédients", () => {
    const fiche: LigneFicheTechnique[] = [
      { ingredientId: "entrecote", quantite: 0.25, unite: "kg" },
      { ingredientId: "beurre", quantite: 0.01, unite: "kg" },
    ];
    const resultat = coutMatierePortion(fiche, prix);
    expect(resultat.complet).toBe(true);
    expect(resultat.coutCts).toBe(709);
  });

  it("arrondit le total au centime le plus proche", () => {
    const fiche: LigneFicheTechnique[] = [
      { ingredientId: "huile", quantite: 0.0333, unite: "L" },
    ];
    // 0.0333 * 450 = 14.985 -> 15
    expect(coutMatierePortion(fiche, prix).coutCts).toBe(15);
  });

  it("renvoie incomplet si la fiche technique est vide (plat sans fiche)", () => {
    expect(coutMatierePortion([], prix)).toEqual({
      coutCts: null,
      complet: false,
      ingredientsManquants: [],
    });
  });

  it("renvoie incomplet si un ingrédient n'a pas de prix connu", () => {
    const fiche: LigneFicheTechnique[] = [
      { ingredientId: "safran", quantite: 0.001, unite: "kg" },
    ];
    const resultat = coutMatierePortion(fiche, prix);
    expect(resultat.complet).toBe(false);
    expect(resultat.coutCts).toBeNull();
    expect(resultat.ingredientsManquants).toEqual(["safran"]);
  });

  it("renvoie incomplet si l'unité de la fiche ne correspond pas à l'unité de référence", () => {
    const fiche: LigneFicheTechnique[] = [
      { ingredientId: "beurre", quantite: 2, unite: "piece" },
    ];
    const resultat = coutMatierePortion(fiche, prix);
    expect(resultat.complet).toBe(false);
    expect(resultat.ingredientsManquants).toEqual(["beurre"]);
  });

  it("liste tous les ingrédients manquants, pas seulement le premier", () => {
    const fiche: LigneFicheTechnique[] = [
      { ingredientId: "safran", quantite: 0.001, unite: "kg" },
      { ingredientId: "truffe", quantite: 0.005, unite: "kg" },
    ];
    expect(coutMatierePortion(fiche, prix).ingredientsManquants).toEqual([
      "safran",
      "truffe",
    ]);
  });

  it("gère un coût matière nul (ingrédient gratuit ou quantité nulle)", () => {
    const fiche: LigneFicheTechnique[] = [
      { ingredientId: "beurre", quantite: 0, unite: "kg" },
    ];
    expect(coutMatierePortion(fiche, prix)).toEqual({
      coutCts: 0,
      complet: true,
      ingredientsManquants: [],
    });
  });
});

describe("margeBrutePct", () => {
  it("calcule une marge brute standard", () => {
    // vente HT 1000, coût 280 -> 72%
    expect(margeBrutePct(1000, 280)).toBe(72);
  });

  it("calcule une marge de 100% quand le coût matière est nul", () => {
    expect(margeBrutePct(1000, 0)).toBe(100);
  });

  it("renvoie une marge négative quand le coût dépasse le prix de vente", () => {
    expect(margeBrutePct(1000, 1500)).toBe(-50);
  });

  it("renvoie 0 en cas de division par zéro (prix de vente HT nul)", () => {
    expect(margeBrutePct(0, 280)).toBe(0);
  });

  it("renvoie 0 pour un prix de vente HT négatif", () => {
    expect(margeBrutePct(-100, 280)).toBe(0);
  });

  it("arrondit au dixième de point", () => {
    // (1000 - 333) / 1000 * 100 = 66.7
    expect(margeBrutePct(1000, 333)).toBe(66.7);
  });
});

describe("prixVenteHT", () => {
  it("calcule le prix HT avec une TVA à 10% (restauration sur place)", () => {
    // 1100 TTC / 1.10 = 1000
    expect(prixVenteHT(1100, 10)).toBe(1000);
  });

  it("calcule le prix HT avec une TVA à 20% (boissons alcoolisées)", () => {
    // 1200 TTC / 1.20 = 1000
    expect(prixVenteHT(1200, 20)).toBe(1000);
  });

  it("renvoie le même montant pour une TVA à 0%", () => {
    expect(prixVenteHT(1000, 0)).toBe(1000);
  });

  it("arrondit au centime le plus proche", () => {
    // 1000 / 1.10 = 909.0909... -> 909
    expect(prixVenteHT(1000, 10)).toBe(909);
  });

  it("renvoie 0 si le taux de TVA rend le diviseur nul ou négatif", () => {
    expect(prixVenteHT(1000, -100)).toBe(0);
    expect(prixVenteHT(1000, -150)).toBe(0);
  });
});

describe("coefficientMultiplicateur", () => {
  it("calcule un coefficient standard en restauration traditionnelle", () => {
    // 1000 TTC / 280 coût = 3.57 -> arrondi 3.6
    expect(coefficientMultiplicateur(1000, 280)).toBe(3.6);
  });

  it("calcule un coefficient élevé pour un liquide", () => {
    expect(coefficientMultiplicateur(800, 100)).toBe(8);
  });

  it("renvoie 0 quand le coût matière est nul (coefficient non défini)", () => {
    expect(coefficientMultiplicateur(1000, 0)).toBe(0);
  });

  it("renvoie 0 quand le coût matière est négatif", () => {
    expect(coefficientMultiplicateur(1000, -50)).toBe(0);
  });
});

describe("prixConseille", () => {
  it("calcule le prix conseillé pour une marge cible avec TVA à 10%", () => {
    // coût 280, marge cible 72% -> HT = 280 / 0.28 = 1000, TTC = 1100
    expect(prixConseille(280, 72, 10)).toBe(1100);
  });

  it("calcule le prix conseillé pour une marge cible avec TVA à 20%", () => {
    // coût 100, marge cible 87.5% -> HT = 100 / 0.125 = 800, TTC = 960
    expect(prixConseille(100, 87.5, 20)).toBe(960);
  });

  it("renvoie 0 si la marge cible est supérieure ou égale à 100%", () => {
    expect(prixConseille(280, 100, 10)).toBe(0);
    expect(prixConseille(280, 120, 10)).toBe(0);
  });

  it("renvoie 0 si la marge cible est négative", () => {
    expect(prixConseille(280, -10, 10)).toBe(0);
  });

  it("renvoie 0 quand le coût matière est nul, quelle que soit la marge cible", () => {
    expect(prixConseille(0, 72, 10)).toBe(0);
  });
});

describe("classerPlat", () => {
  const seuilMarge = 70;
  const seuilVolume = 50;

  it("classe une forte marge et un fort volume en étoile", () => {
    expect(classerPlat(80, 60, seuilMarge, seuilVolume)).toBe("etoile");
  });

  it("classe une faible marge et un fort volume en vache à lait", () => {
    expect(classerPlat(50, 60, seuilMarge, seuilVolume)).toBe("vache");
  });

  it("classe une forte marge et un faible volume en énigme", () => {
    expect(classerPlat(80, 20, seuilMarge, seuilVolume)).toBe("enigme");
  });

  it("classe une faible marge et un faible volume en poids mort", () => {
    expect(classerPlat(50, 20, seuilMarge, seuilVolume)).toBe("poids_mort");
  });

  it("traite une valeur exactement égale au seuil comme forte", () => {
    expect(classerPlat(seuilMarge, seuilVolume, seuilMarge, seuilVolume)).toBe(
      "etoile",
    );
  });
});
