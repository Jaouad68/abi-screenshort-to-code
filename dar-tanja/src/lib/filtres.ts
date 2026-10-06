import { evaluerAide, type ResultatAide } from "./aide";
import type { Catalogue, Lot, ProfilAcheteur, Programme, Promoteur, VueMer } from "./domain";
import { estFoncierSur } from "./foncier";

/**
 * Recherche instantanée : tout le catalogue est en mémoire et filtré ici,
 * en quelques millisecondes, à chaque changement de critère.
 */

export type Tri = "prix_net" | "prix_m2" | "livraison" | "surface";

export interface Criteres {
  texte: string;
  /** Prix net maximal (après aide), en MAD. null = pas de limite. */
  prixNetMax: number | null;
  chambresMin: number;
  surfaceMin: number;
  quartiers: string[];
  vueMerMin: VueMer;
  ascenseur: boolean;
  parking: boolean;
  /** Livraison au plus tard (AAAA-MM-JJ), les biens livrés passent toujours. */
  livraisonAvant: string | null;
  /** Filtre de sécurité : titre foncier vérifié. Actif par défaut. */
  foncierSur: boolean;
  /** Filtre : aide de l'État estimée possible. Actif par défaut. */
  aideEligible: boolean;
  tri: Tri;
}

export const CRITERES_DEFAUT: Criteres = {
  texte: "",
  prixNetMax: null,
  chambresMin: 0,
  surfaceMin: 0,
  quartiers: [],
  vueMerMin: "aucune",
  ascenseur: false,
  parking: false,
  livraisonAvant: null,
  foncierSur: true,
  aideEligible: true,
  tri: "prix_net",
};

const RANG_VUE: Record<VueMer, number> = { aucune: 0, partielle: 1, degagee: 2 };

export interface LotEvalue {
  lot: Lot;
  aide: ResultatAide;
  prixM2: number;
}

export interface Resultat {
  programme: Programme;
  promoteur: Promoteur | undefined;
  /** Lots disponibles qui correspondent aux critères, du moins cher au plus cher (prix net). */
  lots: LotEvalue[];
  meilleur: LotEvalue;
}

/** Retire les accents et la casse pour une recherche tolérante. */
export function normaliser(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function evaluerLot(lot: Lot, programme: Programme, profil: ProfilAcheteur, catalogue: Catalogue, aujourdHui: string): LotEvalue {
  return {
    lot,
    aide: evaluerAide(lot.prixTtc, programme, profil, catalogue.regle, aujourdHui),
    prixM2: Math.round(lot.prixTtc / lot.surface),
  };
}

function lotPasse(e: LotEvalue, c: Criteres): boolean {
  const { lot } = e;
  if (!lot.disponible) return false;
  if (lot.chambres < c.chambresMin) return false;
  if (lot.surface < c.surfaceMin) return false;
  if (RANG_VUE[lot.vueMer] < RANG_VUE[c.vueMerMin]) return false;
  // Un rez-de-chaussée se passe d'ascenseur.
  if (c.ascenseur && !lot.ascenseur && lot.etage > 0) return false;
  if (c.parking && !lot.parking) return false;
  if (c.aideEligible && e.aide.statut === "non_eligible") return false;
  if (c.prixNetMax !== null && e.aide.prixNet > c.prixNetMax) return false;
  return true;
}

export function rechercher(
  catalogue: Catalogue,
  c: Criteres,
  profil: ProfilAcheteur,
  aujourdHui: string,
): Resultat[] {
  const promoteurs = new Map(catalogue.promoteurs.map((p) => [p.id, p]));
  const lotsParProgramme = new Map<string, Lot[]>();
  for (const l of catalogue.lots) {
    const liste = lotsParProgramme.get(l.programmeId);
    if (liste) liste.push(l);
    else lotsParProgramme.set(l.programmeId, [l]);
  }
  const texte = normaliser(c.texte);

  const resultats: Resultat[] = [];
  for (const programme of catalogue.programmes) {
    if (c.foncierSur && !estFoncierSur(programme, aujourdHui)) continue;
    if (c.quartiers.length > 0 && !c.quartiers.includes(programme.quartier)) continue;
    if (c.livraisonAvant && !programme.livre && (!programme.livraisonPrevue || programme.livraisonPrevue > c.livraisonAvant)) continue;
    const promoteur = promoteurs.get(programme.promoteurId);
    if (texte) {
      const cible = normaliser(`${programme.nom} ${programme.quartier} ${programme.adresse} ${promoteur?.nom ?? ""}`);
      if (!texte.split(/\s+/).every((mot) => cible.includes(mot))) continue;
    }
    const lots = (lotsParProgramme.get(programme.id) ?? [])
      .map((l) => evaluerLot(l, programme, profil, catalogue, aujourdHui))
      .filter((e) => lotPasse(e, c))
      .sort((a, b) => a.aide.prixNet - b.aide.prixNet);
    if (lots.length === 0) continue;
    resultats.push({ programme, promoteur, lots, meilleur: lots[0] });
  }

  const livraison = (r: Resultat) => (r.programme.livre ? "0000" : (r.programme.livraisonPrevue ?? "9999"));
  const comparateurs: Record<Tri, (a: Resultat, b: Resultat) => number> = {
    prix_net: (a, b) => a.meilleur.aide.prixNet - b.meilleur.aide.prixNet,
    prix_m2: (a, b) => a.meilleur.prixM2 - b.meilleur.prixM2,
    livraison: (a, b) => livraison(a).localeCompare(livraison(b)),
    surface: (a, b) => b.meilleur.lot.surface - a.meilleur.lot.surface,
  };
  return resultats.sort((a, b) => comparateurs[c.tri](a, b) || a.programme.nom.localeCompare(b.programme.nom));
}

/** Biens écartés parce qu'ils dépassent le plafond de l'aide, affichés à part avec leur surcoût. */
export function horsPlafond(
  catalogue: Catalogue,
  c: Criteres,
  profil: ProfilAcheteur,
  aujourdHui: string,
): Resultat[] {
  if (!c.aideEligible) return [];
  const sansAide = rechercher(catalogue, { ...c, aideEligible: false }, profil, aujourdHui);
  return sansAide
    .map((r) => ({ ...r, lots: r.lots.filter((e) => e.aide.raisons.includes("hors_plafond")) }))
    .filter((r) => r.lots.length > 0)
    .map((r) => ({ ...r, meilleur: r.lots[0] }));
}

export function quartiersDisponibles(catalogue: Catalogue): string[] {
  return [...new Set(catalogue.programmes.map((p) => p.quartier))].sort((a, b) => a.localeCompare(b, "fr"));
}
