import type { PeriodiciteContrat, StatutContrat } from "@/generated/prisma/enums";

/**
 * CONTRATS ET GARANTIES — logique pure (Phase 13).
 *
 * Deux frontières y sont tenues :
 *
 *  1. l'échéance d'un contrat se calcule à partir de la DERNIÈRE VISITE
 *     réelle, jamais de la date théorique. Sinon un contrat paraîtrait « à
 *     jour » sans qu'aucun technicien ne soit passé ;
 *  2. Plombéo ne QUALIFIE aucune garantie. Il compare des dates saisies, et
 *     n'en déduit ni la nature, ni l'étendue, ni les obligations
 *     [À VÉRIFIER — SOURCE OFFICIELLE ET CONSEIL JURIDIQUE].
 */

/* -------------------------------------------------------------------------- */
/* Contrats                                                                   */
/* -------------------------------------------------------------------------- */

export const MOIS_PAR_PERIODICITE: Record<PeriodiciteContrat, number> = {
  MENSUELLE: 1,
  TRIMESTRIELLE: 3,
  SEMESTRIELLE: 6,
  ANNUELLE: 12,
  BIENNALE: 24,
};

/**
 * Ajoute des mois à une date en respectant les fins de mois.
 *
 * `new Date(2026, 0, 31)` + 1 mois donnerait le 3 mars en arithmétique naïve,
 * février n'ayant pas de 31. On ramène au dernier jour du mois visé : un
 * contrat signé un 31 janvier revient le 28 février, pas le 3 mars.
 */
export function ajouterMois(date: Date, mois: number): Date {
  const jour = date.getDate();
  const cible = new Date(date.getFullYear(), date.getMonth() + mois, 1);
  const dernierJour = new Date(cible.getFullYear(), cible.getMonth() + 1, 0).getDate();
  cible.setDate(Math.min(jour, dernierJour));
  cible.setHours(date.getHours(), date.getMinutes(), 0, 0);
  return cible;
}

/**
 * Prochaine échéance d'un contrat, ou `null` s'il n'en produit aucune.
 *
 * Compte à partir de la dernière visite RÉELLE ; à défaut, du début du contrat.
 * Un contrat suspendu ou résilié ne produit rien : continuer à relancer sur un
 * contrat résilié la veille est le genre d'erreur qui coûte un client.
 */
export function prochaineEcheance(contrat: {
  statut: StatutContrat;
  periodicite: PeriodiciteContrat;
  debutLe: Date;
  finLe: Date | null;
  derniereVisiteLe: Date | null;
}): Date | null {
  if (contrat.statut !== "ACTIF") return null;

  const depart = contrat.derniereVisiteLe ?? contrat.debutLe;
  const echeance = ajouterMois(depart, MOIS_PAR_PERIODICITE[contrat.periodicite]);

  // Une échéance au-delà du terme n'a pas lieu d'être.
  if (contrat.finLe && echeance > contrat.finLe) return null;
  return echeance;
}

export type EtatEcheance = "A_VENIR" | "DUE" | "EN_RETARD" | "AUCUNE";

/** Position de l'échéance par rapport à aujourd'hui. */
export function etatEcheance(echeance: Date | null, maintenant: Date, prevenirJours = 30): EtatEcheance {
  if (!echeance) return "AUCUNE";
  const jours = Math.floor((echeance.getTime() - maintenant.getTime()) / (24 * 3600 * 1000));
  if (jours < 0) return "EN_RETARD";
  if (jours <= prevenirJours) return "DUE";
  return "A_VENIR";
}

/* -------------------------------------------------------------------------- */
/* Garanties                                                                  */
/* -------------------------------------------------------------------------- */

/** Fin de couverture : simple arithmétique de dates sur ce qui a été saisi. */
export function finGarantie(debutLe: Date, dureeMois: number): Date {
  return ajouterMois(debutLe, dureeMois);
}

/**
 * L'équipement est-il encore couvert ?
 *
 * Comparaison de dates, RIEN DE PLUS. Plombéo ne dit pas ce que la garantie
 * couvre, ni si elle s'applique au cas d'espèce : il dit qu'à cette date, la
 * période saisie n'est pas terminée. L'interface répète cette limite.
 */
export function encoreCouvert(
  garantie: { debutLe: Date; dureeMois: number },
  maintenant: Date,
): boolean {
  if (garantie.dureeMois <= 0) return false;
  if (maintenant < garantie.debutLe) return false;
  return maintenant < finGarantie(garantie.debutLe, garantie.dureeMois);
}

/**
 * Mention affichée à côté de tout état de garantie.
 *
 * Exportée pour qu'un test vérifie qu'elle accompagne systématiquement
 * l'affichage : c'est ce qui empêche « encore couvert » d'être lu comme un avis
 * juridique.
 */
export const RESERVE_GARANTIE =
  "Plombéo compare les dates que vous avez saisies. Il ne qualifie ni la nature ni " +
  "l'étendue de cette garantie : cela dépend du contrat, du produit et du droit " +
  "applicable.";
