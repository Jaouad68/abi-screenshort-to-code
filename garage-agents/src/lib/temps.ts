const MINUTE_MS = 60_000;
const HEURE_MS = 60 * MINUTE_MS;
const JOUR_MS = 24 * HEURE_MS;

/** Formate un écart de temps passé en français court (« il y a 2 h », « il y a 5 j »). */
export function formaterTempsRelatif(date: Date, maintenant: Date): string {
  const ecartMs = maintenant.getTime() - date.getTime();
  if (ecartMs < MINUTE_MS) return "à l'instant";
  if (ecartMs < HEURE_MS) return `il y a ${Math.floor(ecartMs / MINUTE_MS)} min`;
  if (ecartMs < JOUR_MS) return `il y a ${Math.floor(ecartMs / HEURE_MS)} h`;

  const jours = Math.floor(ecartMs / JOUR_MS);
  if (jours < 7) return `il y a ${jours} j`;

  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
