const JOUR_MS = 24 * 60 * 60 * 1000;

/** Nombre de jours entiers restants avant une échéance (peut être négatif si dépassée). */
export function joursRestants(echeance: Date, aujourdHui: Date): number {
  const debutEcheance = Date.UTC(echeance.getUTCFullYear(), echeance.getUTCMonth(), echeance.getUTCDate());
  const debutAujourdhui = Date.UTC(
    aujourdHui.getUTCFullYear(),
    aujourdHui.getUTCMonth(),
    aujourdHui.getUTCDate()
  );
  return Math.round((debutEcheance - debutAujourdhui) / JOUR_MS);
}

/**
 * Détermine le palier de rappel (en jours avant l'échéance CT) qui doit être
 * déclenché aujourd'hui pour ce véhicule, parmi les paliers configurés par le
 * garage (ex. [21, 10, 3]), en ignorant ceux déjà envoyés.
 *
 * Renvoie le palier le plus urgent qui est dû, ou `null` si aucun ne l'est.
 */
export function prochainPalierARelancer(params: {
  ctEcheance: Date;
  paliers: number[];
  palierDejaEnvoyes: number[];
  aujourdHui: Date;
}): number | null {
  const restants = joursRestants(params.ctEcheance, params.aujourdHui);
  if (restants < 0) return null;

  const dus = params.paliers
    .filter((palier) => restants <= palier && !params.palierDejaEnvoyes.includes(palier))
    .sort((a, b) => a - b);

  return dus[0] ?? null;
}
