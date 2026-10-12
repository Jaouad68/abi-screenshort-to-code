/*
 * 00 — INSPECTION (lecture seule, aucune écriture).
 *
 * À lancer AVANT tout le reste, et de nouveau après chaque interruption.
 *
 * Deux raisons :
 *  1. ne jamais imposer de conventions à un fichier qui en a déjà ;
 *  2. rendre les scripts suivants idempotents — on ne recrée pas ce qui existe.
 */

const pages = figma.root.children.map((p) => ({
  id: p.id,
  nom: p.name,
  enfants: p.children.length,
}));

const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables = await figma.variables.getLocalVariablesAsync();

const inventaireCollections = collections.map((c) => ({
  id: c.id,
  nom: c.name,
  modes: c.modes.map((m) => m.name),
  nombreVariables: c.variableIds.length,
}));

// Composants de la page courante seulement : changer de page dans une boucle
// est interdit (une seule bascule par exécution). Le script 02 crée les pages,
// donc à ce stade il n'y a rien ailleurs.
const composants = figma.currentPage
  .findAllWithCriteria({ types: ["COMPONENT", "COMPONENT_SET"] })
  .map((n) => ({ id: n.id, nom: n.name, type: n.type }));

return {
  fichier: figma.root.name,
  pages,
  collections: inventaireCollections,
  nombreVariables: variables.length,
  nomsVariables: variables.map((v) => v.name).sort(),
  stylesTexte: (await figma.getLocalTextStylesAsync()).map((s) => s.name),
  stylesEffet: (await figma.getLocalEffectStylesAsync()).map((s) => s.name),
  composantsPageCourante: composants,
  // Sert au script 01 : si ces collections existent déjà, il faut mettre à jour
  // plutôt que créer.
  dejaInitialise: inventaireCollections.some((c) => c.nom === "Couleur"),
};
