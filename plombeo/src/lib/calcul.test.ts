import { describe, expect, it } from "vitest";
import {
  arrondi,
  calculerTotaux,
  formaterTaux,
  repartirAuProrata,
  totalLigneHt,
  versCentimes,
  versMilliUnites,
  type Ligne,
} from "@/lib/calcul";

const TVA_20 = 2000;
const TVA_10 = 1000;
const TVA_5_5 = 550;

function ligne(prixCents: number, quantiteMilli = 1000, taux = TVA_20): Ligne {
  return { prixUnitaireCents: prixCents, quantiteMilli, tauxTvaCentiemes: taux };
}

describe("arrondi", () => {
  it("arrondit à mi-chemin vers le haut", () => {
    expect(arrondi(0.5)).toBe(1);
    expect(arrondi(1.5)).toBe(2);
    expect(arrondi(1.4)).toBe(1);
  });

  // Math.round(-0.5) vaut -0 en JavaScript, ce qui casserait la symétrie entre
  // une facture et son avoir.
  it("reste symétrique pour les montants négatifs", () => {
    expect(arrondi(-0.5)).toBe(-1);
    expect(arrondi(-1.5)).toBe(-2);
    expect(arrondi(-1.4)).toBe(-1);
  });
});

describe("totalLigneHt", () => {
  it("calcule une quantité entière", () => {
    expect(totalLigneHt(ligne(5000, 3000))).toBe(15000);
  });

  it("gère les quantités fractionnaires", () => {
    // 1,5 m à 12,00 € = 18,00 €
    expect(totalLigneHt(ligne(1200, 1500))).toBe(1800);
    // 0,25 h à 45,00 € = 11,25 €
    expect(totalLigneHt(ligne(4500, 250))).toBe(1125);
  });

  it("arrondit au centime", () => {
    // 0,333 × 10,00 € = 3,33 € (3,330 arrondi)
    expect(totalLigneHt(ligne(1000, 333))).toBe(333);
    // 1/3 de 10,01 € : 3,3333 -> 3,33
    expect(totalLigneHt(ligne(1001, 333))).toBe(333);
  });
});

describe("repartirAuProrata", () => {
  it("répartit sans perdre ni créer de centime", () => {
    const parts = repartirAuProrata(100, [1, 1, 1]);
    expect(parts.reduce((s, p) => s + p, 0)).toBe(100);
    // 33,33… : deux parts à 34 et une à 33, jamais 33/33/33.
    expect(parts.sort()).toEqual([33, 33, 34]);
  });

  it("respecte le poids relatif", () => {
    expect(repartirAuProrata(1000, [3, 1])).toEqual([750, 250]);
  });

  it("gère un poids nul", () => {
    expect(repartirAuProrata(100, [0, 0])).toEqual([0, 0]);
    expect(repartirAuProrata(0, [1, 1])).toEqual([0, 0]);
  });

  it("reste exact sur des montants négatifs", () => {
    const parts = repartirAuProrata(-100, [1, 1, 1]);
    expect(parts.reduce((s, p) => s + p, 0)).toBe(-100);
  });

  /*
   * Propriété centrale : quels que soient le montant et les poids, la somme des
   * parts vaut exactement le montant. C'est elle qui empêche la dérive de
   * centimes sur un devis à plusieurs taux et remise.
   */
  it("conserve la somme exacte sur de nombreux cas", () => {
    for (let montant = 0; montant <= 500; montant += 7) {
      for (const poids of [[1, 1], [1, 2, 3], [7, 11, 13, 17], [1, 1, 1, 1, 1, 1, 1]]) {
        const parts = repartirAuProrata(montant, poids);
        expect(parts.reduce((s, p) => s + p, 0)).toBe(montant);
      }
    }
  });
});

