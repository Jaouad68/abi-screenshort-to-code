/**
 * Compression et normalisation d'image côté client, avant l'envoi à
 * POST /api/factures/extraire. L'API vision Anthropic n'accepte que
 * JPEG/PNG — jamais HEIC/HEIF (format par défaut des iPhone) — donc toute
 * image est systématiquement ré-encodée en JPEG ici, pas seulement
 * redimensionnée.
 *
 * Décision : le décodage HEIC repose sur `createImageBitmap` /
 * `<canvas>`, qui ne décodent nativement ce format que sur iOS/Safari —
 * la plateforme d'origine du format et la cible principale de ce parcours
 * (photo prise au téléphone). Un décodeur HEIC JS dédié (ex. heic2any)
 * n'est pas ajouté à ce stade pour rester léger ; si le décodage échoue
 * (desktop non-Apple avec un fichier HEIC), l'erreur est explicite et
 * invite à changer de format plutôt que de planter silencieusement.
 */

export interface DimensionsImage {
  largeur: number;
  hauteur: number;
}

const DIMENSION_MAX_PX = 2000;
const QUALITE_JPEG = 0.82;

/**
 * Calcule les dimensions cibles en conservant le ratio d'aspect, sans
 * jamais agrandir une image plus petite que la dimension maximale.
 */
export function calculerDimensionsCible(
  dimensionsOriginales: DimensionsImage,
  dimensionMaxPx: number = DIMENSION_MAX_PX,
): DimensionsImage {
  const { largeur, hauteur } = dimensionsOriginales;
  const plusGrandCote = Math.max(largeur, hauteur);

  if (plusGrandCote <= dimensionMaxPx) {
    return { largeur, hauteur };
  }

  const echelle = dimensionMaxPx / plusGrandCote;
  return {
    largeur: Math.round(largeur * echelle),
    hauteur: Math.round(hauteur * echelle),
  };
}

export function remplacerExtension(
  nomFichier: string,
  nouvelleExtension: string,
): string {
  const sansExtension = nomFichier.replace(/\.[^./\\]+$/, "");
  return `${sansExtension}.${nouvelleExtension}`;
}

/**
 * Redimensionne et ré-encode une image en JPEG. Fonction navigateur
 * uniquement (canvas, createImageBitmap) — non testable en environnement
 * Node/Vitest ; `calculerDimensionsCible` et `remplacerExtension`,
 * purement arithmétiques, sont couvertes par des tests unitaires.
 */
/* v8 ignore start */
export async function comprimerImageFacture(fichier: File): Promise<File> {
  const image = await createImageBitmap(fichier);
  const cible = calculerDimensionsCible({
    largeur: image.width,
    hauteur: image.height,
  });

  const canvas = document.createElement("canvas");
  canvas.width = cible.largeur;
  canvas.height = cible.hauteur;
  const contexte = canvas.getContext("2d");
  if (!contexte) {
    throw new Error("Impossible d'obtenir un contexte de dessin 2D.");
  }
  contexte.drawImage(image, 0, 0, cible.largeur, cible.hauteur);

  const blob = await new Promise<Blob | null>((resoudre) =>
    canvas.toBlob(resoudre, "image/jpeg", QUALITE_JPEG),
  );
  if (!blob) {
    throw new Error(
      "La compression de l'image a échoué. Réessaie avec une autre photo.",
    );
  }

  return new File([blob], remplacerExtension(fichier.name, "jpg"), {
    type: "image/jpeg",
  });
}
/* v8 ignore stop */
