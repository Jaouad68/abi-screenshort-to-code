/**
 * Formatage partagé client/serveur.
 *
 * Séparé de src/lib/terrain.ts, qui est `server-only` : le composant de saisie
 * de chantier tourne dans le navigateur et a besoin des mêmes formats.
 */

/** Total du temps saisi, en minutes. */
export function totalMinutes(entrees: readonly { minutes: number }[]): number {
  return entrees.reduce((total, e) => total + e.minutes, 0);
}

/** « 1 h 45 » plutôt que « 105 min » : c'est ainsi qu'un artisan compte. */
export function formaterDuree(minutes: number): string {
  if (minutes <= 0) return "0 min";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

/** Quantité stockée en milli-unités, affichée sans décimale superflue. */
export function formaterQuantite(quantiteMilli: number): string {
  const valeur = quantiteMilli / 1000;
  return Number.isInteger(valeur) ? String(valeur) : valeur.toFixed(2).replace(".", ",");
}

const heure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const jourLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export function formaterHeure(date: Date): string {
  return heure.format(date);
}

export function formaterJour(date: Date): string {
  return jourLong.format(date);
}

/** Date au format `YYYY-MM-DD` pour les liens et les champs date. */
export function versParametreDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
