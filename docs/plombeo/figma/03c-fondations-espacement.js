/*
 * 03c — FONDATIONS : espacement, rayons, cible tactile.
 *
 * La barre des 44 px est dessinée à l'échelle, avec un rectangle de 32 px à
 * côté. Une règle écrite se contourne ; une règle qu'on voit trop petite se
 * respecte.
 */

const page = figma.root.children.find((p) => p.name === "Espacement et rayons");
if (!page) throw new Error("Page « Espacement et rayons » absente — exécuter 02-pages.js d'abord.");
await figma.setCurrentPageAsync(page);

await figma.loadFontAsync({ family: "Inter", style: "Regular" });
await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
await figma.loadFontAsync({ family: "Inter", style: "Bold" });

function rgb(hex) {
  const n = hex.replace("#", "");
  return { r: parseInt(n.slice(0,2),16)/255, g: parseInt(n.slice(2,4),16)/255, b: parseInt(n.slice(4,6),16)/255 };
}
const ENCRE = rgb("#0f2f44"), ATTENUE = rgb("#5a6a76"), ACTION = rgb("#b04a0d"), TRAIT = rgb("#d8dfe5");

function texte(contenu, taille, style, couleur) {
  const t = figma.createText();
  t.fontName = { family: "Inter", style };
  t.characters = contenu;
  t.fontSize = taille;
  t.fills = [{ type: "SOLID", color: couleur }];
  return t;
}

const racine = figma.createAutoLayout("VERTICAL", {
  name: "Espacement et rayons", itemSpacing: 40,
  paddingTop: 64, paddingBottom: 64, paddingLeft: 64, paddingRight: 64,
});
racine.fills = [{ type: "SOLID", color: rgb("#ffffff") }];
racine.x = 0; racine.y = 0;
racine.appendChild(texte("Espacement, rayons et cibles", 40, "Bold", ENCRE));

const cree = [];

/* --- Cible tactile : la contrainte transverse ------------------------ */
const blocCible = figma.createAutoLayout("VERTICAL", { name: "Cible tactile", itemSpacing: 14 });
blocCible.fills = [];
racine.appendChild(blocCible);

const enteteCible = texte("CIBLE TACTILE — 44 PX MINIMUM", 11, "Semi Bold", ATTENUE);
enteteCible.letterSpacing = { unit: "PERCENT", value: 8 };
blocCible.appendChild(enteteCible);

const comparaison = figma.createAutoLayout("HORIZONTAL", {
  name: "Comparaison", itemSpacing: 24, counterAxisAlignItems: "MAX",
});
comparaison.fills = [];
blocCible.appendChild(comparaison);

for (const [hauteur, libelle, conforme] of [[44, "44 px — conforme", true], [32, "32 px — trop petit", false]]) {
  const colonne = figma.createAutoLayout("VERTICAL", { name: libelle, itemSpacing: 8, counterAxisAlignItems: "CENTER" });
  colonne.fills = [];
  comparaison.appendChild(colonne);

  const bouton = figma.createAutoLayout("HORIZONTAL", {
    name: "exemple", paddingLeft: 20, paddingRight: 20,
    counterAxisAlignItems: "CENTER", primaryAxisAlignItems: "CENTER",
  });
  bouton.fills = [{ type: "SOLID", color: conforme ? ACTION : TRAIT }];
  bouton.cornerRadius = 8;
  colonne.appendChild(bouton);
  bouton.layoutSizingVertical = "FIXED";
  bouton.resize(180, hauteur);
  const etiquette = texte("Démarrer", 14, "Semi Bold", conforme ? rgb("#ffffff") : ATTENUE);
  bouton.appendChild(etiquette);

  colonne.appendChild(texte(libelle, 12, conforme ? "Semi Bold" : "Regular", conforme ? ENCRE : ATTENUE));
  cree.push(bouton.id);
}

