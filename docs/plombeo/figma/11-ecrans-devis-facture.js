/*
 * 11 — ÉCRANS : DEVIS ET FACTURE (détail).
 *
 * Les deux écrans les plus denses : lignes, TVA, totaux. Ils valident que le
 * design system tient sur du contenu chiffré, ce que ne montrent ni l'accueil
 * ni l'agenda.
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

/* Ligne d'un tableau de montants : libellé à gauche, montant à droite,
   aligné. Les chiffres se comparent en colonne, jamais au fil du texte. */
function ligneMontant(parent, libelle, detail, montant, gras) {
  const l = figma.createAutoLayout("HORIZONTAL", {
    name: libelle, itemSpacing: 12, primaryAxisAlignItems: "SPACE_BETWEEN",
  });
  l.fills = [];
  parent.appendChild(l);
  l.layoutSizingHorizontal = "FILL";

  const gauche = figma.createAutoLayout("VERTICAL", { name: "libellé", itemSpacing: 2 });
  gauche.fills = [];
  l.appendChild(gauche);
  gauche.appendChild(txt(libelle, 14, gras ? "Semi Bold" : "Regular", "couleur/encre"));
  if (detail) gauche.appendChild(txt(detail, 14, "Regular", "couleur/attenue"));

  const m = txt(montant, 14, gras ? "Bold" : "Semi Bold", "couleur/encre");
  l.appendChild(m);
  return l;
}

/* ================================================================== */
/* Écran 4 — Devis, détail                                            */
/* ================================================================== */

const devis = ecran("04 — Devis (détail)", 0);
devis.y = 2000;
page.appendChild(devis);
devis.appendChild(barreNav("Devis"));

const corpsDevis = figma.createAutoLayout("VERTICAL", {
  name: "Contenu", itemSpacing: 16,
  paddingTop: 24, paddingBottom: 24, paddingLeft: 20, paddingRight: 20,
});
corpsDevis.fills = [];
devis.appendChild(corpsDevis);
corpsDevis.layoutSizingHorizontal = "FILL";

const enteteDevis = figma.createAutoLayout("VERTICAL", { name: "En-tête", itemSpacing: 6 });
enteteDevis.fills = [];
corpsDevis.appendChild(enteteDevis);
enteteDevis.appendChild(txt("Marc Ollivier", 14, "Regular", "couleur/attenue"));

const ligneTitre = figma.createAutoLayout("HORIZONTAL", { name: "Numéro", itemSpacing: 10, counterAxisAlignItems: "CENTER" });
ligneTitre.fills = [];
enteteDevis.appendChild(ligneTitre);
ligneTitre.appendChild(txt("DEV-2026-001", 24, "Bold", "couleur/encre"));
const badgeDevis = await instance("Badge", "Ton=Neutre");
if (badgeDevis) {
  ligneTitre.appendChild(badgeDevis);
  const t = badgeDevis.findOne((n) => n.type === "TEXT");
  if (t) { await figma.loadFontAsync(t.fontName); t.characters = "Envoyé"; }
}
enteteDevis.appendChild(txt("8 août 2026 · valable 30 jours", 14, "Regular", "couleur/attenue"));

/* Deux propositions chiffrées : c'est la particularité de cet écran.
   Un devis simple est un devis à une seule proposition — la notion n'est
   jamais imposée. */
const PROPOSITIONS = [
  ["Remplacement à l'identique", "Proposition principale", [
    ["Chauffe-eau 200 L", "1 u × 680,00 € · TVA 20 %", "680,00 €"],
    ["Main-d'œuvre plomberie", "4 h × 58,00 € · TVA 20 %", "232,00 €"],
    ["Groupe de sécurité chauffe-eau", "1 u × 54,00 € · TVA 20 %", "54,00 €"],
  ], [["Total HT", "", "966,00 €", false], ["TVA 20 %", "", "193,20 €", false], ["Total TTC", "", "1 159,20 €", true]]],
  ["Passage en chauffe-eau thermodynamique", null, [
    ["Chauffe-eau thermodynamique 200 L", "1 u × 1 890,00 € · TVA 20 %", "1 890,00 €"],
    ["Main-d'œuvre plomberie", "7 h × 58,00 € · TVA 20 %", "406,00 €"],
  ], [["Sous-total HT", "", "2 296,00 €", false], ["Remise", "", "− 114,80 €", false],
      ["Total HT", "", "2 181,20 €", false], ["TVA 20 %", "", "436,24 €", false],
      ["Total TTC", "", "2 617,44 €", true]]],
];

