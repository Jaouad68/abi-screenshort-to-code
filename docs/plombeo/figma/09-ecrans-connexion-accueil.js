/*
 * 09 — ÉCRANS : CONNEXION ET ACCUEIL.
 *
 * ┌─ À FAIRE AVANT D'EXÉCUTER ─────────────────────────────────────────┐
 * │ Recopier dans CONFIG ci-dessous les identifiants renvoyés par le   │
 * │ script 08. Sans eux, les composants ne peuvent pas être instanciés │
 * │ depuis une autre page.                                            │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * Parti pris d'assemblage, et il est délibéré :
 *
 *  - les éléments ATOMIQUES (bouton, champ, badge, message) sont des
 *    INSTANCES du design system. Modifier le composant les met tous à jour ;
 *  - les CARTES sont des frames locales liées aux mêmes variables, et non des
 *    instances. Une instance Figma n'accepte pas d'enfants arbitraires : une
 *    carte instanciée serait figée sur son contenu d'exemple, donc inutile.
 *
 * Référence visuelle : captures de l'application réelle, viewport iPhone 13.
 */

const CONFIG = {
  Bouton: "",   // ex. "12:34"
  Champ: "",
  Badge: "",
  Message: "",
};

const NOM_PAGE = "Écrans — iPhone";
const page = figma.root.children.find((p) => p.name === NOM_PAGE);
if (!page) throw new Error(`Page « ${NOM_PAGE} » absente — exécuter 08-ecrans-page.js.`);
await figma.setCurrentPageAsync(page);

await figma.loadFontAsync({ family: "Inter", style: "Regular" });
await figma.loadFontAsync({ family: "Inter", style: "Medium" });
await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
await figma.loadFontAsync({ family: "Inter", style: "Bold" });

