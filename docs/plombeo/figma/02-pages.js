/*
 * 02 — SQUELETTE DE PAGES.
 *
 * Une page par composant (ou par famille tenant ensemble), plus les pages de
 * documentation. Les séparateurs `———` ne sont pas décoratifs : dans le panneau
 * de pages, ils remplacent le fait qu'on ne puisse pas replier des groupes.
 *
 * `figma.createPage()` n'existe qu'en fichier Design. Ce script échouera dans
 * un FigJam ou des Slides, ce qui est le comportement voulu.
 */

const ATTENDUES = [
  "Couverture",
  "Comment lire ce fichier",
  "——— FONDATIONS ———",
  "Couleurs",
  "Typographie",
  "Espacement et rayons",
  "——— COMPOSANTS ———",
  "Bouton",
  "Formulaires",
  "Conteneurs",
  "Signaux",
];

const existantes = figma.root.children.map((p) => p.name);
const creees = [];

for (const nom of ATTENDUES) {
  if (existantes.includes(nom)) continue;
  const page = figma.createPage();
  page.name = nom;
  creees.push({ nom, id: page.id });
}

/*
 * La page « Page 1 » d'origine ne sert plus à rien une fois le squelette posé.
 * On ne la supprime QUE si elle est vide et qu'elle porte encore son nom par
 * défaut : supprimer une page où quelqu'un a travaillé serait impardonnable.
 */
const parDefaut = figma.root.children.find(
  (p) => (p.name === "Page 1" || p.name === "Page 1 ") && p.children.length === 0,
);
let supprimee = null;
if (parDefaut && figma.root.children.length > 1) {
  supprimee = parDefaut.name;
  parDefaut.remove();
}

return {
  pagesCreees: creees,
  pageParDefautSupprimee: supprimee,
  pagesFinales: figma.root.children.map((p) => ({ id: p.id, nom: p.name })),
};
