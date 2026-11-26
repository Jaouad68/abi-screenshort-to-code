// Découpage du film : chaque photo n'apparaît qu'une seule fois.
// Chaque plan dure environ 20 s avec un mouvement de caméra en plusieurs temps :
// k = images clés [t (0 à 1), zoom, x %, y %]. mode : "cover" plein cadre,
// "fit" image entière sur fond flouté, "card" carte postale posée.

export type Shot = {
  file: string;
  z?: [number, number];
  o?: [number, number, number, number];
  k?: [number, number, number, number][];
  mode?: "cover" | "fit" | "card";
};

export type Cap = { at: number; title: string; sub?: string };

export type Item = {
  sec: number;
  kind: "opening" | "photo" | "map" | "end";
  shot?: Shot;
  chapter?: { n: string; title: string; sub: string };
  caps?: Cap[];
  first?: boolean;
};

export const timeline: Item[] = [
  // Ouverture : le château et son reflet
  {
    sec: 20, kind: "opening", first: true,
    shot: { file: "chateau-reflet.jpg", k: [[0, 1.0, 50, 40], [0.55, 1.1, 55, 42], [1, 1.45, 64, 26]] },
  },
  { sec: 12, kind: "map" },
  {
    sec: 13, kind: "photo",
    shot: { file: "carte-dunois.jpg", k: [[0, 1.6, 58, 47], [1, 1.25, 56, 50]] },
    caps: [{ at: 1, title: "Au cœur du Dunois", sub: "Entre Beauce et Perche, sur les bords du Loir" }],
  },

  // I. Le château
  {
    sec: 25, kind: "photo", chapter: { n: "I", title: "Le château", sub: "Une forteresse devenue palais" },
    shot: { file: "chateau-donjon.jpg", k: [[0, 1.08, 50, 45], [0.45, 1.0, 50, 45], [1, 1.55, 66, 28]] },
    caps: [
      { at: 0, title: "La grosse tour", sub: "Le donjon du XIIe siècle domine toujours la ville" },
      { at: 16, title: "Gothique et Renaissance", sub: "Deux époques réunies dans une même silhouette" },
    ],
  },
  {
    sec: 22, kind: "photo",
    shot: { file: "rue-chateau.jpg", k: [[0, 1.0, 40, 60], [0.4, 1.1, 45, 55], [1, 1.8, 64, 28]] },
    caps: [
      { at: 1, title: "Aux portes du château", sub: "Ruelles pavées et vieux murs de pierre" },
      { at: 12, title: "Un décor Renaissance", sub: "Loggias sculptées et tourelles au-dessus des toits" },
    ],
  },
  {
    sec: 18, kind: "photo",
    shot: { file: "allee-donjon.jpg", mode: "fit", z: [1.0, 1.08] },
    caps: [{ at: 1, title: "L'allée du château", sub: "Le donjon au bout du chemin pavé" }],
  },
  {
    sec: 18, kind: "photo",
    shot: { file: "boiseries.jpg", mode: "fit", z: [1.0, 1.08] },
    caps: [{ at: 1, title: "Boiseries et fleurs de lys", sub: "Le décor des intérieurs du château" }],
  },

  // II. La vieille ville
  {
    sec: 24, kind: "photo", chapter: { n: "II", title: "La vieille ville", sub: "Pans de bois et grande place" },
    shot: { file: "maison-vierge.jpg", k: [[0, 1.08, 50, 50], [0.5, 1.0, 45, 55], [1, 1.9, 39, 56]] },
    caps: [
      { at: 0, title: "La maison de la Vierge", sub: "Une façade à pans de bois remarquable" },
      { at: 16, title: "Sous la protection de la Vierge", sub: "La statue qui a donné son nom à la maison" },
    ],
  },
  {
    sec: 22, kind: "photo",
    shot: { file: "fontaine.jpg", k: [[0, 1.0, 50, 50], [0.4, 1.2, 50, 30], [0.7, 1.75, 48, 10], [1, 1.6, 50, 66]] },
    caps: [
      { at: 1, title: "La fontaine monumentale", sub: "Pièce maîtresse de la place du 18-Octobre" },
      { at: 12, title: "Un aigle au sommet", sub: "Il couronne le lanternon de la fontaine" },
    ],
  },
  {
    sec: 22, kind: "photo",
    shot: { file: "place-soir.jpg", k: [[0, 1.0, 55, 50], [0.5, 1.1, 58, 50], [1, 1.6, 62, 44]] },
    caps: [
      { at: 1, title: "La place au soleil couchant", sub: "Façades claires et hautes cheminées de briques" },
      { at: 13, title: "L'hôtel de ville", sub: "Au fond de la place, sous son campanile" },
    ],
  },

  // III. 18 octobre 1870
  {
    sec: 24, kind: "photo", chapter: { n: "III", title: "18 octobre 1870", sub: "Une ville entrée dans l'histoire" },
    shot: { file: "bataille-1870.jpg", k: [[0, 1.08, 50, 50], [0.5, 1.0, 50, 50], [1, 1.75, 26, 34]] },
    caps: [
      { at: 0, title: "La bataille de Châteaudun", sub: "Face à l'armée prussienne, la ville se défend" },
      { at: 16, title: "Autour de la fontaine", sub: "Les combats gagnent le cœur de la grande place" },
    ],
  },
  {
    sec: 20, kind: "photo",
    shot: { file: "carte-1870.jpg", mode: "card", z: [1.0, 1.1] },
    caps: [
      { at: 1, title: "Le dernier combat", sub: "D'après le tableau de Philippoteaux, à l'hôtel de ville" },
      { at: 11, title: "Une mémoire vivante", sub: "La grande place porte le nom de cette journée" },
    ],
  },

  // IV. Le quartier Kellermann
  {
    sec: 20, kind: "photo", chapter: { n: "IV", title: "Le quartier Kellermann", sub: "D'une caserne à un nouveau quartier" },
    shot: { file: "kellermann-cp.jpg", mode: "card", z: [1.0, 1.1] },
    caps: [{ at: 0, title: "Autrefois, une caserne", sub: "Carte postale ancienne : l'entrée et le corps de garde" }],
  },
  {
    sec: 24, kind: "photo",
    shot: { file: "kellermann-aujourdhui.jpg", k: [[0, 1.0, 50, 45], [0.45, 1.1, 50, 48], [0.75, 1.75, 50, 32], [1, 1.5, 50, 85]] },
    caps: [
      { at: 1, title: "Aujourd'hui", sub: "Le bâtiment restauré, face à un parc et à un bassin" },
      { at: 13, title: "Brique et pierre", sub: "La façade d'origine a retrouvé son éclat" },
    ],
  },

  // Fin
  { sec: 15, kind: "end" },
];

export const credits: string[] = [
  "Château vu du Loir · Château et grosse tour · Rue menant au château",
  "Allée du donjon · Boiseries du château · Maison de la Vierge",
  "Place du 18-Octobre et hôtel de ville · Fontaine monumentale",
  "Lithographie en couleurs : la bataille de Châteaudun, 1870",
  "Carte postale « 18 octobre 1870, le dernier combat » (d'après Philippoteaux)",
  "Carte postale « Châteaudun, quartier Kellermann » · Quartier Kellermann aujourd'hui",
  "Carte des communes du Dunois",
  "Images fournies pour ce film, droits réservés à leurs auteurs.",
];
