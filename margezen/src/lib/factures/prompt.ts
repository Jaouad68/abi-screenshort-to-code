/**
 * Prompt d'extraction de facture — tel que spécifié, à implémenter mot
 * pour mot. Le LLM n'entre jamais dans lib/marge.ts : il extrait et
 * structure, il ne calcule rien.
 */
export const PROMPT_EXTRACTION_FACTURE = `Tu extrais les lignes d'une facture fournisseur de restauration française.

Retourne UNIQUEMENT un objet JSON valide, sans préambule, sans commentaire,
sans balises de code.

Structure exacte attendue :
{
  "fournisseur": string | null,
  "date_facture": "YYYY-MM-DD" | null,
  "total_ht": number | null,
  "lignes": [
    {
      "libelle_brut": string,
      "quantite": number | null,
      "unite": "kg" | "L" | "piece" | "carton" | null,
      "prix_unitaire_ht": number | null,
      "total_ht": number | null,
      "confiance": number
    }
  ]
}

Règles impératives :
- Reporte les montants exactement comme imprimés sur la facture,
  en euros, avec un point décimal.
- Ne calcule aucun montant absent. Si une valeur n'est pas lisible
  ou pas imprimée, mets null.
- N'invente jamais une ligne. Mieux vaut une facture incomplète
  qu'une facture fausse.
- Le champ "confiance" vaut entre 0 et 1 et reflète ta certitude
  de lecture pour cette ligne. En dessous de 0.7, la ligne sera
  soumise à validation humaine.
- Si l'image n'est pas une facture, retourne
  {"erreur": "document_non_reconnu"}.`;
