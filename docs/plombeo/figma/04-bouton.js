/*
 * 04 — COMPOSANT BOUTON.
 *
 * Source : plombeo/src/components/ui.tsx, constantes BASE_BOUTON et
 * VARIANTES_BOUTON.
 *
 *   principal   bg-action     texte blanc   survol : action-fonce
 *   secondaire  bg-encre      texte blanc   survol : encre-clair
 *   discret     bg-blanc      texte encre   bordure trait, survol : fond
 *
 * Trois variantes × trois états = 9 combinaisons. On reste très loin du seuil
 * de 30 au-delà duquel une matrice de variantes devient ingérable.
 *
 * Les propriétés numériques sont liées aux variables quand l'API l'accepte ;
 * chaque échec est REMONTÉ dans la valeur de retour plutôt que d'interrompre le
 * script. Un bouton correct mais partiellement lié vaut mieux qu'un script qui
 * s'arrête au milieu.
 */

const page = figma.root.children.find((p) => p.name === "Bouton");
if (!page) throw new Error("Page « Bouton » absente — exécuter 02-pages.js d'abord.");
await figma.setCurrentPageAsync(page);

await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
await figma.loadFontAsync({ family: "Inter", style: "Bold" });

const variables = await figma.variables.getLocalVariablesAsync();
const V = (nom) => {
  const v = variables.find((x) => x.name === nom);
  if (!v) throw new Error(`Variable « ${nom} » introuvable — exécuter 01-variables.js d'abord.`);
  return v;
};

