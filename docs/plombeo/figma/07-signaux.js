/*
 * 07 — BADGE ET MESSAGE.
 *
 * Source : ui.tsx, constantes TONS_BADGE et fonction Message.
 *
 * Règle commune, et c'est la raison d'être de ces deux composants : LE LIBELLÉ
 * PORTE L'INFORMATION, la couleur ne fait que la renforcer. Un badge rouge sans
 * texte ne dit rien à qui ne distingue pas le rouge du vert — soit environ un
 * homme sur douze.
 *
 * Le Message porte en plus un rôle d'accessibilité : « status » pour un succès,
 * « alert » pour une erreur, afin que les lecteurs d'écran l'annoncent. Cela ne
 * se dessine pas, mais se documente ici pour que personne ne l'oublie en
 * réimplémentant le composant.
 */

const page = figma.root.children.find((p) => p.name === "Signaux");
if (!page) throw new Error("Page « Signaux » absente — exécuter 02-pages.js d'abord.");
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

const creesIds = [];

/* ------------------------------------------------------------------ */
/* Badge — 4 tons                                                      */
/* ------------------------------------------------------------------ */

/* [ton, fond, bordure, texte, libellé d'exemple] */
const TONS = [
  ["Neutre", "couleur/fond", "couleur/trait", "couleur/attenue", "Brouillon"],
  ["Succès", "couleur/succes-fond", "couleur/succes-bord", "couleur/succes", "Payée"],
  ["Alerte", "couleur/alerte-fond", "couleur/alerte-bord", "couleur/alerte", "En retard"],
  ["Danger", "couleur/danger-fond", "couleur/danger-bord", "couleur/danger", "Refusé"],
];

const variantesBadge = [];
for (const [ton, fond, bord, couleurTexte, libelle] of TONS) {
  const c = figma.createComponent();
  c.name = `Ton=${ton}`;
  c.layoutMode = "HORIZONTAL";
  c.primaryAxisSizingMode = "AUTO";
  c.counterAxisSizingMode = "AUTO";
  c.counterAxisAlignItems = "CENTER";
  c.paddingLeft = 10; c.paddingRight = 10;
  c.paddingTop = 4; c.paddingBottom = 4;
  c.fills = [peinture(fond)];
  c.strokes = [peinture(bord)];
  c.strokeWeight = 1;
  // Rayon complet : une pastille, jamais confondue avec un bouton.
  c.cornerRadius = 999;

  const t = txt(libelle, 12, "Semi Bold", couleurTexte);
  t.name = "Libellé";
  c.appendChild(t);

  c.description =
    `Badge de statut, ton ${ton.toLowerCase()}. Le LIBELLÉ porte l'information ; ` +
    "la couleur ne fait que la renforcer. Ne jamais afficher un badge sans texte.";
  variantesBadge.push(c);
}

const jeuBadge = figma.combineAsVariants(variantesBadge, page);
jeuBadge.name = "Badge";
jeuBadge.layoutMode = "HORIZONTAL";
jeuBadge.primaryAxisSizingMode = "AUTO";
jeuBadge.counterAxisSizingMode = "AUTO";
jeuBadge.counterAxisAlignItems = "CENTER";
jeuBadge.itemSpacing = 16;
jeuBadge.paddingTop = 24; jeuBadge.paddingBottom = 24;
jeuBadge.paddingLeft = 24; jeuBadge.paddingRight = 24;
jeuBadge.x = 0; jeuBadge.y = 160;
jeuBadge.description =
  "Badge de statut. Quatre tons. Contraste vérifié pour chacun : le texte " +
  "tient au moins 4,5:1 sur son propre fond (succès 4,61:1, alerte 5,35:1, " +
  "danger 5,72:1).";
creesIds.push(jeuBadge.id);

let proprieteBadge = null;
try {
  proprieteBadge = jeuBadge.addComponentProperty("Libellé", "TEXT", "Statut");
  for (const c of variantesBadge) {
    const t = c.findOne((n) => n.type === "TEXT");
    if (t) t.componentPropertyReferences = { characters: proprieteBadge };
  }
} catch (e) {
  echecsLiaison.push(`propriété de texte du badge : ${e.message}`);
}

