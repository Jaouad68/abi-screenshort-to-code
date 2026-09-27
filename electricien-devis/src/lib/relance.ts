const JOUR_MS = 86_400_000;

/**
 * Séquence de relance pilotée par n8n (voir n8n/README.md) : nombre de jours
 * après l'envoi du devis pour chaque étape. Étape 1 = email, étape 2 = email +
 * SMS, étape 3 = dernière relance + alerte à l'artisan.
 */
export const ETAPES_JOURS = [3, 7, 15] as const;

/**
 * Étape de relance à envoyer aujourd'hui pour un devis « Envoyé », ou null.
 * Sans état supplémentaire en base : une étape est due quand son délai est
 * dépassé et qu'aucune relance n'a été faite depuis ce délai (`relanceLe`).
 * Seule la plus haute étape due est renvoyée, pour ne jamais envoyer deux
 * relances le même jour après une interruption.
 */
export function etapeDue(
  envoyeLe: Date,
  relanceLe: Date | null,
  maintenant: Date = new Date(),
): number | null {
  for (let i = ETAPES_JOURS.length - 1; i >= 0; i--) {
    const seuil = envoyeLe.getTime() + ETAPES_JOURS[i] * JOUR_MS;
    if (maintenant.getTime() < seuil) continue;
    if (relanceLe && relanceLe.getTime() >= seuil) return null;
    return i + 1;
  }
  return null;
}

/** Nombre de jours pleins écoulés depuis `depuis`. */
export function joursEcoules(depuis: Date, maintenant: Date = new Date()): number {
  return Math.floor((maintenant.getTime() - depuis.getTime()) / JOUR_MS);
}

/**
 * Numéro français au format international attendu par les API SMS
 * (« 06 12 34 56 78 » → « 33612345678 »). Chaîne vide si non exploitable.
 */
export function telephoneInternational(telephone: string): string {
  const chiffres = telephone.replace(/[^\d+]/g, "");
  if (/^0[1-9]\d{8}$/.test(chiffres)) return `33${chiffres.slice(1)}`;
  if (/^\+33[1-9]\d{8}$/.test(chiffres)) return chiffres.slice(1);
  if (/^0033[1-9]\d{8}$/.test(chiffres)) return chiffres.slice(2);
  return "";
}

/**
 * Vérifie le secret partagé (CRON_SECRET) des routes machine à machine :
 *   Authorization: Bearer <CRON_SECRET>   ou  ?secret=<CRON_SECRET>
 */
export function secretValide(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const fourni =
    request.headers.get("authorization")?.replace("Bearer ", "") ??
    new URL(request.url).searchParams.get("secret");
  return Boolean(secret) && fourni === secret;
}
