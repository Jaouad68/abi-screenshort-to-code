// Logique métier HACCP — fonctions PURES (sans I/O), testables unitairement.

/** Un relevé est conforme si la valeur est dans la plage cible [min, max]. */
export function isConforme(valeur: number, tempMin: number, tempMax: number): boolean {
  return valeur >= tempMin && valeur <= tempMax;
}

/** DLC secondaire = date d'ouverture + durée (jours). */
export function computeDlc(dateOuverture: Date, dureeJours: number): Date {
  const d = new Date(dateOuverture);
  d.setDate(d.getDate() + dureeJours);
  return d;
}

/** Vrai si la DLC est dépassée à l'instant `now`. */
export function isDlcDepassee(dlcSecondaire: Date, now: Date = new Date()): boolean {
  return dlcSecondaire.getTime() < now.getTime();
}

export type Frequence = "QUOTIDIENNE" | "HEBDOMADAIRE" | "MENSUELLE";

/**
 * Début de la période courante pour une fréquence donnée (utilisé pour savoir
 * si une tâche de nettoyage est « déjà faite » sur sa période).
 * `now` est injectable pour les tests.
 */
export function periodStart(frequence: string, now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (frequence === "HEBDOMADAIRE") {
    const day = (d.getDay() + 6) % 7; // lundi = 0
    d.setDate(d.getDate() - day);
  } else if (frequence === "MENSUELLE") {
    d.setDate(1);
  }
  return d;
}
