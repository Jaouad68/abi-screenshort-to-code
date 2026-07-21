/**
 * Utilitaires partagés par tous les pipelines d'extraction LLM (facture,
 * carte, fiche technique) : nettoyage défensif du texte brut et
 * construction du message de correction envoyé lors de la relance unique.
 */

/**
 * Retire les balises de code markdown (```json ... ``` ou ``` ... ```)
 * que le modèle ajoute parfois malgré la consigne de ne pas en mettre.
 * Simple nettoyage défensif, pas une tentative de correction.
 */
export function retirerBalisesCode(texte: string): string {
  const nettoye = texte.trim();
  const correspondance = nettoye.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return correspondance ? correspondance[1]!.trim() : nettoye;
}

export function construireMessageCorrection(details: string): string {
  return (
    "Ta réponse précédente n'a pas pu être traitée : " +
    details +
    " Retourne UNIQUEMENT l'objet JSON demandé, sans préambule, sans " +
    "commentaire, sans balises de code."
  );
}
