/*
 * 05 — CHAMP, ZONE DE TEXTE, SÉLECTION.
 *
 * Trois composants sur une page : ils forment une famille, se lisent ensemble
 * et partagent leurs règles d'accessibilité.
 *
 * Source : ui.tsx, fonctions Champ, ZoneTexte et Selection.
 *
 * Règles portées par ces composants, et qui ne sont pas négociables :
 *  - le <label> est TOUJOURS présent. Un placeholder ne le remplace pas : il
 *    disparaît dès la première frappe, et l'utilisateur ne sait plus ce qu'il
 *    saisit ;
 *  - l'erreur est un TEXTE, jamais une simple bordure rouge. La couleur seule
 *    n'est pas perceptible par tout le monde ;
 *  - hauteur de saisie 44 px, texte 16 px.
 */

const page = figma.root.children.find((p) => p.name === "Formulaires");
if (!page) throw new Error("Page « Formulaires » absente — exécuter 02-pages.js d'abord.");
await figma.setCurrentPageAsync(page);

await figma.loadFontAsync({ family: "Inter", style: "Regular" });
await figma.loadFontAsync({ family: "Inter", style: "Medium" });
await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
await figma.loadFontAsync({ family: "Inter", style: "Bold" });

const variables = await figma.variables.getLocalVariablesAsync();
const V = (nom) => {
  const v = variables.find((x) => x.name === nom);
  if (!v) throw new Error(`Variable « ${nom} » introuvable — exécuter 01-variables.js d'abord.`);
  return v;
};

