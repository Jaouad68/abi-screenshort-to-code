import type { Confiance, StatutTf } from "./domain";

/**
 * Règles de sécurité foncière.
 *
 * Un programme n'est « sûr » que si son titre foncier (mère ou individuel)
 * est prouvé par un justificatif contrôlé depuis moins de 90 jours. Passé ce
 * délai, l'information redevient déclarative jusqu'à la prochaine vérification.
 */

export const VALIDITE_VERIFICATION_JOURS = 90;

export interface InfoFonciere {
  statutTf: StatutTf;
  confianceTf: Confiance;
  dateVerificationTf: string | null;
}

/** Nombre de jours entre deux dates AAAA-MM-JJ. */
export function joursEntre(debut: string, fin: string): number {
  return Math.round((Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${debut}T00:00:00Z`)) / 86_400_000);
}

/** Niveau de preuve réellement applicable aujourd'hui (une vérification expire). */
export function confianceEffective(p: InfoFonciere, aujourdHui: string): Confiance {
  if (p.confianceTf !== "verifie") return p.confianceTf;
  if (!p.dateVerificationTf) return "declaratif";
  return joursEntre(p.dateVerificationTf, aujourdHui) > VALIDITE_VERIFICATION_JOURS ? "declaratif" : "verifie";
}

export function aUnTitre(statut: StatutTf): boolean {
  return statut === "tf_individuel" || statut === "tf_mere";
}

/** Le programme passe le filtre « Titre foncier vérifié ». */
export function estFoncierSur(p: InfoFonciere, aujourdHui: string): boolean {
  return aUnTitre(p.statutTf) && confianceEffective(p, aujourdHui) === "verifie";
}

export type NiveauFoncier = "sur" | "declare" | "en_cours" | "risque";

/** Niveau utilisé pour la couleur des badges et des marqueurs de carte. */
export function niveauFoncier(p: InfoFonciere, aujourdHui: string): NiveauFoncier {
  if (p.statutTf === "non_communique") return "risque";
  if (p.statutTf === "en_cours") return "en_cours";
  return estFoncierSur(p, aujourdHui) ? "sur" : "declare";
}

/** Jours restants avant qu'une vérification n'expire (négatif si expirée). */
export function joursAvantReverification(p: InfoFonciere, aujourdHui: string): number | null {
  if (p.confianceTf !== "verifie" || !p.dateVerificationTf) return null;
  return VALIDITE_VERIFICATION_JOURS - joursEntre(p.dateVerificationTf, aujourdHui);
}
