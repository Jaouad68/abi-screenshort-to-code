/**
 * Normalise le nom d'un ingrédient pour la comparaison et le stockage
 * (`ingredient.nom_normalise`) : minuscules, espaces superflus réduits.
 * Ne modifie pas l'orthographe — la normalisation sémantique (singulier,
 * accents) reste une décision humaine à la validation.
 */
export function normaliserNomIngredient(nom: string): string {
  return nom.trim().toLowerCase().replace(/\s+/g, " ");
}
