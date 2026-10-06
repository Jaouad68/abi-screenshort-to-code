import { describe, expect, it } from "vitest";
import { catalogueDemo } from "@/data/demo";
import type { ProfilAcheteur } from "./domain";
import { CRITERES_DEFAUT, horsPlafond, normaliser, quartiersDisponibles, rechercher } from "./filtres";
import { estimerFrais } from "./frais";

const JOUR = "2026-10-06";
const CATALOGUE = catalogueDemo(new Date("2026-10-06T08:00:00Z"));
const PROFIL: ProfilAcheteur = { mre: true, possedeBienAuMaroc: false, aideDejaPercue: false, heritageEnCours: false };
const ids = (r: { programme: { id: string } }[]) => r.map((x) => x.programme.id);

describe("rechercher", () => {
  it("masque par défaut les biens sans titre foncier vérifié ou sans aide possible", () => {
    const r = ids(rechercher(CATALOGUE, CRITERES_DEFAUT, PROFIL, JOUR));
    expect(r).not.toContain("cap-spartel-hills"); // titre non communiqué
    expect(r).not.toContain("tanja-balia-view"); // immatriculation en cours
    expect(r).not.toContain("residence-mesnana"); // vérification de plus de 90 jours
    expect(r).not.toContain("corniche-malabata"); // hors plafond et hors dispositif
    expect(r).toContain("al-bahr");
  });

  it("trie par prix net croissant et calcule l'aide de chaque lot", () => {
    const r = rechercher(CATALOGUE, CRITERES_DEFAUT, PROFIL, JOUR);
    const prix = r.map((x) => x.meilleur.aide.prixNet);
    expect(prix).toEqual([...prix].sort((a, b) => a - b));
    const alBahr = r.find((x) => x.programme.id === "al-bahr")!;
    expect(alBahr.lots.map((l) => l.aide.prixNet)).toEqual([470_000, 570_000, 625_000]);
  });

  it("garde un lot hors plafond hors de la liste quand l'aide est exigée", () => {
    const achakar = rechercher(CATALOGUE, CRITERES_DEFAUT, PROFIL, JOUR).find((x) => x.programme.id === "jardins-achakar")!;
    expect(achakar.lots.map((l) => l.lot.prixTtc)).toEqual([690_000]);
  });

  it("affiche tout quand les filtres de sécurité sont coupés", () => {
    const r = rechercher(CATALOGUE, { ...CRITERES_DEFAUT, foncierSur: false, aideEligible: false }, PROFIL, JOUR);
    expect(r).toHaveLength(CATALOGUE.programmes.length);
  });

  it("combine les critères du bien", () => {
    const r = rechercher(
      CATALOGUE,
      { ...CRITERES_DEFAUT, chambresMin: 3, vueMerMin: "partielle", foncierSur: false, aideEligible: false },
      PROFIL,
      JOUR,
    );
    for (const x of r) for (const l of x.lots) {
      expect(l.lot.chambres).toBeGreaterThanOrEqual(3);
      expect(l.lot.vueMer).not.toBe("aucune");
    }
    expect(ids(r).sort()).toEqual(["al-bahr", "corniche-malabata", "jardins-achakar", "terrasses-marshan"]);
  });

  it("filtre sur le prix net, la livraison et le texte sans accents", () => {
    expect(ids(rechercher(CATALOGUE, { ...CRITERES_DEFAUT, prixNetMax: 480_000 }, PROFIL, JOUR)).sort()).toEqual(["al-bahr", "branes-horizon"]);
    const livres = rechercher(CATALOGUE, { ...CRITERES_DEFAUT, livraisonAvant: "2026-12-31" }, PROFIL, JOUR);
    expect(livres.every((x) => x.programme.livre)).toBe(true);
    expect(ids(rechercher(CATALOGUE, { ...CRITERES_DEFAUT, texte: "TERRASSES marshan" }, PROFIL, JOUR))).toEqual(["terrasses-marshan"]);
    expect(normaliser("Résidence Iberia")).toBe("residence iberia");
  });

  it("retire l'aide à un acheteur qui possède déjà un bien", () => {
    const r = rechercher(CATALOGUE, CRITERES_DEFAUT, { ...PROFIL, possedeBienAuMaroc: true }, JOUR);
    expect(r).toEqual([]);
  });
});

describe("horsPlafond", () => {
  it("liste à part les biens écartés à cause du plafond", () => {
    const r = horsPlafond(CATALOGUE, CRITERES_DEFAUT, PROFIL, JOUR);
    expect(ids(r).sort()).toEqual(["corniche-malabata", "jardins-achakar", "terrasses-marshan"]);
    expect(r.every((x) => x.lots.every((l) => l.lot.prixTtc > 700_000))).toBe(true);
  });
});

describe("divers", () => {
  it("liste les quartiers sans doublon", () => {
    const q = quartiersDisponibles(CATALOGUE);
    expect(new Set(q).size).toBe(q.length);
    expect(q).toContain("Malabata");
  });

  it("estime les frais d'acquisition", () => {
    expect(estimerFrais(640_000)).toEqual({ enregistrement: 25_600, conservation: 9_800, notaire: 7_040, divers: 1_500, total: 43_940 });
  });
});
