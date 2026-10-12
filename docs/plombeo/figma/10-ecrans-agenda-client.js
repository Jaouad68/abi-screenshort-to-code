/*
 * 10 — ÉCRANS : AGENDA ET FICHE CLIENT.
 *
 * Même préambule et mêmes partis pris que 09-ecrans-connexion-accueil.js :
 * éléments atomiques en instances du design system, cartes en frames locales
 * liées aux variables.
 *
 * ┌─ À FAIRE AVANT D'EXÉCUTER ─────────────────────────────────────────┐
 * │ Recopier dans CONFIG les identifiants renvoyés par le script 08.  │
 * └────────────────────────────────────────────────────────────────────┘
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
/* Écran 3 — Agenda                                                   */
/* ================================================================== */

const agenda = ecran("03 — Agenda", 0);
agenda.y = 1000;
page.appendChild(agenda);
agenda.appendChild(barreNav("Agenda"));

const corpsAgenda = figma.createAutoLayout("VERTICAL", {
  name: "Contenu", itemSpacing: 16,
  paddingTop: 24, paddingBottom: 24, paddingLeft: 20, paddingRight: 20,
});
corpsAgenda.fills = [];
agenda.appendChild(corpsAgenda);
corpsAgenda.layoutSizingHorizontal = "FILL";

const enteteAgenda = figma.createAutoLayout("VERTICAL", { name: "En-tête", itemSpacing: 4 });
enteteAgenda.fills = [];
corpsAgenda.appendChild(enteteAgenda);
enteteAgenda.appendChild(txt("Agenda", 24, "Bold", "couleur/encre"));
enteteAgenda.appendChild(txt("Lundi 11 août 2026", 14, "Regular", "couleur/attenue"));

/* Une ligne par rendez-vous. L'heure d'abord : c'est ce qu'on cherche. */
const RDV = [
  ["08:00", "SCI Les Tilleuls", "Recherche de fuite — sous-sol", "Urgent", "alerte"],
  ["14:00", "Marc Ollivier", "Diagnostic chauffe-eau", "Confirmé", "neutre"],
];
for (const [heure, client, objet, statut, ton] of RDV) {
  const c = carte(`RDV ${heure}`);
  c.itemSpacing = 8;
  corpsAgenda.appendChild(c);
  c.layoutSizingHorizontal = "FILL";

  const ligne = figma.createAutoLayout("HORIZONTAL", {
    name: "Ligne", itemSpacing: 12, counterAxisAlignItems: "CENTER",
    primaryAxisAlignItems: "SPACE_BETWEEN",
  });
  ligne.fills = [];
  c.appendChild(ligne);
  ligne.layoutSizingHorizontal = "FILL";

  const gauche = figma.createAutoLayout("VERTICAL", { name: "Infos", itemSpacing: 2 });
  gauche.fills = [];
  ligne.appendChild(gauche);
  gauche.appendChild(txt(`${heure} — ${client}`, 16, "Semi Bold", "couleur/encre"));
  gauche.appendChild(txt(objet, 14, "Regular", "couleur/attenue"));

  const badge = await instance("Badge", `Ton=${ton === "alerte" ? "Alerte" : "Neutre"}`);
  if (badge) {
    ligne.appendChild(badge);
    const t = badge.findOne((n) => n.type === "TEXT");
    if (t) { await figma.loadFontAsync(t.fontName); t.characters = statut; }
  }
}
crees.push(agenda.id);

/* ================================================================== */
/* Écran 6 — Fiche client                                             */
/* ================================================================== */

const fiche = ecran("06 — Fiche client", 440);
fiche.y = 1000;
page.appendChild(fiche);
fiche.appendChild(barreNav(null));

const corpsFiche = figma.createAutoLayout("VERTICAL", {
  name: "Contenu", itemSpacing: 16,
  paddingTop: 24, paddingBottom: 24, paddingLeft: 20, paddingRight: 20,
});
corpsFiche.fills = [];
fiche.appendChild(corpsFiche);
corpsFiche.layoutSizingHorizontal = "FILL";

