/*
 * 01 — VARIABLES.
 *
 * Les jetons AVANT les composants : un composant se lie à une variable, donc
 * sans variable il n'y a pas de composant correct à construire.
 *
 * Architecture en deux couches, comme dans le code :
 *  - « Primitives » porte les valeurs brutes, et n'est jamais utilisée
 *    directement (portées vides = invisible dans les sélecteurs) ;
 *  - « Couleur » porte les rôles, chacun ALIAS d'une primitive. C'est ce que
 *    les composants consomment.
 *
 * UN SEUL MODE. Le code déclare `color-scheme: light` et ne contient aucune
 * valeur sombre : inventer une palette sombre ici produirait un fichier Figma
 * qui promet un thème que l'application n'a pas.
 *
 * Source : plombeo/src/app/globals.css (bloc @theme) et src/components/ui.tsx.
 */

/* Conversion hexadécimal → {r,g,b} en 0–1, l'API Figma n'accepte pas 0–255. */
function rgb(hex) {
  const n = hex.replace("#", "");
  return {
    r: parseInt(n.slice(0, 2), 16) / 255,
    g: parseInt(n.slice(2, 4), 16) / 255,
    b: parseInt(n.slice(4, 6), 16) / 255,
  };
}

/* ------------------------------------------------------------------ */
/* Valeurs brutes — relevées dans le code, pas approchées à l'œil      */
/* ------------------------------------------------------------------ */

const PRIMITIVES = [
  // globals.css, bloc @theme
  ["brut/bleu-profond", "#0f2f44"],
  ["brut/bleu-clair", "#1c4a68"],
  ["brut/orange-chantier", "#b04a0d"],
  ["brut/orange-fonce", "#8f3c0a"],
  ["brut/blanc", "#ffffff"],
  ["brut/gris-fond", "#f4f6f8"],
  ["brut/gris-trait", "#d8dfe5"],
  ["brut/gris-texte", "#5a6a76"],
  ["brut/vert", "#1c7c4a"],
  ["brut/ocre", "#8f5808"],
  ["brut/rouge", "#b3261e"],
  // ui.tsx — codés en dur dans les composants, hors du bloc @theme.
  // Les remonter ici rend l'écart visible plutôt que de le reproduire.
  ["brut/vert-pale", "#e8f4ed"],
  ["brut/vert-bord", "#bcdcc9"],
  ["brut/ocre-pale", "#fdf3e2"],
  ["brut/ocre-bord", "#eed9ae"],
  ["brut/rouge-pale", "#fdeceb"],
  ["brut/rouge-bord", "#f2c9c6"],
];

/*
 * Rôles sémantiques : [nom Figma, primitive visée, portées, variable CSS].
 *
 * La syntaxe WEB reprend le NOM RÉEL de la variable CSS, avec l'enveloppe
 * `var()` : c'est ce qui permet au mode Dev de renvoyer du code utilisable tel
 * quel, et de refaire le lien Figma → code plus tard.
 */