describe("calculerTotaux — cas simple", () => {
  it("calcule HT, TVA et TTC", () => {
    const t = calculerTotaux([ligne(10000)]);
    expect(t.totalHtCents).toBe(10000);
    expect(t.totalTvaCents).toBe(2000);
    expect(t.totalTtcCents).toBe(12000);
  });

  it("gère un devis vide", () => {
    const t = calculerTotaux([]);
    expect(t.totalHtCents).toBe(0);
    expect(t.totalTtcCents).toBe(0);
    expect(t.tvaParTaux).toEqual([]);
  });

  it("calcule un taux réduit non entier", () => {
    // 100,00 € à 5,5 % = 5,50 € de TVA
    const t = calculerTotaux([ligne(10000, 1000, TVA_5_5)]);
    expect(t.totalTvaCents).toBe(550);
    expect(t.totalTtcCents).toBe(10550);
  });
});

describe("calculerTotaux — multi-taux", () => {
  it("regroupe la TVA par taux, dans l'ordre d'apparition", () => {
    const t = calculerTotaux([
      ligne(10000, 1000, TVA_20),
      ligne(20000, 1000, TVA_10),
      ligne(5000, 1000, TVA_20),
    ]);
    expect(t.tvaParTaux.map((x) => x.tauxTvaCentiemes)).toEqual([TVA_20, TVA_10]);
    // 150,00 € à 20 % = 30,00 € ; 200,00 € à 10 % = 20,00 €
    expect(t.tvaParTaux[0]?.montantCents).toBe(3000);
    expect(t.tvaParTaux[1]?.montantCents).toBe(2000);
    expect(t.totalTvaCents).toBe(5000);
  });

  /*
   * Cœur du sujet : arrondir ligne à ligne produirait un écart avec le total.
   * Trois lignes à 3,33 € donnent 9,99 € HT, dont la TVA à 20 % est 2,00 €
   * (1,998 arrondi une fois) — et non 3 × 0,67 = 2,01 €.
   */
  it("arrondit la TVA une seule fois, sur la base agrégée", () => {
    const t = calculerTotaux([ligne(333), ligne(333), ligne(333)]);
    expect(t.totalHtCents).toBe(999);
    expect(t.totalTvaCents).toBe(200);
    expect(t.totalTtcCents).toBe(1199);
  });
});

describe("calculerTotaux — remise", () => {
  it("applique une remise en pour mille", () => {
    // 10 % de remise sur 100,00 €
    const t = calculerTotaux([ligne(10000)], 100);
    expect(t.remiseCents).toBe(1000);
    expect(t.totalHtCents).toBe(9000);
    expect(t.totalTvaCents).toBe(1800);
    expect(t.totalTtcCents).toBe(10800);
  });

  // Imputer toute la remise sur un seul taux fausserait la TVA due.
  it("répartit la remise au prorata entre les taux", () => {
    const t = calculerTotaux([ligne(10000, 1000, TVA_20), ligne(10000, 1000, TVA_10)], 100);
    expect(t.remiseCents).toBe(2000);
    // Chaque base perd 10,00 €
    expect(t.tvaParTaux[0]?.baseCents).toBe(9000);
    expect(t.tvaParTaux[1]?.baseCents).toBe(9000);
    expect(t.tvaParTaux[0]?.montantCents).toBe(1800);
    expect(t.tvaParTaux[1]?.montantCents).toBe(900);
  });

  it("ne perd aucun centime sur une remise indivisible", () => {
    const t = calculerTotaux(
      [ligne(3333, 1000, TVA_20), ligne(3333, 1000, TVA_10), ligne(3333, 1000, TVA_5_5)],
      333,
    );
    const sommeBases = t.tvaParTaux.reduce((s, x) => s + x.baseCents, 0);
    expect(sommeBases).toBe(t.totalHtCents);
  });
});