/* ------------------------------------------------------------------ */
/* Message — 2 tons                                                    */
/* ------------------------------------------------------------------ */

const MESSAGES = [
  ["Succès", "couleur/succes-fond", "couleur/succes-bord", "couleur/succes",
   "Invitation créée.", "role=\"status\" — annoncé sans interrompre"],
  ["Erreur", "couleur/danger-fond", "couleur/danger-bord", "couleur/danger",
   "Ce code ne correspond pas. Vérifiez l'heure de votre téléphone.",
   "role=\"alert\" — annoncé immédiatement"],
];

const variantesMessage = [];
for (const [ton, fond, bord, couleurTexte, contenu] of MESSAGES) {
  const c = figma.createComponent();
  c.name = `Ton=${ton}`;
  c.layoutMode = "HORIZONTAL";
  c.primaryAxisSizingMode = "FIXED";
  c.counterAxisSizingMode = "AUTO";
  c.paddingLeft = 12; c.paddingRight = 12;
  c.paddingTop = 8; c.paddingBottom = 8;
  c.fills = [peinture(fond)];
  c.strokes = [peinture(bord)];
  c.strokeWeight = 1;
  for (const coin of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) {
    lier(c, coin, "rayon/controle");
  }
  lier(c, "paddingLeft", "espacement/3");
  lier(c, "paddingRight", "espacement/3");

  const t = txt(contenu, 14, "Medium", couleurTexte);
  t.name = "Message";
  c.appendChild(t);
  t.layoutSizingHorizontal = "FILL";
  t.textAutoResize = "HEIGHT";

  c.resize(360, c.height);
  c.description =
    `Message de retour, ton ${ton.toLowerCase()}. Le texte dit ce qui s'est ` +
    "passé et, en cas d'erreur, comment le corriger — jamais « une erreur est " +
    "survenue ».";
  variantesMessage.push(c);
}

const jeuMessage = figma.combineAsVariants(variantesMessage, page);
jeuMessage.name = "Message";
jeuMessage.layoutMode = "VERTICAL";
jeuMessage.primaryAxisSizingMode = "AUTO";
jeuMessage.counterAxisSizingMode = "AUTO";
jeuMessage.itemSpacing = 16;
jeuMessage.paddingTop = 24; jeuMessage.paddingBottom = 24;
jeuMessage.paddingLeft = 24; jeuMessage.paddingRight = 24;
jeuMessage.x = 0; jeuMessage.y = 340;
jeuMessage.description =
  "Retour d'action. IMPORTANT à la réimplémentation : le ton Succès porte " +
  "role=\"status\", le ton Erreur porte role=\"alert\". Sans ces rôles, un " +
  "lecteur d'écran n'annonce rien et l'utilisateur croit que le bouton n'a " +
  "pas fonctionné.";
creesIds.push(jeuMessage.id);

/* Titre de page */
const titre = figma.createText();
titre.fontName = { family: "Inter", style: "Bold" };
titre.characters = "Signaux";
titre.fontSize = 40;
titre.fills = [peinture("couleur/encre")];
titre.x = 0; titre.y = 0;
page.appendChild(titre);

const note = figma.createText();
note.fontName = { family: "Inter", style: "Regular" };
note.characters =
  "Le libellé porte l'information ; la couleur ne fait que la renforcer. " +
  "Un badge sans texte ne dit rien à qui ne distingue pas le rouge du vert.";
note.fontSize = 14;
note.fills = [peinture("couleur/attenue")];
note.x = 0; note.y = 60;
note.textAutoResize = "HEIGHT";
note.resize(640, note.height);
page.appendChild(note);

await jeuBadge.screenshot();

return {
  pageId: page.id,
  badgeId: jeuBadge.id,
  messageId: jeuMessage.id,
  proprieteBadge,
  echecsLiaison,
  createdNodeIds: [...creesIds, titre.id, note.id],
};
