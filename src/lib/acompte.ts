import type { ReglagesAcompte } from "@/lib/horaires";

export type ReputationClient = {
  noShowCount: number;
  honoredCount: number;
};

/**
 * README §7.2: a deposit is required once a client has missed at least
 * `seuilNoShow` appointments — unless they've since earned a second chance by
 * honoring `seuilPardon` appointments (the "pardon" rule).
 */
export function acompteRequis(client: ReputationClient, reglages: ReglagesAcompte): boolean {
  return client.noShowCount >= reglages.seuilNoShow && client.honoredCount < reglages.seuilPardon;
}

/** Computes the deposit amount (in cents) for a service price, per the salon's settings. */
export function montantAcompteCents(reglages: ReglagesAcompte, prixCents: number): number {
  if (reglages.montantType === "fixe") {
    return Math.round(reglages.valeur * 100);
  }
  return Math.round((prixCents * reglages.valeur) / 100);
}

/** A cancellation this close to the appointment forfeits the deposit rather than refunding it. */
export const HEURES_ANNULATION_TARDIVE = 48;

export function estAnnulationTardive(debutAt: Date, maintenant: Date = new Date()): boolean {
  const heuresRestantes = (debutAt.getTime() - maintenant.getTime()) / (1000 * 60 * 60);
  return heuresRestantes < HEURES_ANNULATION_TARDIVE;
}
