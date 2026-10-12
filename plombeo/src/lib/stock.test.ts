import { describe, expect, it } from "vitest";
import {
  ecartComptage,
  etatStock,
  margeFourniture,
  margeTotale,
  seuilFranchi,
  stockCourant,
} from "@/lib/stock";

/**
 * STOCK ET MARGE (Phase 8).
 *
 * Le risque de cette phase n'est pas technique mais informationnel : un chiffre
 * faux affiché avec assurance est pire que pas de chiffre du tout. Ces tests
 * portent surtout sur les cas où Plombéo doit se TAIRE.
 */

describe("stock courant", () => {
  it("est la somme des mouvements", () => {
    expect(stockCourant([{ quantiteMilli: 5000 }, { quantiteMilli: -2000 }])).toBe(3000);
    expect(stockCourant([])).toBe(0);
  });

  /*
   * Un logiciel qui refuse de sortir une pièce que l'artisan a dans les mains
   * le pousse à lui mentir. Le négatif est un signal, pas une barrière.
   */
  it("accepte un stock négatif", () => {
    expect(stockCourant([{ quantiteMilli: 1000 }, { quantiteMilli: -3000 }])).toBe(-2000);
  });

  it("reste en arithmétique entière", () => {
    const total = stockCourant([{ quantiteMilli: 333 }, { quantiteMilli: 333 }, { quantiteMilli: 334 }]);
    expect(total).toBe(1000);
    expect(Number.isInteger(total)).toBe(true);
  });
});

describe("état du stock", () => {
  const suivi = { suiviStock: true, seuilAlerteMilli: 2000 };

  it("ne dit rien d'un article non suivi", () => {
    // Mieux vaut ne rien montrer qu'un chiffre auquel on ne peut pas se fier.
    expect(etatStock({ suiviStock: false, seuilAlerteMilli: 2000 }, -5000)).toBe("NON_SUIVI");
  });

  it("signale le négatif avant toute autre chose", () => {
    expect(etatStock(suivi, -1)).toBe("NEGATIF");
  });

  it("signale le passage sous le seuil, seuil inclus", () => {
    expect(etatStock(suivi, 2001)).toBe("NORMAL");
    expect(etatStock(suivi, 2000)).toBe("SOUS_SEUIL");
    expect(etatStock(suivi, 0)).toBe("SOUS_SEUIL");
  });

  it("traite un seuil à zéro comme « pas d'alerte », pas « alerte dès zéro »", () => {
    const sansSeuil = { suiviStock: true, seuilAlerteMilli: 0 };
    expect(etatStock(sansSeuil, 0)).toBe("NORMAL");
    expect(etatStock(sansSeuil, 5000)).toBe("NORMAL");
    // Le négatif reste signalé : c'est une anomalie, pas une alerte de seuil.
    expect(etatStock(sansSeuil, -1000)).toBe("NEGATIF");
  });
});

describe("franchissement de seuil", () => {
  const article = { suiviStock: true, seuilAlerteMilli: 2000 };

  /*
   * Rester sous le seuil n'est pas un événement ; le passer en est un. Sans
   * cette distinction, un article durablement en rupture produirait une alerte
   * à chaque balayage et l'artisan cesserait de les lire.
   */
  it("ne se déclenche qu'au passage", () => {
    expect(seuilFranchi(article, 3000, 1500)).toBe(true);
    // Déjà sous le seuil avant : rien de nouveau.
    expect(seuilFranchi(article, 1800, 1500)).toBe(false);
    // Remontée au-dessus : pas une alerte.
    expect(seuilFranchi(article, 1500, 3000)).toBe(false);
  });

  it("se déclenche en atteignant exactement le seuil", () => {
    expect(seuilFranchi(article, 2500, 2000)).toBe(true);
  });

  it("reste muet sans suivi ou sans seuil", () => {
    expect(seuilFranchi({ suiviStock: false, seuilAlerteMilli: 2000 }, 3000, 0)).toBe(false);
    expect(seuilFranchi({ suiviStock: true, seuilAlerteMilli: 0 }, 3000, 0)).toBe(false);
  });
});

