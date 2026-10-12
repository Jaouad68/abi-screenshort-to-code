/**
 * Génération de CSV.
 *
 * Deux pièges traités ici, tous deux invisibles jusqu'à ce qu'ils mordent :
 *
 *  1. **Injection de formule.** Une valeur commençant par `=`, `+`, `-`, `@`
 *     (ou une tabulation / un retour chariot) est interprétée comme une formule
 *     par Excel et LibreOffice. Un client nommé `=cmd|...` deviendrait une
 *     exécution de commande à l'ouverture du fichier. On préfixe donc ces
 *     valeurs d'une apostrophe.
 *  2. **Encodage.** Sans BOM UTF-8, Excel en français lit le fichier en
 *     ANSI et casse tous les accents.
 */

const CARACTERES_DANGEREUX = /^[=+\-@\t\r]/;

export function echapperChampCsv(valeur: string): string {
  const neutralise = CARACTERES_DANGEREUX.test(valeur) ? `'${valeur}` : valeur;
  // Les guillemets internes se doublent ; on encadre systématiquement, ce qui
  // évite d'avoir à décider au cas par cas.
  return `"${neutralise.replace(/"/g, '""')}"`;
}

/**
 * Assemble un CSV.
 *
 * Séparateur `;` : c'est celui qu'attend Excel dans les locales francophones,
 * où la virgule est le séparateur décimal.
 */
export function construireCsv(entetes: readonly string[], lignes: readonly (readonly string[])[]): string {
  const contenu = [entetes, ...lignes]
    .map((ligne) => ligne.map(echapperChampCsv).join(";"))
    .join("\r\n");

  // BOM UTF-8.
  return `﻿${contenu}`;
}