const echecsLiaison = [];
function lier(noeud, champ, nomVariable) {
  try { noeud.setBoundVariable(champ, V(nomVariable)); }
  catch (e) { echecsLiaison.push(`${noeud.name}.${champ} → ${nomVariable} : ${e.message}`); }
}
function peinture(nomVariable) {
  return figma.variables.setBoundVariableForPaint(
    { type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", V(nomVariable),
  );
}
function txt(contenu, taille, style, nomVariable) {
  const t = figma.createText();
  t.fontName = { family: "Inter", style };
  t.characters = contenu;
  t.fontSize = taille;
  t.fills = [peinture(nomVariable)];
  return t;
}
function rayonControle(n) {
  for (const coin of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) {
    lier(n, coin, "rayon/controle");
  }
}

/* Zone de saisie commune aux trois composants. */
function zoneSaisie(nom, hauteur, contenu, bordure, alignementVertical) {
  const z = figma.createAutoLayout("HORIZONTAL", {
    name: nom,
    paddingLeft: 12, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
    counterAxisAlignItems: alignementVertical || "CENTER",
  });
  z.fills = [peinture("couleur/papier")];
  z.strokes = [peinture(bordure)];
  z.strokeWeight = 1;
  rayonControle(z);
  lier(z, "paddingLeft", "espacement/3");
  lier(z, "paddingRight", "espacement/3");

  // 16 px : en dessous, iOS zoome au focus et l'écran change d'échelle
  // pendant la saisie.
  const t = txt(contenu, 16, "Regular", "couleur/encre");
  z.appendChild(t);
  t.name = "Saisie";

  z.layoutSizingHorizontal = "FIXED";
  z.resize(320, hauteur);
  return z;
}

const composants = [];
const creesIds = [];

/* ------------------------------------------------------------------ */
/* Champ — 4 états                                                     */
/* ------------------------------------------------------------------ */

/* [état, bordure, aide ?, erreur ?] */
const ETATS_CHAMP = [
  ["Repos", "couleur/trait", false, false],
  ["Avec aide", "couleur/trait", true, false],
  ["Focus", "couleur/action", false, false],
  ["Erreur", "couleur/danger", false, true],
];

for (const [etat, bordure, avecAide, avecErreur] of ETATS_CHAMP) {
  const c = figma.createComponent();
  c.name = `État=${etat}`;
  c.layoutMode = "VERTICAL";
  c.primaryAxisSizingMode = "AUTO";
  c.counterAxisSizingMode = "AUTO";
  c.itemSpacing = 6;
  c.fills = [];
  lier(c, "itemSpacing", "espacement/1-5");

  const libelle = txt("Adresse e-mail", 14, "Semi Bold", "couleur/encre");
  libelle.name = "Libellé";
  c.appendChild(libelle);

  if (avecAide) {
    const aide = txt("Elle servira à envoyer le devis au client.", 14, "Regular", "couleur/attenue");
    aide.name = "Aide";
    c.appendChild(aide);
  }

  c.appendChild(zoneSaisie("Zone de saisie", 44, "claire.fontaine@exemple.fr", bordure));

  if (avecErreur) {
    const err = txt("Cette adresse e-mail n'est pas valide.", 14, "Medium", "couleur/danger");
    err.name = "Erreur";
    c.appendChild(err);
  }

  c.description =
    `Champ de saisie, état ${etat.toLowerCase()}. Le libellé est toujours visible : ` +
    "un placeholder disparaît à la première frappe. L'erreur est un texte, " +
    "jamais une bordure rouge seule.";
  composants.push(c);
}

const jeuChamp = figma.combineAsVariants(composants, page);
jeuChamp.name = "Champ";
jeuChamp.layoutMode = "VERTICAL";
jeuChamp.primaryAxisSizingMode = "AUTO";
jeuChamp.counterAxisSizingMode = "AUTO";
jeuChamp.itemSpacing = 24;
jeuChamp.paddingTop = 24; jeuChamp.paddingBottom = 24;
jeuChamp.paddingLeft = 24; jeuChamp.paddingRight = 24;
jeuChamp.x = 0; jeuChamp.y = 160;
jeuChamp.description =
  "Champ de saisie sur une ligne. Le focus se signale par la bordure ET par " +
  "l'anneau de focus du navigateur (3 px, couleur action) — jamais par la " +
  "couleur seule.";
creesIds.push(jeuChamp.id);

/* ------------------------------------------------------------------ */
/* Zone de texte                                                       */
/* ------------------------------------------------------------------ */

const zoneTexte = figma.createComponent();
zoneTexte.name = "Zone de texte";
zoneTexte.layoutMode = "VERTICAL";
zoneTexte.primaryAxisSizingMode = "AUTO";
zoneTexte.counterAxisSizingMode = "AUTO";
zoneTexte.itemSpacing = 6;
zoneTexte.fills = [];
const libelleZone = txt("Compte rendu d'intervention", 14, "Semi Bold", "couleur/encre");
libelleZone.name = "Libellé";
zoneTexte.appendChild(libelleZone);
const aideZone = txt("Ce texte figurera sur le bon signé par le client.", 14, "Regular", "couleur/attenue");
aideZone.name = "Aide";
zoneTexte.appendChild(aideZone);
zoneTexte.appendChild(
  zoneSaisie("Zone de saisie", 96, "Remplacement du robinet thermostatique du radiateur salon.", "couleur/trait", "MIN"),
);
zoneTexte.description =
  "Saisie multiligne, trois lignes par défaut. Même règle de libellé que le " +
  "champ. Utilisée pour le compte rendu, saisi sur chantier — souvent hors ligne.";
zoneTexte.x = 420; zoneTexte.y = 160;
page.appendChild(zoneTexte);
creesIds.push(zoneTexte.id);

/* ------------------------------------------------------------------ */
/* Sélection                                                           */
/* ------------------------------------------------------------------ */

const selection = figma.createComponent();
selection.name = "Sélection";
selection.layoutMode = "VERTICAL";
selection.primaryAxisSizingMode = "AUTO";
selection.counterAxisSizingMode = "AUTO";
selection.itemSpacing = 6;
selection.fills = [];
const libelleSel = txt("Rôle", 14, "Semi Bold", "couleur/encre");
libelleSel.name = "Libellé";
selection.appendChild(libelleSel);

const zoneSel = figma.createAutoLayout("HORIZONTAL", {
  name: "Zone de sélection",
  paddingLeft: 12, paddingRight: 12,
  counterAxisAlignItems: "CENTER", primaryAxisAlignItems: "SPACE_BETWEEN",
});
zoneSel.fills = [peinture("couleur/papier")];
zoneSel.strokes = [peinture("couleur/trait")];
zoneSel.strokeWeight = 1;
rayonControle(zoneSel);
selection.appendChild(zoneSel);
const valeurSel = txt("Technicien", 16, "Regular", "couleur/encre");
valeurSel.name = "Valeur";
zoneSel.appendChild(valeurSel);
const chevron = txt("▾", 14, "Regular", "couleur/attenue");
chevron.name = "Chevron";
zoneSel.appendChild(chevron);
zoneSel.layoutSizingHorizontal = "FIXED";
zoneSel.resize(320, 44);

selection.description =
  "Liste déroulante. Les options proposées sont bornées côté serveur : sur " +
  "l'écran Équipe, on ne peut pas inviter à un rôle supérieur au sien, et un " +
  "<select> modifié dans le navigateur est refusé à l'envoi.";
selection.x = 420; selection.y = 400;
page.appendChild(selection);
creesIds.push(selection.id);

/* Titre de page */
const titre = figma.createText();
titre.fontName = { family: "Inter", style: "Bold" };
titre.characters = "Formulaires";
titre.fontSize = 40;
titre.fills = [peinture("couleur/encre")];
titre.x = 0; titre.y = 0;
page.appendChild(titre);

const note = figma.createText();
note.fontName = { family: "Inter", style: "Regular" };
note.characters =
  "Libellé toujours visible, saisie à 44 px de haut, texte à 16 px, erreur " +
  "écrite en toutes lettres. Ces quatre règles valent pour les trois composants.";
note.fontSize = 14;
note.fills = [peinture("couleur/attenue")];
note.x = 0; note.y = 60;
note.textAutoResize = "HEIGHT";
note.resize(640, note.height);
page.appendChild(note);

await jeuChamp.screenshot();

return {
  pageId: page.id,
  champId: jeuChamp.id,
  zoneTexteId: zoneTexte.id,
  selectionId: selection.id,
  variantesChamp: composants.length,
  echecsLiaison,
  createdNodeIds: [...creesIds, titre.id, note.id],
};
