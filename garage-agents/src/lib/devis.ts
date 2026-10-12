const JOUR_MS = 24 * 60 * 60 * 1000;

/** Nombre de jours pleins écoulés depuis une date. */
export function joursEcoules(depuis: Date, aujourdHui: Date): number {
  const debut = Date.UTC(depuis.getUTCFullYear(), depuis.getUTCMonth(), depuis.getUTCDate());
  const fin = Date.UTC(
    aujourdHui.getUTCFullYear(),
    aujourdHui.getUTCMonth(),
    aujourdHui.getUTCDate()
  );
  return Math.max(0, Math.round((fin - debut) / JOUR_MS));
}

/**
 * Un devis doit être relancé si le délai configuré par le garage est écoulé
 * depuis son émission (ou sa dernière relance), et qu'il n'a pas encore été
 * signé ni classé perdu.
 */
export function devisDoitEtreRelance(params: {
  emisLe: Date;
  derniereRelanceLe: Date | null;
  relanceApresJours: number;
  statut: "EN_ATTENTE" | "RELANCE" | "SIGNE" | "PERDU";
  aujourdHui: Date;
}): boolean {
  if (params.statut === "SIGNE" || params.statut === "PERDU") return false;

  const depuis = params.derniereRelanceLe ?? params.emisLe;
  return joursEcoules(depuis, params.aujourdHui) >= params.relanceApresJours;
}

/**
 * Passé un certain nombre de jours sans signature, l'agent propose de lui-même
 * un paiement en 2 fois pour lever le dernier frein — une seule fois par devis.
 */
export function devisDoitProposerPaiementFractionne(params: {
  emisLe: Date;
  paiementFractionneApresJours: number;
  dejaPropose: boolean;
  statut: "EN_ATTENTE" | "RELANCE" | "SIGNE" | "PERDU";
  aujourdHui: Date;
}): boolean {
  if (params.dejaPropose) return false;
  if (params.statut === "SIGNE" || params.statut === "PERDU") return false;
  return joursEcoules(params.emisLe, params.aujourdHui) >= params.paiementFractionneApresJours;
}
