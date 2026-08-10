import type {
  AppointmentStatut,
  InterventionStatut,
  LeadStatut,
} from "@/generated/prisma/enums";

/**
 * MACHINES À ÉTATS (§56).
 *
 * Les transitions sont déclarées ici, une fois, sous forme de données pures —
 * et non éparpillées dans les écrans. Deux raisons :
 *
 *  1. une transition interdite doit être *impossible*, pas seulement absente de
 *     l'interface : une Server Action est un point d'entrée réseau ;
 *  2. c'est testable exhaustivement, y compris les transitions interdites, ce
 *     qu'un enchaînement de `if` dispersés ne permet pas.
 */

const LEAD: Record<LeadStatut, readonly LeadStatut[]> = {
  // NOUVEAU -> CONVERTI est autorisé : planifier un rendez-vous depuis une
  // demande, c'est la qualifier de fait. Imposer un passage explicite par
  // QUALIFIE ajouterait un clic sans valeur, et faisait échouer la conversion
  // en silence (défaut relevé au parcours navigateur).
  NOUVEAU: ["QUALIFIE", "CONVERTI", "ABANDONNE"],
  QUALIFIE: ["CONVERTI", "ABANDONNE"],
  // États terminaux : une demande convertie ou abandonnée ne repart pas.
  CONVERTI: [],
  ABANDONNE: [],
};

const RENDEZ_VOUS: Record<AppointmentStatut, readonly AppointmentStatut[]> = {
  PLANIFIE: ["CONFIRME", "EN_COURS", "ANNULE"],
  CONFIRME: ["EN_COURS", "ANNULE"],
  EN_COURS: ["TERMINE", "ANNULE"],
  TERMINE: [],
  ANNULE: [],
};

const INTERVENTION: Record<InterventionStatut, readonly InterventionStatut[]> = {
  PLANIFIEE: ["EN_COURS", "ANNULEE"],
  EN_COURS: ["TERMINEE", "ANNULEE"],
  // TERMINEE -> CLOTUREE est la validation du compte rendu par l'artisan.
  // C'est cet état qui rendra l'intervention facturable (Phase 5).
  TERMINEE: ["CLOTUREE", "EN_COURS"],
  // Une intervention clôturée ne se rouvre pas : son compte rendu est la base
  // de la facturation. Une correction passera par un avoir (Phase 5), jamais
  // par une réécriture silencieuse (§14).
  CLOTUREE: [],
  ANNULEE: [],
};

export function transitionLeadAutorisee(de: LeadStatut, vers: LeadStatut): boolean {
  return LEAD[de].includes(vers);
}

export function transitionRendezVousAutorisee(
  de: AppointmentStatut,
  vers: AppointmentStatut,
): boolean {
  return RENDEZ_VOUS[de].includes(vers);
}

export function transitionInterventionAutorisee(
  de: InterventionStatut,
  vers: InterventionStatut,
): boolean {
  return INTERVENTION[de].includes(vers);
}

/** États depuis lesquels plus aucune transition n'est possible. */
export function estTerminal(
  machine: "lead" | "rendezVous" | "intervention",
  etat: string,
): boolean {
  const table: Record<string, readonly string[]> =
    machine === "lead" ? LEAD : machine === "rendezVous" ? RENDEZ_VOUS : INTERVENTION;
  const suivants = table[etat];
  return suivants !== undefined && suivants.length === 0;
}

/** Erreur levée par la couche métier quand une transition est refusée. */
export class TransitionInterdite extends Error {
  constructor(de: string, vers: string) {
    super(`Transition interdite : ${de} → ${vers}`);
    this.name = "TransitionInterdite";
  }
}
