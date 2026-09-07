import { joursEntre } from "@/lib/date";
import type { Periodicite } from "@/generated/prisma/client";

/** Nombre de mois correspondant à une périodicité, ou `null` pour "Autre"
 * (durée libre, non calculable automatiquement — l'utilisateur ressaisit la
 * prochaine échéance à la main). */
export function periodiciteMois(p: Periodicite): number | null {
  switch (p) {
    case "MENSUELLE":
      return 1;
    case "TRIMESTRIELLE":
      return 3;
    case "SEMESTRIELLE":
      return 6;
    case "ANNUELLE":
      return 12;
    case "BIENNALE":
      return 24;
    case "AUTRE":
      return null;
  }
}

export const PERIODICITE_LABEL: Record<Periodicite, string> = {
  MENSUELLE: "Mensuelle",
  TRIMESTRIELLE: "Trimestrielle",
  SEMESTRIELLE: "Semestrielle",
  ANNUELLE: "Annuelle",
  BIENNALE: "Biennale (2 ans)",
  AUTRE: "Autre",
};

/** Calcule la prochaine échéance à partir d'une date et d'une périodicité.
 * Renvoie `null` pour "Autre" : à saisir manuellement. */
export function prochaineEcheance(depuis: Date, p: Periodicite): Date | null {
  const mois = periodiciteMois(p);
  if (mois === null) return null;
  const d = new Date(depuis);
  d.setMonth(d.getMonth() + mois);
  return d;
}

export type FenetreEcheance = "echu" | "30" | "60" | "90" | "hors-fenetre";

/** Classe une échéance selon le nombre de jours restants, pour les trois
 * fenêtres de suivi des renouvellements (30 / 60 / 90 jours). Un contrat déjà
 * échu (jours < 0) reste prioritaire : il tombe dans "echu", pas "hors-fenetre". */
export function classerEcheance(dateEcheance: Date, from: Date = new Date()): FenetreEcheance {
  const j = joursEntre(dateEcheance, from);
  if (j < 0) return "echu";
  if (j <= 30) return "30";
  if (j <= 60) return "60";
  if (j <= 90) return "90";
  return "hors-fenetre";
}

export const FENETRE_LABEL: Record<FenetreEcheance, string> = {
  echu: "En retard",
  "30": "Sous 30 jours",
  "60": "Sous 60 jours",
  "90": "Sous 90 jours",
  "hors-fenetre": "Plus tard",
};
