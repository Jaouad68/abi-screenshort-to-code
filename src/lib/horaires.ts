export const JOURS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"] as const;

export type Jour = (typeof JOURS)[number];

export const JOUR_LABELS: Record<Jour, string> = {
  lun: "Lundi",
  mar: "Mardi",
  mer: "Mercredi",
  jeu: "Jeudi",
  ven: "Vendredi",
  sam: "Samedi",
  dim: "Dimanche",
};

/** A single opening window, e.g. ["09:00", "12:00"]. */
export type Fenetre = [string, string];

export type JourHoraire = {
  jour: Jour;
  fenetres: Fenetre[];
};

export type Horaires = JourHoraire[];

export type ReglagesAcompte = {
  seuilNoShow: number;
  seuilPardon: number;
  montantType: "pourcentage" | "fixe";
  valeur: number;
};

export const DEFAULT_HORAIRES: Horaires = [
  { jour: "lun", fenetres: [["09:00", "12:00"], ["14:00", "19:00"]] },
  { jour: "mar", fenetres: [["09:00", "12:00"], ["14:00", "19:00"]] },
  { jour: "mer", fenetres: [["09:00", "12:00"], ["14:00", "19:00"]] },
  { jour: "jeu", fenetres: [["09:00", "12:00"], ["14:00", "19:00"]] },
  { jour: "ven", fenetres: [["09:00", "12:00"], ["14:00", "19:00"]] },
  { jour: "sam", fenetres: [["09:00", "17:00"]] },
  { jour: "dim", fenetres: [] },
];

export const DEFAULT_REGLAGES_ACOMPTE: ReglagesAcompte = {
  seuilNoShow: 2,
  seuilPardon: 3,
  montantType: "pourcentage",
  valeur: 30,
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Validates the shape and internal consistency of a Horaires value (used before persisting). */
export function isValidHoraires(value: unknown): value is Horaires {
  if (!Array.isArray(value)) return false;

  return value.every((entry) => {
    if (typeof entry !== "object" || entry === null) return false;
    const { jour, fenetres } = entry as JourHoraire;
    if (!JOURS.includes(jour)) return false;
    if (!Array.isArray(fenetres)) return false;

    return fenetres.every((fenetre) => {
      if (!Array.isArray(fenetre) || fenetre.length !== 2) return false;
      const [debut, fin] = fenetre;
      if (typeof debut !== "string" || typeof fin !== "string") return false;
      if (!TIME_RE.test(debut) || !TIME_RE.test(fin)) return false;
      return timeToMinutes(debut) < timeToMinutes(fin);
    });
  });
}