const echecsLiaison = [];
function lier(noeud, champ, nomVariable) {
  try {
    noeud.setBoundVariable(champ, V(nomVariable));
    return true;
  } catch (e) {
    echecsLiaison.push(`${noeud.name}.${champ} → ${nomVariable} : ${e.message}`);
    return false;
  }
}
function remplir(noeud, nomVariable) {
  const peinture = figma.variables.setBoundVariableForPaint(
    { type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", V(nomVariable),
  );
  noeud.fills = [peinture];
}
function border(noeud, nomVariable) {
  const peinture = figma.variables.setBoundVariableForPaint(
    { type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", V(nomVariable),
  );
  noeud.strokes = [peinture];
  noeud.strokeWeight = 1;
}
function texteLie(contenu, nomVariable) {
  const t = figma.createText();
  t.fontName = { family: "Inter", style: "Semi Bold" };
  t.characters = contenu;
  t.fontSize = 14;
  const peinture = figma.variables.setBoundVariableForPaint(
    { type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", V(nomVariable),
  );
  t.fills = [peinture];
  return t;
}

/* [variante, état, fond, couleur du texte, bordure] */
const MATRICE = [
  ["Principal", "Repos", "couleur/action", "couleur/papier", null],
  ["Principal", "Survol", "couleur/action-fonce", "couleur/papier", null],
  ["Principal", "Désactivé", "couleur/action", "couleur/papier", null],
  ["Secondaire", "Repos", "couleur/encre", "couleur/papier", null],
  ["Secondaire", "Survol", "couleur/encre-clair", "couleur/papier", null],
  ["Secondaire", "Désactivé", "couleur/encre", "couleur/papier", null],
  ["Discret", "Repos", "couleur/papier", "couleur/encre", "couleur/trait"],
  ["Discret", "Survol", "couleur/fond", "couleur/encre", "couleur/trait"],
  ["Discret", "Désactivé", "couleur/papier", "couleur/encre", "couleur/trait"],
];

const composants = [];

for (const [variante, etat, fond, couleurTexte, bordure] of MATRICE) {
  const c = figma.createComponent();
  c.name = `Variante=${variante}, État=${etat}`;
  c.layoutMode = "HORIZONTAL";
  c.primaryAxisSizingMode = "AUTO";
  c.counterAxisSizingMode = "FIXED";
  c.primaryAxisAlignItems = "CENTER";
  c.counterAxisAlignItems = "CENTER";
  c.itemSpacing = 8;
  c.paddingLeft = 20;
  c.paddingRight = 20;

  remplir(c, fond);
  if (bordure) border(c, bordure);

  // Hauteur : la contrainte des 44 px, imposée par la taille et non par du
  // rembourrage — un rembourrage se réduit sans qu'on s'en aperçoive.
  c.resize(c.width, 44);
  lier(c, "height", "taille/cible-tactile-min");

  for (const coin of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) {
    lier(c, coin, "rayon/controle");
  }
  lier(c, "itemSpacing", "espacement/2");
  lier(c, "paddingLeft", "espacement/5");
  lier(c, "paddingRight", "espacement/5");

  const etiquette = texteLie("Démarrer", couleurTexte);
  c.appendChild(etiquette);
  etiquette.name = "Libellé";

  // L'état désactivé est rendu par l'opacité, exactement comme la classe
  // disabled:opacity-60 du code.
  if (etat === "Désactivé") c.opacity = 0.6;

  c.description =
    `Bouton ${variante.toLowerCase()}, état ${etat.toLowerCase()}. ` +
    "Hauteur minimale 44 px (cible tactile). Le libellé dit ce qui va se " +
    "produire — « Enregistrer », pas « OK ».";

  composants.push(c);
}

const jeu = figma.combineAsVariants(composants, page);
jeu.name = "Bouton";
jeu.description =
  "Bouton du design system Plombéo. Trois variantes : Principal (action " +
  "unique de l'écran), Secondaire (action de navigation), Discret (action " +
  "secondaire ou destructive assumée). L'orange n'est employé que pour " +
  "l'action principale : utilisé partout, il cesse d'être un signal.";

// Après combineAsVariants, toutes les variantes se superposent en (0,0) :
// il faut les replacer soi-même.
jeu.layoutMode = "VERTICAL";
jeu.primaryAxisSizingMode = "AUTO";
jeu.counterAxisSizingMode = "AUTO";
jeu.itemSpacing = 16;
jeu.paddingTop = 24;
jeu.paddingBottom = 24;
jeu.paddingLeft = 24;
jeu.paddingRight = 24;
jeu.x = 0;
jeu.y = 160;

// Propriété de texte : le libellé se change sur l'instance, sans détacher.
let proprieteLibelle = null;
try {
  proprieteLibelle = jeu.addComponentProperty("Libellé", "TEXT", "Démarrer");
  for (const c of composants) {
    const t = c.findOne((n) => n.type === "TEXT");
    if (t) t.componentPropertyReferences = { characters: proprieteLibelle };
  }
} catch (e) {
  echecsLiaison.push(`propriété de texte : ${e.message}`);
}

/* Titre de page */
const titre = figma.createText();
titre.fontName = { family: "Inter", style: "Bold" };
titre.characters = "Bouton";
titre.fontSize = 40;
titre.fills = [{ type: "SOLID", color: { r: 0.058824, g: 0.184314, b: 0.266667 } }];
titre.x = 0;
titre.y = 0;
page.appendChild(titre);

const sousTitre = figma.createText();
sousTitre.fontName = { family: "Inter", style: "Regular" };
sousTitre.characters =
  "3 variantes × 3 états. Hauteur bloquée à 44 px. L'état désactivé est rendu " +
  "par l'opacité (0,6), comme dans le code.";
sousTitre.fontSize = 14;
sousTitre.fills = [{ type: "SOLID", color: { r: 0.352941, g: 0.415686, b: 0.462745 } }];
sousTitre.x = 0;
sousTitre.y = 60;
sousTitre.textAutoResize = "HEIGHT";
sousTitre.resize(640, sousTitre.height);
page.appendChild(sousTitre);

await jeu.screenshot();

return {
  pageId: page.id,
  jeuDeVariantesId: jeu.id,
  nombreVariantes: composants.length,
  proprieteLibelle,
  echecsLiaison,
  createdNodeIds: [jeu.id, titre.id, sousTitre.id],
};