const variables = await figma.variables.getLocalVariablesAsync();
const V = (nom) => {
  const v = variables.find((x) => x.name === nom);
  if (!v) throw new Error(`Variable « ${nom} » introuvable — exécuter 01-variables.js.`);
  return v;
};
const echecs = [];
function lier(n, champ, nomVar) {
  try { n.setBoundVariable(champ, V(nomVar)); }
  catch (e) { echecs.push(`${n.name}.${champ} → ${nomVar} : ${e.message}`); }
}
function peinture(nomVar) {
  return figma.variables.setBoundVariableForPaint(
    { type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", V(nomVar));
}
function txt(contenu, taille, style, nomVar, largeur) {
  const t = figma.createText();
  t.fontName = { family: "Inter", style };
  t.characters = contenu;
  t.fontSize = taille;
  t.fills = [peinture(nomVar)];
  if (largeur) { t.textAutoResize = "HEIGHT"; t.resize(largeur, t.height); }
  return t;
}

/* Instancie une variante précise d'un jeu de variantes, ou le composant seul. */
async function instance(cle, nomVariante) {
  const id = CONFIG[cle];
  if (!id) { echecs.push(`CONFIG.${cle} vide — instance remplacée par un cadre nu`); return null; }
  const noeud = await figma.getNodeByIdAsync(id);
  if (!noeud) { echecs.push(`Composant ${cle} introuvable (${id})`); return null; }
  if (noeud.type === "COMPONENT_SET") {
    const variante = nomVariante
      ? noeud.children.find((c) => c.name === nomVariante) || noeud.defaultVariant
      : noeud.defaultVariant;
    return variante.createInstance();
  }
  return noeud.createInstance();
}

/* Carte : frame locale, pas une instance — voir l'en-tête. */
function carte(nom) {
  const c = figma.createAutoLayout("VERTICAL", { name: nom, itemSpacing: 12 });
  c.fills = [peinture("couleur/papier")];
  c.strokes = [peinture("couleur/trait")];
  c.strokeWeight = 1;
  for (const coin of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) {
    lier(c, coin, "rayon/carte");
  }
  for (const p of ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"]) lier(c, p, "espacement/5");
  c.paddingTop = 20; c.paddingBottom = 20; c.paddingLeft = 20; c.paddingRight = 20;
  return c;
}

/* Écran : gabarit 390 de large, hauteur libre. */
function ecran(nom, x) {
  const e = figma.createAutoLayout("VERTICAL", { name: nom, itemSpacing: 0 });
  e.fills = [peinture("couleur/fond")];
  e.x = x; e.y = 0;
  e.resize(390, 844);
  e.layoutSizingHorizontal = "FIXED";
  e.layoutSizingVertical = "HUG";
  e.clipsContent = true;
  return e;
}

/* Barre de navigation, commune à tous les écrans connectés. */
function barreNav(actif) {
  const barre = figma.createAutoLayout("HORIZONTAL", {
    name: "Navigation", itemSpacing: 4, counterAxisAlignItems: "CENTER",
    paddingTop: 12, paddingBottom: 12, paddingLeft: 20, paddingRight: 20,
  });
  barre.fills = [peinture("couleur/encre")];
  const marque = txt("Plombéo", 18, "Bold", "couleur/papier");
  barre.appendChild(marque);
  const espace = figma.createFrame();
  espace.name = "espace"; espace.fills = []; espace.resize(12, 1);
  barre.appendChild(espace);
  for (const item of ["Agenda", "Demandes", "Devis", "Fact"]) {
    const t = txt(item, 14, item === actif ? "Semi Bold" : "Medium", "couleur/papier");
    t.opacity = item === actif ? 1 : 0.85;
    barre.appendChild(t);
  }
  return barre;
}

const crees = [];

/* ================================================================== */
/* Écran 1 — Connexion                                                */
/* ================================================================== */

const connexion = ecran("01 — Connexion", 0);
page.appendChild(connexion);

const corpsConnexion = figma.createAutoLayout("VERTICAL", {
  name: "Contenu", itemSpacing: 24,
  paddingTop: 64, paddingBottom: 40, paddingLeft: 20, paddingRight: 20,
});
corpsConnexion.fills = [];
connexion.appendChild(corpsConnexion);
corpsConnexion.layoutSizingHorizontal = "FILL";

const enteteConnexion = figma.createAutoLayout("VERTICAL", { name: "Titre", itemSpacing: 4 });
enteteConnexion.fills = [];
corpsConnexion.appendChild(enteteConnexion);
enteteConnexion.appendChild(txt("Se connecter", 24, "Bold", "couleur/encre"));
enteteConnexion.appendChild(txt("Accédez à votre espace Plombéo.", 14, "Regular", "couleur/attenue"));

const carteConnexion = carte("Formulaire");
corpsConnexion.appendChild(carteConnexion);
carteConnexion.layoutSizingHorizontal = "FILL";

for (const [libelle, valeur] of [["Adresse e-mail", "patron@exemple.fr"], ["Mot de passe", "••••••••••••"]]) {
  const champ = await instance("Champ", "État=Repos");
  if (champ) {
    champ.name = libelle;
    carteConnexion.appendChild(champ);
    champ.layoutSizingHorizontal = "FILL";
    // Le libellé et la valeur se remplacent sur l'instance, sans la détacher.
    const textes = champ.findAll((n) => n.type === "TEXT");
    if (textes[0]) { await figma.loadFontAsync(textes[0].fontName); textes[0].characters = libelle; }
    const saisie = textes.find((t) => t.name === "Saisie");
    if (saisie) { await figma.loadFontAsync(saisie.fontName); saisie.characters = valeur; }
  } else {
    carteConnexion.appendChild(txt(`${libelle} (composant Champ manquant)`, 14, "Regular", "couleur/danger"));
  }
}

const boutonConnexion = await instance("Bouton", "Variante=Principal, État=Repos");
if (boutonConnexion) {
  boutonConnexion.name = "Se connecter";
  carteConnexion.appendChild(boutonConnexion);
  boutonConnexion.layoutSizingHorizontal = "FILL";
  const t = boutonConnexion.findOne((n) => n.type === "TEXT");
  if (t) { await figma.loadFontAsync(t.fontName); t.characters = "Se connecter"; }
}

const lienInscription = txt("Pas encore de compte ? Créer mon compte", 14, "Regular", "couleur/attenue");
corpsConnexion.appendChild(lienInscription);
crees.push(connexion.id);

/* ================================================================== */
/* Écran 2 — Accueil                                                  */
/* ================================================================== */

const accueil = ecran("02 — Accueil", 440);
page.appendChild(accueil);
accueil.appendChild(barreNav(null));

const corpsAccueil = figma.createAutoLayout("VERTICAL", {
  name: "Contenu", itemSpacing: 16,
  paddingTop: 24, paddingBottom: 24, paddingLeft: 20, paddingRight: 20,
});
corpsAccueil.fills = [];
accueil.appendChild(corpsAccueil);
corpsAccueil.layoutSizingHorizontal = "FILL";

const enteteAccueil = figma.createAutoLayout("VERTICAL", { name: "En-tête", itemSpacing: 4 });
enteteAccueil.fills = [];
corpsAccueil.appendChild(enteteAccueil);
enteteAccueil.appendChild(txt("Démo — Dupuis Plomberie", 24, "Bold", "couleur/encre"));
enteteAccueil.appendChild(txt("patron@demo.plombeo.test", 14, "Regular", "couleur/attenue"));

/* Carte du prochain rendez-vous : le cœur de l'écran. */
const carteRdv = carte("Prochain rendez-vous");
corpsAccueil.appendChild(carteRdv);
carteRdv.layoutSizingHorizontal = "FILL";
carteRdv.appendChild(txt("Prochain rendez-vous", 16, "Semi Bold", "couleur/encre"));

const detailRdv = figma.createAutoLayout("VERTICAL", { name: "Détail", itemSpacing: 2 });
detailRdv.fills = [];
carteRdv.appendChild(detailRdv);
detailRdv.layoutSizingHorizontal = "FILL";
detailRdv.appendChild(txt("08:00 — SCI Les Tilleuls", 16, "Medium", "couleur/encre"));
detailRdv.appendChild(txt("Recherche de fuite — sous-sol", 14, "Regular", "couleur/attenue"));
detailRdv.appendChild(txt("3 place Gabriel-Péri, 69007 Lyon", 14, "Regular", "couleur/attenue"));

const actionsRdv = figma.createAutoLayout("HORIZONTAL", { name: "Actions", itemSpacing: 8 });
actionsRdv.fills = [];
carteRdv.appendChild(actionsRdv);
for (const [variante, libelle] of [
  ["Variante=Principal, État=Repos", "Démarrer"],
  ["Variante=Discret, État=Repos", "GPS"],
  ["Variante=Discret, État=Repos", "Appeler"],
]) {
  const b = await instance("Bouton", variante);
  if (!b) continue;
  b.name = libelle;
  actionsRdv.appendChild(b);
  const t = b.findOne((n) => n.type === "TEXT");
  if (t) { await figma.loadFontAsync(t.fontName); t.characters = libelle; }
}

/* Grille de raccourcis, deux colonnes. */
const grille = figma.createAutoLayout("VERTICAL", { name: "Raccourcis", itemSpacing: 12 });
grille.fills = [];
corpsAccueil.appendChild(grille);
grille.layoutSizingHorizontal = "FILL";

const RACCOURCIS = [
  [["Aujourd'hui", "1 RDV"], ["Demandes", "2 en attente"]],
  [["Devis", "1 en cours"], ["Impayés", "355,20 €"]],
];
for (const paire of RACCOURCIS) {
  const rangee = figma.createAutoLayout("HORIZONTAL", { name: "rangée", itemSpacing: 12 });
  rangee.fills = [];
  grille.appendChild(rangee);
  rangee.layoutSizingHorizontal = "FILL";
  for (const [titre, valeur] of paire) {
    const c = carte(titre);
    c.itemSpacing = 4;
    rangee.appendChild(c);
    c.layoutSizingHorizontal = "FILL";
    c.appendChild(txt(titre, 14, "Regular", "couleur/attenue"));
    c.appendChild(txt(valeur, 16, "Semi Bold", "couleur/encre"));
  }
}
crees.push(accueil.id);

await connexion.screenshot();
await accueil.screenshot();

return {
  pageId: page.id,
  ecrans: { connexion: connexion.id, accueil: accueil.id },
  echecs,
  createdNodeIds: crees,
};
