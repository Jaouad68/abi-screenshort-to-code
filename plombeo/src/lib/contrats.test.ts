import { describe, expect, it } from "vitest";
import {
  RESERVE_GARANTIE,
  ajouterMois,
  encoreCouvert,
  etatEcheance,
  finGarantie,
  prochaineEcheance,
} from "@/lib/contrats";

/**
 * CONTRATS ET GARANTIES (Phase 13).
 *
 * Deux risques : une échéance qui avance sans visite réelle, et une garantie
 * que Plombéo qualifierait à la place du droit.
 */

describe("arithmétique des mois", () => {
  /*
   * `new Date(2026, 0, 31)` + 1 mois donnerait le 3 mars en arithmétique
   * naïve : février n'a pas de 31. Un contrat signé un 31 janvier doit revenir
   * le 28 février.
   */
  it("respecte les fins de mois", () => {
    const resultat = ajouterMois(new Date(2026, 0, 31), 1);
    expect(resultat.getMonth()).toBe(1);
    expect(resultat.getDate()).toBe(28);
  });

  it("gère le 29 février d'une année bissextile", () => {
    // 2028 est bissextile.
    const resultat = ajouterMois(new Date(2028, 0, 31), 1);
    expect(resultat.getDate()).toBe(29);
  });

  it("traverse les années", () => {
    const resultat = ajouterMois(new Date(2026, 10, 15), 3);
    expect(resultat.getFullYear()).toBe(2027);
    expect(resultat.getMonth()).toBe(1);
  });
});

describe("prochaine échéance d'un contrat", () => {
  const base = {
    statut: "ACTIF" as const,
    periodicite: "ANNUELLE" as const,
    debutLe: new Date(2026, 2, 15),
    finLe: null as Date | null,
    derniereVisiteLe: null as Date | null,
  };

  it("part du début du contrat tant qu'aucune visite n'a eu lieu", () => {
    const e = prochaineEcheance(base);
    expect(e?.getFullYear()).toBe(2027);
    expect(e?.getMonth()).toBe(2);
  });

  /*
   * LE point de la phase : l'échéance compte à partir de la visite RÉELLE. La
   * faire partir de la date théorique produirait un contrat « à jour » sans
   * qu'aucun technicien ne soit passé.
   */
  it("part de la dernière visite réelle, pas de la date théorique", () => {
    // Visite faite en retard, en juin au lieu de mars.
    const e = prochaineEcheance({ ...base, derniereVisiteLe: new Date(2026, 5, 20) });
    expect(e?.getFullYear()).toBe(2027);
    expect(e?.getMonth()).toBe(5); // juin, décalé comme la visite
  });

  it("respecte la périodicité", () => {
    expect(prochaineEcheance({ ...base, periodicite: "TRIMESTRIELLE" })?.getMonth()).toBe(5);
    expect(prochaineEcheance({ ...base, periodicite: "MENSUELLE" })?.getMonth()).toBe(3);
    expect(prochaineEcheance({ ...base, periodicite: "BIENNALE" })?.getFullYear()).toBe(2028);
  });

  /*
   * Continuer à relancer sur un contrat résilié la veille est le genre
   * d'erreur qui coûte un client.
   */
  it("ne produit aucune échéance si le contrat n'est pas actif", () => {
    expect(prochaineEcheance({ ...base, statut: "SUSPENDU" })).toBeNull();
    expect(prochaineEcheance({ ...base, statut: "RESILIE" })).toBeNull();
  });

  it("ne produit aucune échéance au-delà du terme", () => {
    expect(prochaineEcheance({ ...base, finLe: new Date(2026, 11, 31) })).toBeNull();
    expect(prochaineEcheance({ ...base, finLe: new Date(2028, 0, 1) })).not.toBeNull();
  });
});

describe("état d'une échéance", () => {
  const maintenant = new Date(2026, 7, 10);

  it("distingue à venir, due et en retard", () => {
    expect(etatEcheance(new Date(2026, 11, 1), maintenant)).toBe("A_VENIR");
    expect(etatEcheance(new Date(2026, 7, 25), maintenant)).toBe("DUE");
    expect(etatEcheance(new Date(2026, 6, 1), maintenant)).toBe("EN_RETARD");
    expect(etatEcheance(null, maintenant)).toBe("AUCUNE");
  });
});

describe("garanties", () => {
  it("calcule la fin de couverture", () => {
    const fin = finGarantie(new Date(2026, 2, 15), 24);
    expect(fin.getFullYear()).toBe(2028);
    expect(fin.getMonth()).toBe(2);
  });

  it("compare les dates, bornes comprises", () => {
    const g = { debutLe: new Date(2026, 0, 1), dureeMois: 12 };
    expect(encoreCouvert(g, new Date(2026, 6, 1))).toBe(true);
    expect(encoreCouvert(g, new Date(2026, 0, 1))).toBe(true);
    // Le jour de la fin, la période est terminée.
    expect(encoreCouvert(g, new Date(2027, 0, 1))).toBe(false);
    // Avant le début : pas encore couvert.
    expect(encoreCouvert(g, new Date(2025, 11, 1))).toBe(false);
  });

  /*
   * Aucune durée par défaut : une durée à zéro ne devient jamais « 2 ans » ou
   * « 10 ans ». Suggérer une durée serait déjà un conseil juridique.
   */
  it("ne devine aucune durée", () => {
    expect(encoreCouvert({ debutLe: new Date(2026, 0, 1), dureeMois: 0 }, new Date(2026, 6, 1))).toBe(false);
  });

  /*
   * La réserve accompagne tout affichage d'état : c'est elle qui empêche
   * « encore couvert » d'être lu comme un avis juridique.
   */
  it("porte une réserve explicite sur ce que Plombéo ne dit pas", () => {
    expect(RESERVE_GARANTIE).toMatch(/ne qualifie/i);
    expect(RESERVE_GARANTIE).toMatch(/nature/i);
    expect(RESERVE_GARANTIE).toMatch(/droit applicable/i);
  });
});
