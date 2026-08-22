import { describe, expect, it } from "vitest";
import {
  anneeDe,
  celluleCsv,
  evolution,
  ligneCsv,
  moisDe,
  moisPrecedent,
  montantCsv,
  rentabiliteChantier,
} from "@/lib/pilotage";

/**
 * PILOTAGE (Phase 9).
 *
 * Le risque de cette phase est la crédibilité : ces tests portent d'abord sur
 * les cas où Plombéo doit REFUSER de produire un chiffre.
 */

describe("bornes de période", () => {
  it("borne un mois du 1er inclus au 1er suivant exclu", () => {
    const p = moisDe(new Date(2026, 7, 15, 14, 30));
    expect(p.debut.getTime()).toBe(new Date(2026, 7, 1).getTime());
    expect(p.fin.getTime()).toBe(new Date(2026, 8, 1).getTime());
    expect(p.libelle).toBe("août 2026");
  });

  /*
   * L'erreur classique des comparaisons de périodes : une facture datée du 1er
   * à 00:00 comptée dans deux mois à la fois.
   */
  it("n'empiète pas sur le mois suivant", () => {
    const aout = moisDe(new Date(2026, 7, 10));
    const premierSeptembre = new Date(2026, 8, 1, 0, 0, 0, 0);
    expect(premierSeptembre >= aout.fin).toBe(true);

    const septembre = moisDe(premierSeptembre);
    expect(septembre.debut.getTime()).toBe(aout.fin.getTime());
  });

  it("recule d'un mois, y compris à travers un changement d'année", () => {
    expect(moisPrecedent(moisDe(new Date(2026, 0, 15))).libelle).toBe("décembre 2025");
    expect(moisPrecedent(moisDe(new Date(2026, 7, 15))).libelle).toBe("juillet 2026");
  });

  it("borne une année civile", () => {
    const a = anneeDe(new Date(2026, 5, 5));
    expect(a.debut.getTime()).toBe(new Date(2026, 0, 1).getTime());
    expect(a.fin.getTime()).toBe(new Date(2027, 0, 1).getTime());
  });
});

describe("évolution entre deux périodes", () => {
  it("calcule l'écart et le taux", () => {
    const e = evolution(12000, 10000);
    expect(e.ecartCents).toBe(2000);
    expect(e.tauxCentiemes).toBe(2000); // +20 %
  });

  it("gère une baisse", () => {
    const e = evolution(8000, 10000);
    expect(e.ecartCents).toBe(-2000);
    expect(e.tauxCentiemes).toBe(-2000);
  });

  /*
   * « +100 % » depuis rien n'a aucun sens et donnerait une impression de
   * performance sans contenu.
   */
  it("ne produit aucun taux depuis une base nulle", () => {
    const e = evolution(5000, 0);
    expect(e.ecartCents).toBe(5000);
    expect(e.tauxCentiemes).toBeNull();
  });
});

describe("rentabilité d'un chantier", () => {
  const base = {
    produitCents: 100000,
    minutes: 120,
    coutHoraireCents: 4500,
    fournitures: [{ quantiteMilli: 2000, prixAchatCents: 3000 }],
  };

  it("se calcule quand tout est connu", () => {
    const r = rentabiliteChantier(base);
    expect(r.calculable).toBe(true);
    if (!r.calculable) return;
    expect(r.rentabilite.coutFournituresCents).toBe(6000); // 2 × 30,00 €
    expect(r.rentabilite.coutMainOeuvreCents).toBe(9000); // 2 h × 45,00 €
    expect(r.rentabilite.resultatCents).toBe(85000);
    expect(r.rentabilite.tauxCentiemes).toBe(8500); // 85 %
  });

  /*
   * LA décision de la phase : sans coût horaire saisi, on ne calcule pas. Une
   * valeur par défaut produirait des chiffres crédibles et faux.
   */
  it("refuse tant que le coût horaire n'est pas saisi", () => {
    const r = rentabiliteChantier({ ...base, coutHoraireCents: 0 });
    expect(r.calculable).toBe(false);
    if (r.calculable) return;
    expect(r.obstacle).toBe("COUT_HORAIRE_INCONNU");
  });

  it("refuse si une seule fourniture n'a pas de prix d'achat", () => {
    const r = rentabiliteChantier({
      ...base,
      fournitures: [
        { quantiteMilli: 1000, prixAchatCents: 3000 },
        { quantiteMilli: 1000, prixAchatCents: 0 },
      ],
    });
    expect(r.calculable).toBe(false);
    if (r.calculable) return;
    expect(r.obstacle).toBe("FOURNITURE_SANS_PRIX_ACHAT");
  });

  it("refuse un chantier non facturé", () => {
    const r = rentabiliteChantier({ ...base, produitCents: 0 });
    expect(r.calculable).toBe(false);
    if (r.calculable) return;
    expect(r.obstacle).toBe("AUCUN_PRODUIT");
  });

  it("accepte un chantier sans fourniture", () => {
    const r = rentabiliteChantier({ ...base, fournitures: [] });
    expect(r.calculable).toBe(true);
    if (!r.calculable) return;
    expect(r.rentabilite.coutFournituresCents).toBe(0);
  });

  it("rend un résultat négatif quand le chantier coûte plus qu'il ne rapporte", () => {
    const r = rentabiliteChantier({ ...base, produitCents: 5000 });
    expect(r.calculable).toBe(true);
    if (!r.calculable) return;
    expect(r.rentabilite.resultatCents).toBeLessThan(0);
  });

  it("reste en centimes entiers", () => {
    const r = rentabiliteChantier({ ...base, minutes: 37, coutHoraireCents: 4237 });
    if (!r.calculable) throw new Error("devrait être calculable");
    expect(Number.isInteger(r.rentabilite.coutMainOeuvreCents)).toBe(true);
    expect(Number.isInteger(r.rentabilite.resultatCents)).toBe(true);
  });
});

describe("export comptable", () => {
  it("échappe les guillemets et le séparateur", () => {
    expect(celluleCsv('Dupont "Plomberie"')).toBe('"Dupont ""Plomberie"""');
    expect(celluleCsv("Lyon;Rhône")).toBe('"Lyon;Rhône"');
  });

  /*
   * Injection de formule : une cellule commençant par `=` est exécutée par les
   * tableurs. Même protection que l'export CRM de la Phase 2.
   */
  it("neutralise les formules de tableur", () => {
    for (const dangereux of ["=1+1", "+cmd", "-2", "@SUM(A1)"]) {
      expect(celluleCsv(dangereux).startsWith("\"'")).toBe(true);
    }
  });

  it("assemble une ligne au point-virgule", () => {
    expect(ligneCsv(["a", "b"])).toBe('"a";"b"');
  });

  it("écrit les montants en décimale française", () => {
    expect(montantCsv(180000)).toBe("1800,00");
    expect(montantCsv(5)).toBe("0,05");
    expect(montantCsv(0)).toBe("0,00");
    expect(montantCsv(-2550)).toBe("-25,50");
  });
});
