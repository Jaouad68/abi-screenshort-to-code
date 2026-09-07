const DATE_FR = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });
const DATE_COURT = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const DATE_HEURE = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDate(d: Date): string {
  return DATE_FR.format(d);
}

export function formatDateCourt(d: Date): string {
  return DATE_COURT.format(d);
}

export function formatDateHeure(d: Date): string {
  return DATE_HEURE.format(d);
}

/** Date au format yyyy-mm-dd pour un <input type="date">. */
export function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${j}`;
}

/** Date au format yyyy-mm-ddThh:mm pour un <input type="datetime-local">. */
export function toInputDateTime(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${j}T${h}:${mi}`;
}

/** Parse une chaîne "yyyy-mm-dd" (input date) en Date locale à midi, pour
 * éviter les décalages de fuseau horaire lors du stockage. */
export function parseInputDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Différence en jours calendaires entre deux dates (arrondi), positive si
 * `d` est dans le futur par rapport à `from`. */
export function joursEntre(d: Date, from: Date = new Date()): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
