import type { Confiance, ProfilAcheteur, RegleAide } from "./domain";

/**
 * Moteur d'éligibilité à l'aide directe au logement.
 *
 * Le résultat reste une estimation : la décision finale appartient à
 * l'administration. Les montants viennent du barème stocké en base, jamais
 * du code.
 */

export type StatutAide = "eligible" | "a_verifier" | "non_eligible";

export type RaisonAide =
  | "hors_plafond"
  | "programme_hors_dispositif"
  | "dispositif_non_confirme"
  | "programme_termine"
  | "possede_bien"
  | "aide_deja_percue"
  | "non_mre_non_renseigne"
  | "profil_incomplet"
  | "heritage_a_verifier";

export interface ResultatAide {
  statut: StatutAide;
  /** Montant estimé de l'aide, 0 si non éligible. */
  montant: number;
  /** Prix après déduction de l'aide estimée. */
  prixNet: number;
  raisons: RaisonAide[];
}

export interface ProgrammeAide {
  eligibleDispositif: boolean;
  confianceAide: Confiance;
}

/** Montant prévu par le barème pour ce prix, 0 au-dessus du dernier plafond. */
export function montantBareme(prixTtc: number, regle: RegleAide): number {
  const tranches = [...regle.tranches].sort((a, b) => a.prixMax - b.prixMax);
  return tranches.find((t) => prixTtc <= t.prixMax)?.aide ?? 0;
}

export function plafondBareme(regle: RegleAide): number {
  return Math.max(0, ...regle.tranches.map((t) => t.prixMax));
}

export function evaluerAide(
  prixTtc: number,
  programme: ProgrammeAide,
  profil: ProfilAcheteur,
  regle: RegleAide,
  aujourdHui: string,
): ResultatAide {
  const bloquantes: RaisonAide[] = [];
  const douteuses: RaisonAide[] = [];

  const montant = montantBareme(prixTtc, regle);
  if (montant === 0) bloquantes.push("hors_plafond");
  if (regle.dateFin && aujourdHui > regle.dateFin) bloquantes.push("programme_termine");

  if (!programme.eligibleDispositif) bloquantes.push("programme_hors_dispositif");
  else if (programme.confianceAide !== "verifie") douteuses.push("dispositif_non_confirme");

  if (profil.possedeBienAuMaroc === true) bloquantes.push("possede_bien");
  if (profil.aideDejaPercue === true) bloquantes.push("aide_deja_percue");
  if (profil.mre === false) douteuses.push("non_mre_non_renseigne");
  if (profil.possedeBienAuMaroc === null || profil.aideDejaPercue === null) douteuses.push("profil_incomplet");
  if (profil.heritageEnCours === true) douteuses.push("heritage_a_verifier");

  if (bloquantes.length > 0) {
    return { statut: "non_eligible", montant: 0, prixNet: prixTtc, raisons: bloquantes };
  }
  return {
    statut: douteuses.length > 0 ? "a_verifier" : "eligible",
    montant,
    prixNet: prixTtc - montant,
    raisons: douteuses,
  };
}

/** Éligibilité de la personne seule, indépendamment d'un bien précis. */
export function evaluerProfil(profil: ProfilAcheteur): StatutAide {
  if (profil.possedeBienAuMaroc === true || profil.aideDejaPercue === true) return "non_eligible";
  if (profil.possedeBienAuMaroc === null || profil.aideDejaPercue === null) return "a_verifier";
  if (profil.heritageEnCours === true) return "a_verifier";
  return "eligible";
}