describe("correction après comptage", () => {
  it("produit l'écart à enregistrer", () => {
    expect(ecartComptage(5000, 3000)).toBe(-2000);
    expect(ecartComptage(3000, 5000)).toBe(2000);
    expect(ecartComptage(3000, 3000)).toBe(0);
  });

  it("ramène un stock négatif à la quantité comptée", () => {
    expect(ecartComptage(-2000, 1000)).toBe(3000);
  });
});

describe("marge d'une fourniture", () => {
  it("se calcule quand les deux prix sont connus", () => {
    const marge = margeFourniture(10000, 6000);
    expect(marge).not.toBeNull();
    expect(marge!.margeCents).toBe(4000);
    expect(marge!.tauxCentiemes).toBe(4000); // 40 %
  });

  /*
   * LE cas à ne pas rater : sans prix d'achat, afficher « 100 % de marge »
   * donnerait à l'artisan l'information exactement inverse de la réalité.
   */
  it("ne dit rien quand le prix d'achat est inconnu", () => {
    expect(margeFourniture(10000, 0)).toBeNull();
    expect(margeFourniture(10000, -1)).toBeNull();
  });

  it("ne dit rien sans prix de vente", () => {
    expect(margeFourniture(0, 6000)).toBeNull();
  });

  it("rend une marge négative quand on vend à perte", () => {
    const marge = margeFourniture(5000, 8000);
    expect(marge!.margeCents).toBe(-3000);
    expect(marge!.tauxCentiemes).toBeLessThan(0);
  });
});

describe("marge d'un ensemble de lignes", () => {
  it("agrège les lignes dont le prix d'achat est connu", () => {
    const total = margeTotale([
      { quantiteMilli: 2000, prixUnitaireCents: 5000, prixAchatCents: 3000 },
      { quantiteMilli: 1000, prixUnitaireCents: 10000, prixAchatCents: 7000 },
    ]);
    expect(total.venteCents).toBe(20000);
    expect(total.achatCents).toBe(13000);
    expect(total.margeCents).toBe(7000);
    expect(total.lignesSansPrixAchat).toBe(0);
  });

  /*
   * Les lignes sans prix d'achat sont écartées ET comptées : les inclure à zéro
   * gonflerait la marge, les ignorer en silence laisserait croire que le total
   * couvre tout le devis.
   */
  it("écarte les lignes sans prix d'achat et le signale", () => {
    const total = margeTotale([
      { quantiteMilli: 1000, prixUnitaireCents: 10000, prixAchatCents: 6000 },
      { quantiteMilli: 1000, prixUnitaireCents: 50000, prixAchatCents: 0 },
    ]);
    expect(total.venteCents).toBe(10000);
    expect(total.margeCents).toBe(4000);
    expect(total.lignesSansPrixAchat).toBe(1);
    // Sans le filtre, la marge afficherait 54 000 sur 60 000, soit 90 %.
    expect(total.tauxCentiemes).toBe(4000);
  });

  it("ne divise jamais par zéro", () => {
    const total = margeTotale([{ quantiteMilli: 1000, prixUnitaireCents: 0, prixAchatCents: 0 }]);
    expect(total.tauxCentiemes).toBe(0);
    expect(Number.isFinite(total.tauxCentiemes)).toBe(true);
  });

  it("reste en centimes entiers sur des quantités fractionnaires", () => {
    const total = margeTotale([
      { quantiteMilli: 2500, prixUnitaireCents: 1333, prixAchatCents: 777 },
    ]);
    expect(Number.isInteger(total.venteCents)).toBe(true);
    expect(Number.isInteger(total.achatCents)).toBe(true);
    expect(total.venteCents).toBe(3333); // 2,5 × 13,33 € = 33,325 → 33,33 €
  });
});
