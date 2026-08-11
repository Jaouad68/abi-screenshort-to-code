/*
 * 03b — FONDATIONS : échelle typographique.
 *
 * L'échelle n'est pas décidée ici : elle est RELEVÉE dans le code. Les tailles
 * ci-dessous sont celles réellement employées par les écrans, avec leur
 * fréquence — ce qui montre du même coup que le système repose sur deux tailles
 * (14 et 24), le reste étant marginal.
 *
 * Le code utilise la pile de polices du système. Figma ne l'a pas ; Inter en est
 * l'approximation la plus proche et disponible partout. C'est la seule
 * approximation de tout ce jeu de scripts, et elle est signalée sur la page.
 */

const page = figma.root.children.find((p) => p.name === "Typographie");
if (!page) throw new Error("Page « Typographie » absente — exécuter 02-pages.js d'abord.");
await figma.setCurrentPageAsync(page);

await figma.loadFontAsync({ family: "Inter", style: "Regular" });
await figma.loadFontAsync({ family: "Inter", style: "Medium" });
await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
await figma.loadFontAsync({ family: "Inter", style: "Bold" });

function rgb(hex) {
  const n = hex.replace("#", "");
  return { r: parseInt(n.slice(0,2),16)/255, g: parseInt(n.slice(2,4),16)/255, b: parseInt(n.slice(4,6),16)/255 };
}
const ENCRE = rgb("#0f2f44"), ATTENUE = rgb("#5a6a76");

function texte(contenu, taille, style, couleur) {
  const t = figma.createText();
  t.fontName = { family: "Inter", style };
  t.characters = contenu;
  t.fontSize = taille;
  t.fills = [{ type: "SOLID", color: couleur }];
  return t;
}

/* [nom, px, graisse, usage réel, occurrences relevées dans src/app] */
const ECHELLE = [
  ["Titre de page", 24, "Bold", "Un seul par écran. Nom de l'entreprise, titre de section.", 46],
  ["Titre de bloc", 20, "Bold", "Rare — réservé aux pages sans en-tête.", 5],
  ["Sous-titre", 18, "Semi Bold", "Nom d'application dans l'en-tête.", 13],
  ["Corps", 16, "Regular", "Taille par défaut. Minimum sur les champs : en dessous, iOS zoome au focus.", 5],
  ["Secondaire", 14, "Regular", "La taille la plus employée : libellés, aides, méta-données.", 287],
  ["Mention", 12, "Semi Bold", "Badges, compteurs. Jamais pour du texte suivi.", 12],
];

const racine = figma.createAutoLayout("VERTICAL", {
  name: "Échelle typographique", itemSpacing: 36,
  paddingTop: 64, paddingBottom: 64, paddingLeft: 64, paddingRight: 64,
});
racine.fills = [{ type: "SOLID", color: rgb("#ffffff") }];
racine.x = 0; racine.y = 0;

racine.appendChild(texte("Typographie", 40, "Bold", ENCRE));

const chapo = texte(
  "Le code emploie la pile de polices du système (ui-sans-serif, system-ui…). " +
  "Inter la remplace ici, faute d'équivalent dans Figma : c'est une " +
  "approximation, la seule de ce fichier. Les tailles, elles, sont relevées " +
  "telles quelles dans src/app.",
  14, "Regular", ATTENUE,
);
chapo.textAutoResize = "HEIGHT";
racine.appendChild(chapo);
chapo.layoutSizingHorizontal = "FIXED";
chapo.resize(720, chapo.height);

const cree = [];

for (const [nom, px, graisse, usage, occurrences] of ECHELLE) {
  const bloc = figma.createAutoLayout("VERTICAL", { name: nom, itemSpacing: 6 });
  bloc.fills = [];
  racine.appendChild(bloc);

  const meta = texte(
    `${nom.toUpperCase()} · ${px} px · ${graisse} · ${occurrences} occurrences`,
    11, "Semi Bold", ATTENUE,
  );
  meta.letterSpacing = { unit: "PERCENT", value: 8 };
  bloc.appendChild(meta);

  bloc.appendChild(texte("Remplacement du groupe de sécurité", px, graisse, ENCRE));

  const note = texte(usage, 12, "Regular", ATTENUE);
  note.textAutoResize = "HEIGHT";
  bloc.appendChild(note);
  note.layoutSizingHorizontal = "FIXED";
  note.resize(640, note.height);

  cree.push(bloc.id);
}

const regle = figma.createAutoLayout("VERTICAL", {
  name: "Règle — 16 px sur les champs", itemSpacing: 8,
  paddingTop: 16, paddingBottom: 16, paddingLeft: 20, paddingRight: 20,
});
regle.fills = [{ type: "SOLID", color: rgb("#fdf3e2") }];
regle.strokes = [{ type: "SOLID", color: rgb("#eed9ae") }];
regle.strokeWeight = 1;
regle.cornerRadius = 8;
racine.appendChild(regle);
regle.appendChild(texte("Ne jamais descendre un champ sous 16 px", 14, "Bold", rgb("#8f5808")));
const detailRegle = texte(
  "En dessous de 16 px, iOS zoome automatiquement au moment où le champ prend " +
  "le focus. Sur un chantier, l'écran change d'échelle sans prévenir pendant " +
  "la saisie. La règle vaut pour input, select et textarea.",
  12, "Regular", ENCRE,
);
detailRegle.textAutoResize = "HEIGHT";
regle.appendChild(detailRegle);
detailRegle.layoutSizingHorizontal = "FIXED";
detailRegle.resize(640, detailRegle.height);

await racine.screenshot();

return { pageId: page.id, racineId: racine.id, blocs: cree.length, createdNodeIds: [racine.id, ...cree] };
