/*
 * 03a — FONDATIONS : nuancier.
 *
 * Un script par page : l'API n'autorise qu'une bascule de page par exécution.
 *
 * Chaque pastille porte son nom de rôle, sa valeur, sa variable CSS et son
 * ratio de contraste MESURÉ. Un nuancier sans ratios laisse croire que le choix
 * des couleurs est esthétique.
 */

const page = figma.root.children.find((p) => p.name === "Couleurs");
if (!page) throw new Error("Page « Couleurs » absente — exécuter 02-pages.js d'abord.");
await figma.setCurrentPageAsync(page);

await figma.loadFontAsync({ family: "Inter", style: "Regular" });
await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
await figma.loadFontAsync({ family: "Inter", style: "Bold" });

function rgb(hex) {
  const n = hex.replace("#", "");
  return {
    r: parseInt(n.slice(0, 2), 16) / 255,
    g: parseInt(n.slice(2, 4), 16) / 255,
    b: parseInt(n.slice(4, 6), 16) / 255,
  };
}

function texte(contenu, taille, style, couleur) {
  const t = figma.createText();
  t.fontName = { family: "Inter", style };
  t.characters = contenu;
  t.fontSize = taille;
  t.fills = [{ type: "SOLID", color: couleur }];
  return t;
}

const ENCRE = rgb("#0f2f44");
const ATTENUE = rgb("#5a6a76");
const DANGER = rgb("#b3261e");

/* [rôle, hex, variable CSS, note de contraste, alerte ?] */
const GROUPES = [
  ["Marque", [
    ["encre", "#0f2f44", "--color-encre", "13,90:1 sur blanc · texte blanc dessus : 13,90:1", false],
    ["encre-clair", "#1c4a68", "--color-encre-clair", "Texte blanc dessus : 9,42:1 (état survol)", false],
  ]],
  ["Action", [
    ["action", "#b04a0d", "--color-action", "Texte blanc dessus : 5,48:1 — assombri après mesure", false],
    ["action-fonce", "#8f3c0a", "--color-action-fonce", "Texte blanc dessus : 7,45:1 (état survol)", false],
  ]],
  ["Surfaces", [
    ["papier", "#ffffff", "--color-papier", "Surface des cartes et des champs", false],
    ["fond", "#f4f6f8", "--color-fond", "Fond de page. Encre dessus : 12,83:1", false],
    ["trait", "#d8dfe5", "--color-trait", "1,35:1 sur blanc — SOUS le seuil de 3:1 des éléments d'interface", true],
    ["attenue", "#5a6a76", "--color-attenue", "5,59:1 sur blanc · 5,16:1 sur le fond gris", false],
  ]],
  ["États", [
    ["succes", "#1c7c4a", "--color-succes", "5,21:1 sur blanc · 4,61:1 sur son fond de badge", false],
    ["alerte", "#8f5808", "--color-alerte", "5,89:1 sur blanc · 5,35:1 sur son fond de badge", false],
    ["danger", "#b3261e", "--color-danger", "6,54:1 sur blanc · 5,72:1 sur son fond de badge", false],
  ]],
  ["Fonds d'état — codés en dur dans ui.tsx, hors du bloc @theme", [
    ["succes-fond", "#e8f4ed", "(aucune)", "Fond du badge et du message de succès", false],
    ["succes-bord", "#bcdcc9", "(aucune)", "Bordure associée", false],
    ["alerte-fond", "#fdf3e2", "(aucune)", "Fond du badge d'alerte", false],
    ["alerte-bord", "#eed9ae", "(aucune)", "Bordure associée", false],
    ["danger-fond", "#fdeceb", "(aucune)", "Fond du badge et du message d'erreur", false],
    ["danger-bord", "#f2c9c6", "(aucune)", "Bordure associée", false],
  ]],
];

