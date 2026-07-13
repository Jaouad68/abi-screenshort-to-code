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