const SEMANTIQUES = [
  ["couleur/encre", "brut/bleu-profond", ["TEXT_FILL", "FRAME_FILL", "SHAPE_FILL"], "var(--color-encre)"],
  ["couleur/encre-clair", "brut/bleu-clair", ["FRAME_FILL", "SHAPE_FILL"], "var(--color-encre-clair)"],
  ["couleur/action", "brut/orange-chantier", ["FRAME_FILL", "SHAPE_FILL", "STROKE_COLOR"], "var(--color-action)"],
  ["couleur/action-fonce", "brut/orange-fonce", ["FRAME_FILL", "SHAPE_FILL"], "var(--color-action-fonce)"],
  ["couleur/papier", "brut/blanc", ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"], "var(--color-papier)"],
  ["couleur/fond", "brut/gris-fond", ["FRAME_FILL", "SHAPE_FILL"], "var(--color-fond)"],
  ["couleur/trait", "brut/gris-trait", ["STROKE_COLOR"], "var(--color-trait)"],
  ["couleur/attenue", "brut/gris-texte", ["TEXT_FILL"], "var(--color-attenue)"],
  ["couleur/succes", "brut/vert", ["TEXT_FILL", "STROKE_COLOR"], "var(--color-succes)"],
  ["couleur/alerte", "brut/ocre", ["TEXT_FILL", "STROKE_COLOR"], "var(--color-alerte)"],
  ["couleur/danger", "brut/rouge", ["TEXT_FILL", "STROKE_COLOR"], "var(--color-danger)"],
  ["couleur/succes-fond", "brut/vert-pale", ["FRAME_FILL", "SHAPE_FILL"], ""],
  ["couleur/succes-bord", "brut/vert-bord", ["STROKE_COLOR"], ""],
  ["couleur/alerte-fond", "brut/ocre-pale", ["FRAME_FILL", "SHAPE_FILL"], ""],
  ["couleur/alerte-bord", "brut/ocre-bord", ["STROKE_COLOR"], ""],
  ["couleur/danger-fond", "brut/rouge-pale", ["FRAME_FILL", "SHAPE_FILL"], ""],
  ["couleur/danger-bord", "brut/rouge-bord", ["STROKE_COLOR"], ""],
];

/* Descriptions portant la RAISON d'une valeur. Sans elles, un designer qui
 * trouve l'orange terne l'éclaircit — et repasse sous le seuil de contraste. */
const RAISONS = {
  "couleur/action":
    "Orange chantier, réservé à l'action principale et à l'urgence. Teinte " +
    "volontairement assombrie : l'orange d'origine (#d95f18) ne donnait que " +
    "3,75:1 avec du texte blanc, sous le seuil de 4,5:1. Mesuré, pas supposé. " +
    "L'éclaircir casse l'accessibilité. Valeur actuelle : 5,48:1 sur blanc.",
  "couleur/alerte":
    "Assombrie après mesure : #a8690a plafonnait à 4,07:1 sur le fond du badge " +
    "et 4,48:1 sur blanc, sous le seuil dans les deux cas. Valeur actuelle : " +
    "5,89:1 sur blanc, 5,35:1 sur le fond du badge.",
  "couleur/trait":
    "ATTENTION — 1,35:1 contre le blanc, sous le seuil de 3:1 exigé pour un " +
    "élément d'interface porteur de sens. Sur un champ de saisie, c'est la " +
    "seule chose qui délimite la zone de saisie. Reproduit ici tel quel parce " +
    "que ce fichier reflète le code ; à arbitrer, pas à corriger en douce.",
  "couleur/attenue":
    "Texte secondaire. 5,59:1 sur blanc, 5,16:1 sur le fond gris — le plus bas " +
    "des textes du système, donc le premier à casser si on l'éclaircit.",
};

const ESPACEMENTS = [
  ["rayon/carte", 12, ["CORNER_RADIUS"], "var(--radius-carte)"],
  ["rayon/controle", 8, ["CORNER_RADIUS"], "var(--radius-controle)"],
  // 44 px : seuil en dessous duquel une saisie au pouce devient imprécise.
  // Contrainte transverse du design system, pas une préférence.
  ["taille/cible-tactile-min", 44, ["WIDTH_HEIGHT"], ""],
  ["espacement/1", 4, ["GAP", "WIDTH_HEIGHT"], ""],
  ["espacement/1-5", 6, ["GAP", "WIDTH_HEIGHT"], ""],
  ["espacement/2", 8, ["GAP", "WIDTH_HEIGHT"], ""],
  ["espacement/3", 12, ["GAP", "WIDTH_HEIGHT"], ""],
  ["espacement/4", 16, ["GAP", "WIDTH_HEIGHT"], ""],
  ["espacement/5", 20, ["GAP", "WIDTH_HEIGHT"], ""],
  ["espacement/6", 24, ["GAP", "WIDTH_HEIGHT"], ""],
];

/* ------------------------------------------------------------------ */
/* Création                                                            */
/* ------------------------------------------------------------------ */

const existantes = await figma.variables.getLocalVariablesAsync();
const collectionsExistantes = await figma.variables.getLocalVariableCollectionsAsync();

function trouverCollection(nom) {
  return collectionsExistantes.find((c) => c.name === nom) || null;
}
function trouverVariable(nom, collectionId) {
  return existantes.find((v) => v.name === nom && v.variableCollectionId === collectionId) || null;
}

// --- Primitives -----------------------------------------------------
let colPrimitives = trouverCollection("Primitives");
if (!colPrimitives) {
  colPrimitives = figma.variables.createVariableCollection("Primitives");
  colPrimitives.renameMode(colPrimitives.modes[0].modeId, "Valeur");
}
const modePrimitif = colPrimitives.modes[0].modeId;

const parNom = {};
const creees = [];

for (const [nom, hex] of PRIMITIVES) {
  let v = trouverVariable(nom, colPrimitives.id);
  if (!v) {
    v = figma.variables.createVariable(nom, colPrimitives, "COLOR");
    creees.push(nom);
  }
  v.setValueForMode(modePrimitif, rgb(hex));
  // Portées vides : une primitive ne doit JAMAIS être choisie directement dans
  // un sélecteur de propriété. On passe toujours par un rôle.
  v.scopes = [];
  v.description = `Valeur brute ${hex}. Ne pas utiliser directement — passer par un rôle de la collection Couleur.`;
  parNom[nom] = v;
}

// --- Couleurs sémantiques -------------------------------------------
let colCouleur = trouverCollection("Couleur");
if (!colCouleur) {
  colCouleur = figma.variables.createVariableCollection("Couleur");
  colCouleur.renameMode(colCouleur.modes[0].modeId, "Clair");
}
const modeClair = colCouleur.modes[0].modeId;

for (const [nom, primitive, portees, css] of SEMANTIQUES) {
  let v = trouverVariable(nom, colCouleur.id);
  if (!v) {
    v = figma.variables.createVariable(nom, colCouleur, "COLOR");
    creees.push(nom);
  }
  // Alias, jamais une copie de la valeur : dupliquer le brut ferait diverger
  // les deux couches à la première correction.
  v.setValueForMode(modeClair, {
    type: "VARIABLE_ALIAS",
    id: parNom[primitive].id,
  });
  v.scopes = portees;
  if (css) v.setVariableCodeSyntax("WEB", css);
  if (RAISONS[nom]) v.description = RAISONS[nom];
  parNom[nom] = v;
}

// --- Espacement, rayons, cibles --------------------------------------
let colEspacement = trouverCollection("Espacement");
if (!colEspacement) {
  colEspacement = figma.variables.createVariableCollection("Espacement");
  colEspacement.renameMode(colEspacement.modes[0].modeId, "Valeur");
}
const modeEspacement = colEspacement.modes[0].modeId;

for (const [nom, valeur, portees, css] of ESPACEMENTS) {
  let v = trouverVariable(nom, colEspacement.id);
  if (!v) {
    v = figma.variables.createVariable(nom, colEspacement, "FLOAT");
    creees.push(nom);
  }
  v.setValueForMode(modeEspacement, valeur);
  v.scopes = portees;
  if (css) v.setVariableCodeSyntax("WEB", css);
  parNom[nom] = v;
}

parNom["taille/cible-tactile-min"].description =
  "44 px. Seuil en dessous duquel une saisie au pouce devient imprécise. " +
  "S'applique à TOUTE cible tactile — bouton, champ, lien de navigation. " +
  "Contrainte de conception, pas une préférence esthétique.";

return {
  collections: {
    primitives: colPrimitives.id,
    couleur: colCouleur.id,
    espacement: colEspacement.id,
  },
  variablesCreees: creees,
  totalPrimitives: PRIMITIVES.length,
  totalSemantiques: SEMANTIQUES.length,
  totalEspacements: ESPACEMENTS.length,
  // À reporter dans le script suivant si besoin de lier des propriétés.
  identifiants: Object.fromEntries(Object.entries(parNom).map(([k, v]) => [k, v.id])),
};