const racine = figma.createAutoLayout("VERTICAL", {
  name: "Nuancier",
  itemSpacing: 40,
  paddingTop: 64, paddingBottom: 64, paddingLeft: 64, paddingRight: 64,
});
racine.fills = [{ type: "SOLID", color: rgb("#ffffff") }];
racine.x = 0;
racine.y = 0;

const titre = texte("Couleurs", 40, "Bold", ENCRE);
racine.appendChild(titre);

const chapo = texte(
  "Valeurs relevées dans plombeo/src/app/globals.css. Les ratios sont calculés, " +
  "pas estimés : chaque couleur de texte tient au moins 4,5:1 sur son fond réel.",
  14, "Regular", ATTENUE,
);
chapo.textAutoResize = "HEIGHT";
racine.appendChild(chapo);
chapo.layoutSizingHorizontal = "FIXED";
chapo.resize(720, chapo.height);

const cree = [];

for (const [nomGroupe, entrees] of GROUPES) {
  const bloc = figma.createAutoLayout("VERTICAL", { name: nomGroupe, itemSpacing: 12 });
  bloc.fills = [];
  racine.appendChild(bloc);

  const entete = texte(nomGroupe.toUpperCase(), 11, "Semi Bold", ATTENUE);
  entete.letterSpacing = { unit: "PERCENT", value: 8 };
  bloc.appendChild(entete);

  for (const [role, hex, css, note, alerte] of entrees) {
    const ligne = figma.createAutoLayout("HORIZONTAL", {
      name: role, itemSpacing: 20, counterAxisAlignItems: "CENTER",
    });
    ligne.fills = [];
    bloc.appendChild(ligne);

    const pastille = figma.createFrame();
    pastille.name = `pastille/${role}`;
    pastille.resize(72, 72);
    pastille.cornerRadius = 8;
    pastille.fills = [{ type: "SOLID", color: rgb(hex) }];
    pastille.strokes = [{ type: "SOLID", color: rgb("#d8dfe5") }];
    pastille.strokeWeight = 1;
    ligne.appendChild(pastille);

    const infos = figma.createAutoLayout("VERTICAL", { name: "infos", itemSpacing: 3 });
    infos.fills = [];
    ligne.appendChild(infos);

    infos.appendChild(texte(role, 16, "Semi Bold", ENCRE));
    infos.appendChild(texte(`${hex.toUpperCase()}   ${css}`, 12, "Regular", ATTENUE));
    infos.appendChild(texte(note, 12, alerte ? "Semi Bold" : "Regular", alerte ? DANGER : ATTENUE));

    cree.push(pastille.id);
  }
}

const avertissement = figma.createAutoLayout("VERTICAL", {
  name: "Avertissement — trait", itemSpacing: 8,
  paddingTop: 16, paddingBottom: 16, paddingLeft: 20, paddingRight: 20,
});
avertissement.fills = [{ type: "SOLID", color: rgb("#fdeceb") }];
avertissement.strokes = [{ type: "SOLID", color: rgb("#f2c9c6") }];
avertissement.strokeWeight = 1;
avertissement.cornerRadius = 8;
racine.appendChild(avertissement);
avertissement.appendChild(texte("À arbitrer — bordure des champs de saisie", 14, "Bold", DANGER));
const detail = texte(
  "« trait » (#d8dfe5) donne 1,35:1 contre le blanc. Sur une carte blanche, un " +
  "champ blanc n'est délimité que par cette bordure : rien ne signale où " +
  "commence la zone de saisie. Le seuil applicable aux éléments d'interface " +
  "porteurs de sens est de 3:1. Reproduit tel quel ici parce que ce fichier " +
  "reflète le code — la décision revient à l'équipe, pas au fichier Figma.",
  12, "Regular", ENCRE,
);
detail.textAutoResize = "HEIGHT";
avertissement.appendChild(detail);
detail.layoutSizingHorizontal = "FIXED";
detail.resize(640, detail.height);

await racine.screenshot();

return { pageId: page.id, racineId: racine.id, pastilles: cree.length, createdNodeIds: [racine.id, ...cree] };