const noteCible = texte(
  "44 px est le seuil en dessous duquel une saisie au pouce devient imprécise. " +
  "Il s'applique à toute cible : bouton, champ, lien de navigation, bouton de " +
  "révocation. Dans le code : la classe min-h-11.",
  12, "Regular", ATTENUE,
);
noteCible.textAutoResize = "HEIGHT";
blocCible.appendChild(noteCible);
noteCible.layoutSizingHorizontal = "FIXED";
noteCible.resize(640, noteCible.height);

/* --- Rayons ---------------------------------------------------------- */
const blocRayons = figma.createAutoLayout("VERTICAL", { name: "Rayons", itemSpacing: 14 });
blocRayons.fills = [];
racine.appendChild(blocRayons);
const enteteRayons = texte("RAYONS", 11, "Semi Bold", ATTENUE);
enteteRayons.letterSpacing = { unit: "PERCENT", value: 8 };
blocRayons.appendChild(enteteRayons);

const rangeeRayons = figma.createAutoLayout("HORIZONTAL", { name: "rangée", itemSpacing: 24 });
rangeeRayons.fills = [];
blocRayons.appendChild(rangeeRayons);

for (const [nom, valeur, css] of [["carte", 12, "--radius-carte"], ["contrôle", 8, "--radius-controle"]]) {
  const colonne = figma.createAutoLayout("VERTICAL", { name: nom, itemSpacing: 8 });
  colonne.fills = [];
  rangeeRayons.appendChild(colonne);

  const forme = figma.createFrame();
  forme.name = `rayon/${nom}`;
  forme.resize(120, 80);
  forme.cornerRadius = valeur;
  forme.fills = [{ type: "SOLID", color: rgb("#f4f6f8") }];
  forme.strokes = [{ type: "SOLID", color: TRAIT }];
  forme.strokeWeight = 1;
  colonne.appendChild(forme);
  colonne.appendChild(texte(`${nom} — ${valeur} px`, 12, "Semi Bold", ENCRE));
  colonne.appendChild(texte(css, 11, "Regular", ATTENUE));
  cree.push(forme.id);
}

/* --- Espacements ----------------------------------------------------- */
const blocEspaces = figma.createAutoLayout("VERTICAL", { name: "Espacements", itemSpacing: 10 });
blocEspaces.fills = [];
racine.appendChild(blocEspaces);
const enteteEspaces = texte("ESPACEMENTS", 11, "Semi Bold", ATTENUE);
enteteEspaces.letterSpacing = { unit: "PERCENT", value: 8 };
blocEspaces.appendChild(enteteEspaces);

for (const [nom, valeur, usage] of [
  ["1", 4, "Interligne serré d'un groupe étiquette + valeur"],
  ["1-5", 6, "Écart libellé / champ"],
  ["2", 8, "Écart entre badges"],
  ["3", 12, "Écart entre cartes d'une grille"],
  ["4", 16, "Écart entre blocs d'un formulaire"],
  ["5", 20, "Rembourrage intérieur d'une carte"],
  ["6", 24, "Séparation entre sections"],
]) {
  const ligne = figma.createAutoLayout("HORIZONTAL", { name: nom, itemSpacing: 16, counterAxisAlignItems: "CENTER" });
  ligne.fills = [];
  blocEspaces.appendChild(ligne);

  const barre = figma.createRectangle();
  barre.name = `espacement/${nom}`;
  barre.resize(valeur, 20);
  barre.fills = [{ type: "SOLID", color: ACTION }];
  barre.cornerRadius = 2;
  ligne.appendChild(barre);

  const etiquette = texte(`${valeur} px`, 12, "Semi Bold", ENCRE);
  ligne.appendChild(etiquette);
  etiquette.layoutSizingHorizontal = "FIXED";
  etiquette.resize(56, etiquette.height);

  ligne.appendChild(texte(usage, 12, "Regular", ATTENUE));
  cree.push(barre.id);
}

await racine.screenshot();

return { pageId: page.id, racineId: racine.id, elements: cree.length, createdNodeIds: [racine.id, ...cree] };