describe("calculerTotaux — acompte", () => {
  it("calcule un acompte de 30 %", () => {
    const t = calculerTotaux([ligne(100000)], 0, 300);
    expect(t.totalTtcCents).toBe(120000);
    expect(t.acompteCents).toBe(36000);
    expect(t.soldeCents).toBe(84000);
  });

  it("gère les bornes", () => {
    expect(calculerTotaux([ligne(10000)], 0, 0).acompteCents).toBe(0);
    const complet = calculerTotaux([ligne(10000)], 0, 1000);
    expect(complet.acompteCents).toBe(complet.totalTtcCents);
    expect(complet.soldeCents).toBe(0);
  });

  it("garde acompte + solde égal au total", () => {
    for (const pourMille of [0, 1, 137, 333, 500, 999, 1000]) {
      const t = calculerTotaux([ligne(12345), ligne(6789, 1500, TVA_10)], 77, pourMille);
      expect(t.acompteCents + t.soldeCents).toBe(t.totalTtcCents);
    }
  });
});

describe("cohérence globale", () => {
  /*
   * Invariant que tout devis doit respecter, quelle que soit sa composition :
   * total TTC = total HT + somme des TVA, et somme des bases par taux = total HT.
   * C'est ce qui empêche l'écart de centimes visible sur un document client.
   */
  it("ne dérive jamais, sur des combinaisons variées", () => {
    const jeux: Ligne[][] = [
      [ligne(1)],
      [ligne(99999, 7777, TVA_5_5)],
      [ligne(1234, 333, TVA_20), ligne(5678, 1250, TVA_10), ligne(9012, 999, TVA_5_5)],
      Array.from({ length: 25 }, (_, i) =>
        ligne(100 + i * 37, 1000 + i * 111, [TVA_20, TVA_10, TVA_5_5, 0][i % 4] ?? TVA_20),
      ),
    ];

    for (const lignes of jeux) {
      for (const remise of [0, 50, 137, 500]) {
        const t = calculerTotaux(lignes, remise);
        expect(t.totalHtCents).toBe(t.baseHtCents - t.remiseCents);
        expect(t.tvaParTaux.reduce((s, x) => s + x.baseCents, 0)).toBe(t.totalHtCents);
        expect(t.totalTtcCents).toBe(t.totalHtCents + t.totalTvaCents);
      }
    }
  });

  it("n'applique aucune TVA à un taux nul", () => {
    const t = calculerTotaux([ligne(10000, 1000, 0)]);
    expect(t.totalTvaCents).toBe(0);
    expect(t.totalTtcCents).toBe(10000);
  });
});

describe("conversions de saisie", () => {
  it("convertit des euros en centimes sans erreur de flottant", () => {
    expect(versCentimes("12,34")).toBe(1234);
    expect(versCentimes("0,01")).toBe(1);
    expect(versCentimes("1000")).toBe(100000);
    expect(versCentimes("12.34")).toBe(1234);
    expect(versCentimes("1 234,50")).toBe(123450);
    expect(versCentimes("")).toBe(0);
  });

  // `12.34 * 100` vaut 1233.9999999999998 : le passage par la chaîne l'évite.
  it("reste exact sur les valeurs pièges du flottant", () => {
    expect(versCentimes("12.34")).toBe(1234);
    expect(versCentimes("1.10")).toBe(110);
    expect(versCentimes("70.7")).toBe(7070);
  });

  it("refuse une saisie invalide", () => {
    expect(versCentimes("abc")).toBeNull();
    expect(versCentimes("12,345")).toBeNull();
    expect(versCentimes("12,,3")).toBeNull();
  });

  it("convertit les quantités en milli-unités", () => {
    expect(versMilliUnites("1")).toBe(1000);
    expect(versMilliUnites("1,5")).toBe(1500);
    expect(versMilliUnites("0,25")).toBe(250);
    expect(versMilliUnites("0,125")).toBe(125);
    expect(versMilliUnites("")).toBeNull();
    expect(versMilliUnites("-1")).toBeNull();
  });
});

describe("formaterTaux", () => {
  it("affiche les taux sans décimale superflue", () => {
    expect(formaterTaux(2000)).toBe("20 %");
    expect(formaterTaux(1000)).toBe("10 %");
    expect(formaterTaux(550)).toBe("5,5 %");
    expect(formaterTaux(0)).toBe("0 %");
  });
});
