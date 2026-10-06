import type { Catalogue, Devise } from "./domain";

export type Langue = "fr" | "ar";

/** Cookie de langue, lu par le serveur pour les attributs lang et dir de la page. */
export const COOKIE_LANGUE = "langue";

const LOCALE: Record<Langue, string> = { fr: "fr-FR", ar: "ar-MA" };

export function formatNombre(n: number, langue: Langue): string {
  return new Intl.NumberFormat(LOCALE[langue], { maximumFractionDigits: 0 }).format(n);
}

export function formatMad(n: number, langue: Langue): string {
  return `${formatNombre(n, langue)} ${langue === "ar" ? "درهم" : "MAD"}`;
}

/** Conversion approximative vers la devise de l'utilisateur, arrondie à la centaine. */
export function convertir(mad: number, devise: Devise, taux: Catalogue["taux"]): number {
  return Math.round(mad / taux[devise] / 100) * 100;
}

export function formatDevise(mad: number, devise: Devise, taux: Catalogue["taux"], langue: Langue): string {
  return new Intl.NumberFormat(LOCALE[langue], { style: "currency", currency: devise, maximumFractionDigits: 0 }).format(
    convertir(mad, devise, taux),
  );
}

/** « T2 2027 » à partir d'une date AAAA-MM-JJ. */
export function trimestre(date: string, langue: Langue): string {
  const [annee, mois] = date.split("-").map(Number);
  const t = Math.ceil(mois / 3);
  return langue === "ar" ? `الربع ${t} ${annee}` : `T${t} ${annee}`;
}

export function formatDate(date: string, langue: Langue): string {
  return new Intl.DateTimeFormat(LOCALE[langue], { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

/** Date du jour à Tanger (AAAA-MM-JJ). */
export function aujourdHuiTanger(maintenant = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca" }).format(maintenant);
}
