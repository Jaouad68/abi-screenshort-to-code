// Découpage du film : chaque ligne est un plan.
// z = zoom début/fin, o = point de cadrage début/fin en % (x0, y0, x1, y1)
// mode : "cover" plein cadre, "fit" image entière sur fond flouté, "card" carte postale posée.

export type Shot = {
  file: string;
  z?: [number, number];
  o?: [number, number, number, number];
  mode?: "cover" | "fit" | "card";
};

export type Item = {
  sec: number;
  kind: "opening" | "photo" | "chapter" | "map" | "end";
  shot?: Shot;
  title?: string;
  sub?: string;
  n?: string;
  first?: boolean;
};

const reflet = "chateau-reflet.jpg";
const rue = "rue-chateau.jpg";
const fontaine = "fontaine.jpg";
const place = "place-soir.jpg";
const k1870 = "carte-1870.jpg";
const kel = "kellermann-aujourdhui.jpg";

export const timeline: Item[] = [
  // Ouverture
  { sec: 14, kind: "opening", first: true, shot: { file: reflet, z: [1.0, 1.12], o: [55, 40, 55, 45] } },
  { sec: 14, kind: "map" },

  // Chapitre 1 : le château
  { sec: 8, kind: "chapter", n: "I", title: "Le château", sub: "Une forteresse devenue palais", shot: { file: rue, z: [1.04, 1.14], o: [45, 45, 50, 50] } },
  { sec: 10, kind: "photo", shot: { file: reflet, z: [1.0, 1.08], o: [50, 35, 50, 45] }, title: "Le château de Châteaudun", sub: "Dressé sur son éperon rocheux, il domine la vallée du Loir" },
  { sec: 8, kind: "photo", shot: { file: reflet, z: [1.7, 1.85], o: [62, 22, 70, 25] }, title: "Gothique et Renaissance", sub: "Deux époques réunies dans une même silhouette" },
  { sec: 7, kind: "photo", shot: { file: reflet, z: [1.4, 1.55], o: [42, 82, 56, 74] } },
  { sec: 9, kind: "photo", shot: { file: rue, z: [1.0, 1.1], o: [40, 60, 45, 55] }, title: "Aux portes du château", sub: "Ruelles pavées et vieux murs de pierre" },
  { sec: 8, kind: "photo", shot: { file: rue, z: [1.8, 1.95], o: [63, 24, 66, 30] }, title: "Un décor Renaissance", sub: "Loggias sculptées et tourelles au-dessus des toits" },
  { sec: 8, kind: "photo", shot: { file: rue, z: [1.65, 1.8], o: [12, 32, 24, 38] }, title: "La Sainte-Chapelle", sub: "Et, à ses côtés, la grosse tour du XIIe siècle" },
  { sec: 9, kind: "photo", shot: { file: "allee-donjon.jpg", mode: "fit", z: [1.0, 1.06] }, title: "Le donjon", sub: "Il veille sur la cité depuis le Moyen Âge" },
  { sec: 8, kind: "photo", shot: { file: reflet, z: [1.3, 1.18], o: [28, 42, 32, 44] }, title: "Un monument national", sub: "Géré par le Centre des monuments nationaux" },

  // Chapitre 2 : la place du 18-Octobre
  { sec: 8, kind: "chapter", n: "II", title: "La grande place", sub: "Le cœur battant de la ville", shot: { file: fontaine, z: [1.06, 1.16], o: [50, 40, 50, 45] } },
  { sec: 10, kind: "photo", shot: { file: fontaine, z: [1.0, 1.1], o: [50, 45, 50, 50] }, title: "La fontaine monumentale", sub: "Pièce maîtresse de la place du 18-Octobre" },
  { sec: 8, kind: "photo", shot: { file: fontaine, z: [1.8, 1.95], o: [48, 8, 48, 16] }, title: "Un aigle au sommet", sub: "Il couronne le lanternon de la fontaine" },
  { sec: 9, kind: "photo", shot: { file: fontaine, z: [1.6, 1.7], o: [30, 68, 70, 68] }, title: "Des vasques sculptées", sub: "Mascarons et filets d'eau" },
  { sec: 10, kind: "photo", shot: { file: place, z: [1.0, 1.1], o: [60, 50, 58, 52] }, title: "La place au soleil couchant", sub: "Façades claires et hautes cheminées de briques" },
  { sec: 8, kind: "photo", shot: { file: place, z: [1.6, 1.72], o: [62, 46, 60, 42] }, title: "L'hôtel de ville", sub: "Au fond de la place, sous son campanile" },
  { sec: 7, kind: "photo", shot: { file: place, z: [1.5, 1.6], o: [24, 36, 28, 30] } },

  // Chapitre 3 : 18 octobre 1870
  { sec: 8, kind: "chapter", n: "III", title: "18 octobre 1870", sub: "Une ville entrée dans l'histoire", shot: { file: k1870, z: [1.1, 1.2], o: [50, 50, 55, 45] } },
  { sec: 11, kind: "photo", shot: { file: k1870, mode: "card", z: [1.0, 1.06] }, title: "Le dernier combat", sub: "D'après le tableau de Philippoteaux, à l'hôtel de ville" },
  { sec: 8, kind: "photo", shot: { file: k1870, z: [1.7, 1.8], o: [68, 72, 74, 70] }, title: "Une résistance acharnée", sub: "Face à l'armée prussienne, la ville se défend" },
  { sec: 8, kind: "photo", shot: { file: k1870, z: [1.6, 1.7], o: [55, 30, 62, 34] }, title: "La ville en flammes", sub: "Une grande partie de Châteaudun est incendiée" },
  { sec: 9, kind: "photo", shot: { file: place, z: [1.18, 1.06], o: [55, 55, 55, 50] }, title: "Une mémoire vivante", sub: "La grande place porte le nom de cette journée" },

  // Chapitre 4 : le quartier Kellermann
  { sec: 8, kind: "chapter", n: "IV", title: "Le quartier Kellermann", sub: "D'une caserne à un nouveau quartier", shot: { file: kel, z: [1.06, 1.14], o: [50, 40, 50, 45] } },
  { sec: 10, kind: "photo", shot: { file: "kellermann-cp.jpg", mode: "card", z: [1.0, 1.06] }, title: "Autrefois, une caserne", sub: "Carte postale ancienne : l'entrée et le corps de garde" },
  { sec: 8, kind: "photo", shot: { file: "kellermann-cp-portrait.jpg", mode: "card", z: [1.0, 1.07] }, title: "Devant la grille", sub: "Les soldats posent pour le photographe" },
  { sec: 11, kind: "photo", shot: { file: kel, z: [1.0, 1.08], o: [50, 40, 50, 48] }, title: "Aujourd'hui", sub: "Le bâtiment restauré, face à un parc et à un bassin" },
  { sec: 8, kind: "photo", shot: { file: kel, z: [1.5, 1.6], o: [50, 88, 50, 78] } },
  { sec: 8, kind: "photo", shot: { file: kel, z: [1.8, 1.92], o: [48, 32, 54, 34] }, title: "Brique et pierre", sub: "La façade d'origine a retrouvé son éclat" },

  // Chapitre 5 : le Dunois
  { sec: 7, kind: "chapter", n: "V", title: "Le Dunois", sub: "Entre Beauce et Perche", shot: { file: "carte-dunois.jpg", z: [1.1, 1.2], o: [58, 48, 58, 50] } },
  { sec: 10, kind: "photo", shot: { file: "carte-dunois.jpg", z: [1.5, 1.35], o: [58, 47, 56, 50] }, title: "Au cœur de son territoire", sub: "Châteaudun et les communes qui l'entourent" },
  { sec: 7, kind: "photo", shot: { file: reflet, z: [1.12, 1.0], o: [50, 45, 50, 40] } },

  // Fin
  { sec: 15, kind: "end" },
];

export const credits: string[] = [
  "Château vu du Loir · Rue menant au château · Allée du donjon",
  "Place du 18-Octobre et hôtel de ville · Fontaine monumentale",
  "Quartier Kellermann aujourd'hui · Carte des communes du Dunois",
  "Cartes postales anciennes : « 18 octobre 1870, le dernier combat »",
  "(d'après Philippoteaux) · « Châteaudun, quartier Kellermann »",
  "Images fournies pour ce film, droits réservés à leurs auteurs.",
];
