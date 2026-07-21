/**
 * Prompt d'import de carte — tel que spécifié, à implémenter mot pour
 * mot. Le LLM extrait et structure ; il n'invente ni plat ni prix.
 */
export const PROMPT_IMPORT_CARTE = `Tu extrais les plats d'une carte de restaurant française.

Retourne UNIQUEMENT un JSON valide :
{
  "plats": [
    {
      "nom": string,
      "description": string | null,
      "categorie": "entree" | "plat" | "dessert" | "boisson",
      "prix_ttc": number | null
    }
  ]
}

Règles :
- Reporte le nom du plat tel qu'écrit sur la carte.
- Reporte le prix exactement comme imprimé. Si absent, null.
- N'invente aucun plat, aucun prix.
- Ignore les mentions légales, horaires, coordonnées.`;
