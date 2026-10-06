import { describe, expect, it } from "vitest";
import { REGLE_AIDE_LANCEMENT as REGLE } from "@/data/demo";
import { evaluerAide, evaluerProfil, montantBareme, plafondBareme } from "./aide";
import { PROFIL_VIDE, type ProfilAcheteur } from "./domain";

const PROFIL_OK: ProfilAcheteur = { mre: true, possedeBienAuMaroc: false, aideDejaPercue: false, heritageEnCours: false };
const PROGRAMME_OK = { eligibleDispositif: true, confianceAide: "verifie" as const };
const JOUR = "2026-10-06";

describe("montantBareme", () => {
  it("applique chaque tranche, bornes incluses", () => {
    expect(montantBareme(250_000, REGLE)).toBe(100_000);
    expect(montantBareme(300_000, REGLE)).toBe(100_000);
    expect(montantBareme(300_001, REGLE)).toBe(70_000);
    expect(montantBareme(700_000, REGLE)).toBe(70_000);
    expect(montantBareme(700_001, REGLE)).toBe(0);
  });

  it("ne dépend pas de l'ordre des tranches en base", () => {
    const desordre = { ...REGLE, tranches: [...REGLE.tranches].reverse() };
    expect(montantBareme(280_000, desordre)).toBe(100_000);
    expect(plafondBareme(desordre)).toBe(700_000);
  });
});

describe("evaluerAide", () => {
  it("calcule le prix net pour un profil et un programme éligibles", () => {
    expect(evaluerAide(640_000, PROGRAMME_OK, PROFIL_OK, REGLE, JOUR)).toEqual({
      statut: "eligible",
      montant: 70_000,
      prixNet: 570_000,
      raisons: [],
    });
  });

  it("refuse un bien au-dessus du plafond", () => {
    const r = evaluerAide(1_150_000, PROGRAMME_OK, PROFIL_OK, REGLE, JOUR);
    expect(r.statut).toBe("non_eligible");
    expect(r.prixNet).toBe(1_150_000);
    expect(r.raisons).toContain("hors_plafond");
  });

  it("refuse si le programme est terminé", () => {
    const r = evaluerAide(500_000, PROGRAMME_OK, PROFIL_OK, { ...REGLE, dateFin: "2026-10-05" }, JOUR);
    expect(r.statut).toBe("non_eligible");
    expect(r.raisons).toEqual(["programme_termine"]);
  });

  it("refuse un acheteur qui possède déjà un bien ou a déjà reçu une aide", () => {
    expect(evaluerAide(500_000, PROGRAMME_OK, { ...PROFIL_OK, possedeBienAuMaroc: true }, REGLE, JOUR).raisons).toEqual(["possede_bien"]);
    expect(evaluerAide(500_000, PROGRAMME_OK, { ...PROFIL_OK, aideDejaPercue: true }, REGLE, JOUR).statut).toBe("non_eligible");
  });

  it("refuse un programme hors dispositif", () => {
    const r = evaluerAide(500_000, { eligibleDispositif: false, confianceAide: "verifie" }, PROFIL_OK, REGLE, JOUR);
    expect(r.raisons).toEqual(["programme_hors_dispositif"]);
  });

  it("garde l'aide estimée mais demande une vérification en cas de doute", () => {
    const r = evaluerAide(600_000, { eligibleDispositif: true, confianceAide: "declaratif" }, { ...PROFIL_OK, heritageEnCours: true }, REGLE, JOUR);
    expect(r.statut).toBe("a_verifier");
    expect(r.montant).toBe(70_000);
    expect(r.raisons).toEqual(["dispositif_non_confirme", "heritage_a_verifier"]);
  });

  it("demande de compléter le questionnaire tant qu'il est vide", () => {
    const r = evaluerAide(600_000, PROGRAMME_OK, PROFIL_VIDE, REGLE, JOUR);
    expect(r.statut).toBe("a_verifier");
    expect(r.raisons).toEqual(["profil_incomplet"]);
  });
});

describe("evaluerProfil", () => {
  it("résume l'éligibilité de la personne", () => {
    expect(evaluerProfil(PROFIL_OK)).toBe("eligible");
    expect(evaluerProfil(PROFIL_VIDE)).toBe("a_verifier");
    expect(evaluerProfil({ ...PROFIL_OK, heritageEnCours: true })).toBe("a_verifier");
    expect(evaluerProfil({ ...PROFIL_OK, possedeBienAuMaroc: true })).toBe("non_eligible");
  });
});
