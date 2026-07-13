import type { Jour } from "@/lib/horaires";

const JOUR_PAR_INDEX: Jour[] = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

/** All appointment times are stored as UTC wall-clock times (no timezone conversion). */
export function dateEtHeureVersDate(dateISO: string, heure: string): Date {
  return new Date(`${dateISO}T${heure}:00.000Z`);
}

export function dateVersHeure(date: Date): string {
  return date.toISOString().slice(11, 16);
}

export function dateVersJour(dateISO: string): Jour {
  const index = new Date(`${dateISO}T00:00:00.000Z`).getUTCDay();
  return JOUR_PAR_INDEX[index];
}

export function debutEtFinDeJourUtc(dateISO: string): { debut: Date; fin: Date } {
  return {
    debut: new Date(`${dateISO}T00:00:00.000Z`),
    fin: new Date(`${dateISO}T23:59:59.999Z`),
  };
}

export function estPasse(date: Date): boolean {
  return date.getTime() < Date.now();
}

export function dateISOActuelle(): string {
  return new Date().toISOString().slice(0, 10);
}

export function heureActuelleUtc(): string {
  return new Date().toISOString().slice(11, 16);
}

export function ajouterJours(dateISO: string, jours: number): string {
  const d = new Date(`${dateISO}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

export function moisActuelISO(): string {
  return new Date().toISOString().slice(0, 7);
}

export function debutEtFinDeMoisUtc(moisISO: string): { debut: Date; fin: Date } {
  const debut = new Date(`${moisISO}-01T00:00:00.000Z`);
  const fin = new Date(debut);
  fin.setUTCMonth(fin.getUTCMonth() + 1);
  return { debut, fin };
}

export function ajouterMois(moisISO: string, mois: number): string {
  const d = new Date(`${moisISO}-01T00:00:00.000Z`);
  d.setUTCMonth(d.getUTCMonth() + mois);
  return d.toISOString().slice(0, 7);
}

const MOIS_LABEL_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export function formatMoisFr(moisISO: string): string {
  const [annee, mois] = moisISO.split("-").map(Number);
  return `${MOIS_LABEL_FR[mois - 1]} ${annee}`;
}