const enteteFiche = figma.createAutoLayout("VERTICAL", { name: "En-tête", itemSpacing: 4 });
enteteFiche.fills = [];
corpsFiche.appendChild(enteteFiche);
enteteFiche.appendChild(txt("Claire Fontaine", 24, "Bold", "couleur/encre"));
enteteFiche.appendChild(txt("8 rue Villeroy, 69003 Lyon", 14, "Regular", "couleur/attenue"));

/* Logement — les informations d'accès sont ce qui évite de rester devant
   une porte fermée. Elles passent donc avant tout le reste. */
const carteLogement = carte("Logement");
corpsFiche.appendChild(carteLogement);
carteLogement.layoutSizingHorizontal = "FILL";
carteLogement.appendChild(txt("Appartement 3e étage", 16, "Semi Bold", "couleur/encre"));
for (const l of [
  "Étage : 3e · Digicode : A1234",
  "Interphone « Fontaine », cour intérieure à gauche.",
  "Construit en 1974",
]) {
  const t = txt(l, 14, "Regular", "couleur/attenue");
  carteLogement.appendChild(t);
  t.layoutSizingHorizontal = "FILL";
  t.textAutoResize = "HEIGHT";
}

/* Carnet technique */
const carteEquipement = carte("Équipement");
corpsFiche.appendChild(carteEquipement);
carteEquipement.layoutSizingHorizontal = "FILL";
carteEquipement.appendChild(txt("Chaudière — Thermex Condens 24", 16, "Semi Bold", "couleur/encre"));
carteEquipement.appendChild(txt("Cuisine, placard technique · n° DEMO-9931", 14, "Regular", "couleur/attenue"));

const ligneGarantie = figma.createAutoLayout("HORIZONTAL", { name: "Garantie", itemSpacing: 8, counterAxisAlignItems: "CENTER" });
ligneGarantie.fills = [];
carteEquipement.appendChild(ligneGarantie);
const badgeGarantie = await instance("Badge", "Ton=Succès");
if (badgeGarantie) {
  ligneGarantie.appendChild(badgeGarantie);
  const t = badgeGarantie.findOne((n) => n.type === "TEXT");
  if (t) { await figma.loadFontAsync(t.fontName); t.characters = "Encore couvert"; }
}
const reserve = txt(
  "Plombéo compare les dates saisies. Il ne qualifie ni la nature ni l'étendue de cette garantie.",
  14, "Regular", "couleur/attenue",
);
carteEquipement.appendChild(reserve);
reserve.layoutSizingHorizontal = "FILL";
reserve.textAutoResize = "HEIGHT";

/* Portail client */
const cartePortail = carte("Portail client");
corpsFiche.appendChild(cartePortail);
cartePortail.layoutSizingHorizontal = "FILL";
cartePortail.appendChild(txt("Portail client", 16, "Semi Bold", "couleur/encre"));
const explicationPortail = txt(
  "Créez un lien personnel pour que votre client consulte ses documents sans vous appeler.",
  14, "Regular", "couleur/attenue",
);
cartePortail.appendChild(explicationPortail);
explicationPortail.layoutSizingHorizontal = "FILL";
explicationPortail.textAutoResize = "HEIGHT";
const boutonPortail = await instance("Bouton", "Variante=Discret, État=Repos");
if (boutonPortail) {
  cartePortail.appendChild(boutonPortail);
  const t = boutonPortail.findOne((n) => n.type === "TEXT");
  if (t) { await figma.loadFontAsync(t.fontName); t.characters = "Créer un lien"; }
}
crees.push(fiche.id);

await agenda.screenshot();
await fiche.screenshot();

return {
  pageId: page.id,
  ecrans: { agenda: agenda.id, ficheClient: fiche.id },
  echecs,
  createdNodeIds: crees,
};
