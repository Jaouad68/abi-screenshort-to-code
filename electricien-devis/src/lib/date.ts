const DATE_FR = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });
const DATE_COURT = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export function formatDate(d: Date): string {
  return DATE_FR.format(d);
}

export function formatDateCourt(d: Date): string {
  return DATE_COURT.format(d);
}

/** Ajoute n jours à une date (échéance de validité du devis). */
export function ajouterJours(d: Date, jours: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + jours);
  return r;
}

/** Date au format yyyy-mm-dd pour un <input type="date">. */
export function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${j}`;
}
