const TAILLE_MAX_OCTETS = 10 * 1024 * 1024; // 10 Mo

const TYPES_ACCEPTES = new Set(["image/jpeg", "image/png"]);

export type ResultatValidationImage =
  | { valide: true }
  | { valide: false; erreur: string };

/**
 * Valide une image de facture avant tout appel LLM. HEIC/HEIF (format
 * natif iPhone) doit être converti en JPEG côté client — voir
 * lib/images/compression.ts — l'API vision Anthropic ne les accepte pas.
 */
export function validerImageFacture(fichier: {
  type: string;
  size: number;
}): ResultatValidationImage {
  if (fichier.size > TAILLE_MAX_OCTETS) {
    return {
      valide: false,
      erreur: `L'image dépasse la taille maximale de 10 Mo (${(fichier.size / 1024 / 1024).toFixed(1)} Mo reçus).`,
    };
  }

  if (!TYPES_ACCEPTES.has(fichier.type)) {
    return {
      valide: false,
      erreur:
        `Format d'image non pris en charge (${fichier.type}). ` +
        "Envoie une image JPEG ou PNG — les photos HEIC doivent être converties avant l'envoi.",
    };
  }

  return { valide: true };
}
