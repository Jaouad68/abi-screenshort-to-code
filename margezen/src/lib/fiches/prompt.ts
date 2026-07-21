/**
 * Prompt de génération assistée de fiche technique — tel que spécifié, à
 * implémenter mot pour mot (hors interpolation des champs du plat).
 * L'IA propose une composition que le restaurateur corrige ensuite ;
 * jamais de saisie depuis une page blanche.
 */

export interface PlatPourPrompt {
  nom: string;
  description: string | null;
  prixTtcCts: number | null;
}

export function construirePromptFicheTechnique(
  plat: PlatPourPrompt,
  typeCuisine: string,
): string {
  const prix =
    plat.prixTtcCts !== null
      ? `${(plat.prixTtcCts / 100).toFixed(2)} € TTC`
      : "non renseigné";
  const description = plat.description ?? "non renseignée";

  return `Tu es chef de cuisine en restauration traditionnelle française,
avec quinze ans d'expérience en gestion de coûts matières.

Plat : "${plat.nom}"
Description sur la carte : "${description}"
Prix de vente : ${prix}
Type d'établissement : ${typeCuisine}

Propose la fiche technique pour UNE portion.

Retourne UNIQUEMENT un JSON valide :
{
  "ingredients": [
    {"nom": string, "quantite": number, "unite": "kg"|"L"|"piece"}
  ],
  "note": string | null
}

Règles :
- Utilise des grammages professionnels réalistes pour un service
  en salle, pas des quantités de recette familiale.
- Inclus la garniture et les éléments de dressage.
- Inclus l'assaisonnement et les matières grasses de cuisson.
- Exclus les consommables non alimentaires et le coût du personnel.
- Maximum 12 lignes. Regroupe les éléments mineurs.
- Nomme les ingrédients de façon générique et normalisée
  ("beurre" et non "beurre doux AOP Charentes-Poitou").
- Le champ "note" signale toute hypothèse forte que tu as faite.`;
}
