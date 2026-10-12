/*
 * 06 — CARTE, LISTE VIDE, À PRÉVOIR.
 *
 * Source : ui.tsx, fonctions Carte, ListeVide et APrevoir.
 *
 * « À prévoir » mérite un mot : c'est le composant qui annonce un module non
 * livré. Il existe pour tenir une règle du cahier des charges — aucune donnée
 * fictive dans l'application. Tant qu'un module n'est pas réellement en
 * service, on le dit, plutôt que de le remplir de chiffres inventés.
 */

const page = figma.root.children.find((p) => p.name === "Conteneurs");
if (!page) throw new Error("Page « Conteneurs » absente — exécuter 02-pages.js d'abord.");
await figma.setCurrentPageAsync(page);

await figma.loadFontAsync({ family: "Inter", style: "Regular" });
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
function txt(contenu, taille, style, nomVariable, largeur) {
  const t = figma.createText();
  t.fontName = { family: "Inter", style };
  t.characters = contenu;
  t.fontSize = taille;
  t.fills = [peinture(nomVariable)];
  if (largeur) { t.textAutoResize = "HEIGHT"; t.resize(largeur, t.height); }
  return t;
}
function rayonCarte(n) {
  for (const coin of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) {
    lier(n, coin, "rayon/carte");
  }
}

const creesIds = [];

/* ------------------------------------------------------------------ */
/* Carte                                                               */
/* ------------------------------------------------------------------ */

const carte = figma.createComponent();
carte.name = "Carte";
carte.layoutMode = "VERTICAL";
carte.primaryAxisSizingMode = "AUTO";
carte.counterAxisSizingMode = "FIXED";
carte.itemSpacing = 12;
carte.paddingTop = 20; carte.paddingBottom = 20;
carte.paddingLeft = 20; carte.paddingRight = 20;
carte.fills = [peinture("couleur/papier")];
carte.strokes = [peinture("couleur/trait")];
carte.strokeWeight = 1;
rayonCarte(carte);
for (const p of ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"]) lier(carte, p, "espacement/5");
lier(carte, "itemSpacing", "espacement/3");

const titreCarte = txt("Prochain rendez-vous", 16, "Semi Bold", "couleur/encre");
titreCarte.name = "Titre";
carte.appendChild(titreCarte);
const corpsCarte = txt("08:00 — SCI Les Tilleuls", 14, "Regular", "couleur/attenue");
corpsCarte.name = "Contenu";
carte.appendChild(corpsCarte);

carte.resize(360, carte.height);
carte.description =
  "Conteneur de base. Fond papier, bordure trait, rayon 12 px, rembourrage " +
  "20 px. Tout bloc de contenu de l'espace connecté en est une.";
carte.x = 0; carte.y = 160;
page.appendChild(carte);
creesIds.push(carte.id);

/* ------------------------------------------------------------------ */
/* Liste vide                                                          */
/* ------------------------------------------------------------------ */

const listeVide = figma.createComponent();
listeVide.name = "Liste vide";
listeVide.layoutMode = "VERTICAL";
listeVide.primaryAxisSizingMode = "AUTO";
listeVide.counterAxisSizingMode = "FIXED";
listeVide.counterAxisAlignItems = "CENTER";
listeVide.itemSpacing = 8;
listeVide.paddingTop = 20; listeVide.paddingBottom = 20;
listeVide.paddingLeft = 20; listeVide.paddingRight = 20;
listeVide.fills = [peinture("couleur/papier")];
listeVide.strokes = [peinture("couleur/trait")];
listeVide.strokeWeight = 1;
// Bordure pointillée : signale « il n'y a rien ici » sans avoir à l'écrire.
listeVide.dashPattern = [4, 4];
rayonCarte(listeVide);

const titreVide = txt("Vous travaillez seul pour l'instant", 16, "Semi Bold", "couleur/encre");
titreVide.name = "Titre";
listeVide.appendChild(titreVide);
const explication = txt(
  "Inviter quelqu'un lui donne un compte à son nom, avec son propre mot de passe.",
  14, "Regular", "couleur/attenue", 300,
);
explication.name = "Explication";
explication.textAlignHorizontal = "CENTER";
listeVide.appendChild(explication);

listeVide.resize(360, listeVide.height);
listeVide.description =
  "État vide d'une liste. Explique QUOI FAIRE plutôt que d'afficher un vide " +
  "muet : une liste vide sans explication passe pour une panne.";
listeVide.x = 420; listeVide.y = 160;
page.appendChild(listeVide);
creesIds.push(listeVide.id);

/* ------------------------------------------------------------------ */
/* À prévoir                                                           */
/* ------------------------------------------------------------------ */

const aPrevoir = figma.createComponent();
aPrevoir.name = "À prévoir";
aPrevoir.layoutMode = "VERTICAL";
aPrevoir.primaryAxisSizingMode = "AUTO";
aPrevoir.counterAxisSizingMode = "FIXED";
aPrevoir.itemSpacing = 8;
aPrevoir.paddingTop = 20; aPrevoir.paddingBottom = 20;
aPrevoir.paddingLeft = 20; aPrevoir.paddingRight = 20;
aPrevoir.fills = [peinture("couleur/papier")];
aPrevoir.strokes = [peinture("couleur/trait")];
aPrevoir.strokeWeight = 1;
aPrevoir.dashPattern = [4, 4];
rayonCarte(aPrevoir);

const entete = figma.createAutoLayout("HORIZONTAL", {
  name: "En-tête", primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER", itemSpacing: 12,
});
entete.fills = [];
aPrevoir.appendChild(entete);
entete.layoutSizingHorizontal = "FILL";

const titrePrevu = txt("Paiement en ligne", 16, "Semi Bold", "couleur/encre");
titrePrevu.name = "Titre";
entete.appendChild(titrePrevu);

const badge = figma.createAutoLayout("HORIZONTAL", {
  name: "Badge", paddingLeft: 10, paddingRight: 10, paddingTop: 4, paddingBottom: 4,
  counterAxisAlignItems: "CENTER",
});
badge.fills = [peinture("couleur/fond")];
badge.strokes = [peinture("couleur/trait")];
badge.strokeWeight = 1;
badge.cornerRadius = 999;
entete.appendChild(badge);
badge.appendChild(txt("À venir", 12, "Semi Bold", "couleur/attenue"));

const texteAPrevoir = txt(
  "Ce module n'est pas encore disponible. Aucune donnée n'est affichée tant " +
  "qu'il n'est pas réellement en service.",
  14, "Regular", "couleur/attenue", 320,
);
texteAPrevoir.name = "Explication";
aPrevoir.appendChild(texteAPrevoir);

aPrevoir.resize(360, aPrevoir.height);
aPrevoir.description =
  "Annonce un module non livré. Existe pour tenir une règle du cahier des " +
  "charges : aucune donnée fictive dans l'application. Mieux vaut annoncer " +
  "honnêtement qu'un module manque que le remplir de chiffres inventés.";
aPrevoir.x = 840; aPrevoir.y = 160;
page.appendChild(aPrevoir);
creesIds.push(aPrevoir.id);

/* Titre de page */
const titre = figma.createText();
titre.fontName = { family: "Inter", style: "Bold" };
titre.characters = "Conteneurs";
titre.fontSize = 40;
titre.fills = [peinture("couleur/encre")];
titre.x = 0; titre.y = 0;
page.appendChild(titre);

await carte.screenshot();

return {
  pageId: page.id,
  carteId: carte.id,
  listeVideId: listeVide.id,
  aPrevoirId: aPrevoir.id,
  echecsLiaison,
  createdNodeIds: [...creesIds, titre.id],
};