for (const [titre, mention, lignes, totaux] of PROPOSITIONS) {
  const c = carte(titre);
  corpsDevis.appendChild(c);
  c.layoutSizingHorizontal = "FILL";

  const titreProp = txt(titre, 16, "Semi Bold", "couleur/encre");
  c.appendChild(titreProp);
  titreProp.layoutSizingHorizontal = "FILL";
  titreProp.textAutoResize = "HEIGHT";

  if (mention) {
    const b = await instance("Badge", "Ton=Neutre");
    if (b) {
      c.appendChild(b);
      const t = b.findOne((n) => n.type === "TEXT");
      if (t) { await figma.loadFontAsync(t.fontName); t.characters = mention; }
    }
  }

  for (const [libelle, detail, montant] of lignes) ligneMontant(c, libelle, detail, montant, false);

  const separateur = figma.createRectangle();
  separateur.name = "séparateur";
  separateur.resize(100, 1);
  separateur.fills = [peinture("couleur/trait")];
  c.appendChild(separateur);
  separateur.layoutSizingHorizontal = "FILL";

  for (const [libelle, detail, montant, gras] of totaux) ligneMontant(c, libelle, detail, montant, gras);
}
crees.push(devis.id);

/* ================================================================== */
/* Écran 5 — Facture, détail                                          */
/* ================================================================== */

const facture = ecran("05 — Facture (détail)", 440);
facture.y = 2000;
page.appendChild(facture);
facture.appendChild(barreNav("Fact"));

const corpsFacture = figma.createAutoLayout("VERTICAL", {
  name: "Contenu", itemSpacing: 16,
  paddingTop: 24, paddingBottom: 24, paddingLeft: 20, paddingRight: 20,
});
corpsFacture.fills = [];
facture.appendChild(corpsFacture);
corpsFacture.layoutSizingHorizontal = "FILL";

const enteteFacture = figma.createAutoLayout("VERTICAL", { name: "En-tête", itemSpacing: 6 });
enteteFacture.fills = [];
corpsFacture.appendChild(enteteFacture);
enteteFacture.appendChild(txt("SCI Les Tilleuls", 14, "Regular", "couleur/attenue"));

const ligneNum = figma.createAutoLayout("HORIZONTAL", { name: "Numéro", itemSpacing: 8, counterAxisAlignItems: "CENTER" });
ligneNum.fills = [];
enteteFacture.appendChild(ligneNum);
ligneNum.appendChild(txt("FAC-2026-002", 24, "Bold", "couleur/encre"));
for (const [ton, libelle] of [["Ton=Neutre", "Envoyée"], ["Ton=Alerte", "En retard"]]) {
  const b = await instance("Badge", ton);
  if (!b) continue;
  ligneNum.appendChild(b);
  const t = b.findOne((n) => n.type === "TEXT");
  if (t) { await figma.loadFontAsync(t.fontName); t.characters = libelle; }
}
enteteFacture.appendChild(txt("26 juin 2026 · échéance 26 juillet 2026", 14, "Regular", "couleur/attenue"));

/* Aucun bouton de modification : une facture émise ne se modifie plus.
   L'absence est le message. */
const actionsFacture = figma.createAutoLayout("VERTICAL", { name: "Actions", itemSpacing: 8 });
actionsFacture.fills = [];
corpsFacture.appendChild(actionsFacture);
actionsFacture.layoutSizingHorizontal = "FILL";
for (const [variante, libelle] of [
  ["Variante=Secondaire, État=Repos", "Voir / imprimer la facture"],
  ["Variante=Discret, État=Repos", "Télécharger le PDF"],
]) {
  const b = await instance("Bouton", variante);
  if (!b) continue;
  actionsFacture.appendChild(b);
  b.layoutSizingHorizontal = "FILL";
  const t = b.findOne((n) => n.type === "TEXT");
  if (t) { await figma.loadFontAsync(t.fontName); t.characters = libelle; }
}

const carteDetail = carte("Détail");
corpsFacture.appendChild(carteDetail);
carteDetail.layoutSizingHorizontal = "FILL";
carteDetail.appendChild(txt("Détail", 16, "Semi Bold", "couleur/encre"));
ligneMontant(carteDetail, "Débouchage canalisation", "1 u × 180,00 € · TVA 20 %", "180,00 €", false);
ligneMontant(carteDetail, "Main-d'œuvre plomberie", "2 h × 58,00 € · TVA 20 %", "116,00 €", false);

const sep2 = figma.createRectangle();
sep2.name = "séparateur"; sep2.resize(100, 1);
sep2.fills = [peinture("couleur/trait")];
carteDetail.appendChild(sep2);
sep2.layoutSizingHorizontal = "FILL";

ligneMontant(carteDetail, "Total HT", "", "296,00 €", false);
ligneMontant(carteDetail, "TVA 20 %", "", "59,20 €", false);
ligneMontant(carteDetail, "Total TTC", "", "355,20 €", true);
ligneMontant(carteDetail, "Encaissé", "", "0,00 €", false);
ligneMontant(carteDetail, "Reste à payer", "", "355,20 €", true);
crees.push(facture.id);

await devis.screenshot();
await facture.screenshot();

return {
  pageId: page.id,
  ecrans: { devis: devis.id, facture: facture.id },
  echecs,
  createdNodeIds: crees,
};
