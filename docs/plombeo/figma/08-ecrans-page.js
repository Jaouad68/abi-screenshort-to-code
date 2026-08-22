/*
 * 08 — PAGE DES ÉCRANS.
 *
 * Prépare la page qui accueillera les huit maquettes, et surtout : RÉCOLTE LES
 * IDENTIFIANTS des composants construits par les scripts 04 à 07.
 *
 * Pourquoi cette récolte est nécessaire. L'API ne charge les pages qu'à la
 * demande et n'autorise qu'une bascule de page par exécution : un script
 * d'écran ne peut donc pas aller chercher lui-même un composant qui vit sur une
 * autre page. Il faut lui passer les identifiants. C'est exactement ce que ce
 * script produit, et ce que les scripts 09 à 12 attendent dans leur bloc
 * CONFIG.
 *
 * Format iPhone 13 : 390 × 844 points, le format de conception réel de
 * l'application. Les hauteurs sont volontairement libres (les écrans défilent).
 */

const NOM_PAGE = "Écrans — iPhone";

let page = figma.root.children.find((p) => p.name === NOM_PAGE);
if (!page) {
  page = figma.createPage();
  page.name = NOM_PAGE;
}

/*
 * Récolte des composants. `getNodeByIdAsync` charge la page cible au besoin —
 * mais on ne connaît pas encore les identifiants. On procède donc par les pages
 * déjà connues, en lisant seulement leurs enfants de premier niveau, ce qui ne
 * demande pas de bascule.
 */
const cibles = {
  Bouton: null,
  Champ: null,
  Badge: null,
  Message: null,
  Carte: null,
  "Liste vide": null,
  "À prévoir": null,
  "Zone de texte": null,
  "Sélection": null,
};

const rapport = [];
for (const nomPage of ["Bouton", "Formulaires", "Conteneurs", "Signaux"]) {
  const p = figma.root.children.find((x) => x.name === nomPage);
  if (!p) { rapport.push(`page « ${nomPage} » absente`); continue; }
  await p.loadAsync();
  for (const enfant of p.children) {
    if (enfant.type !== "COMPONENT" && enfant.type !== "COMPONENT_SET") continue;
    if (enfant.name in cibles) cibles[enfant.name] = enfant.id;
  }
}

const manquants = Object.entries(cibles).filter(([, v]) => !v).map(([k]) => k);

return {
  pageEcransId: page.id,
  /*
   * À RECOPIER dans le bloc CONFIG des scripts 09 à 12.
   */
  CONFIG: cibles,
  composantsManquants: manquants,
  note: manquants.length
    ? "Composants manquants : exécuter d'abord les scripts 04 à 07."
    : "Tous les composants sont là. Recopier CONFIG dans les scripts 09 à 12.",
  rapport,
};
