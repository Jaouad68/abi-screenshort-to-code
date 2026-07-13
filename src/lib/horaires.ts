export const JOURS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"] as const;

export type Jour = (typeof JOURS)[number];

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
