/**
 * Lycées du Val d'Oise (95).
 *
 * Source : Annuaire de l'Éducation nationale (data.education.gouv.fr,
 * jeu de données « fr-en-annuaire-education »), filtre
 * code_departement = 095 et type_etablissement = Lycée.
 * Les « sections d'enseignement professionnel » (SEP), qui sont rattachées
 * à un lycée polyvalent déjà présent dans la liste, sont exclues.
 *
 * Pour rafraîchir cette liste : `npm run import:lycees`.
 */

export type Secteur = "Public" | "Privé";

/** G = voie générale, T = technologique, P = professionnelle. */
export type Voie = "G" | "T" | "P";

export interface Lycee {
  uai: string;
  nom: string;
  commune: string;
  secteur: Secteur;
  voies: Voie[];
  lat: number;
  lng: number;
}

type Row = [uai: string, nom: string, commune: string, prive: 0 | 1, voies: string, lat: number, lng: number];

// prettier-ignore
const ROWS: Row[] = [
  ["0950648N", "Lycée Jean-Jacques Rousseau", "Montmorency", 0, "GT", 48.990195, 2.317699],
  ["0950645K", "Lycée Van Gogh", "Ermont", 0, "GT", 48.982645, 2.252282],
  ["0950804H", "Lycée professionnel Notre-Famille", "Osny", 1, "P", 49.059309, 2.069937],
  ["0952208J", "Lycée Saint-Joseph", "Argenteuil", 1, "G", 48.959974, 2.238291],
  ["0950786N", "Lycée La Salle Saint-Rosaire", "Sarcelles", 1, "GT", 48.991575, 2.374455],
  ["0951090U", "Lycée Pierre Mendès France", "Villiers-le-Bel", 0, "GP", 49.004577, 2.416046],
  ["0950667J", "Lycée Romain Rolland", "Goussainville", 0, "GTP", 49.030088, 2.452849],
  ["0950761L", "Lycée Notre-Dame-de-la-Compassion", "Pontoise", 1, "GTP", 49.052231, 2.09948],
  ["0950649P", "Lycée Camille Pissarro", "Pontoise", 0, "GTP", 49.056975, 2.090345],
  ["0951281B", "Lycée professionnel Turgot", "Montmorency", 0, "P", 48.985021, 2.32131],
  ["0951673C", "Lycée Gustave Eiffel", "Ermont", 0, "P", 48.98436, 2.244474],
  ["0951766D", "Lycée Simone de Beauvoir", "Garges-lès-Gonesse", 0, "GT", 48.966829, 2.409566],
  ["0950947N", "Lycée Maryse-Condé", "Sarcelles", 0, "GTP", 48.992936, 2.382881],
  ["0951974E", "Lycée Louis Armand", "Eaubonne", 0, "GP", 48.99563, 2.287552],
  ["0952273E", "École Torah Or", "Sarcelles", 1, "", 48.982209, 2.390979],
  ["0952157D", "Lycée Nature et Services Saint-Jean", "Sannois", 1, "P", 48.970189, 2.237266],
  ["0950640E", "Lycée Julie-Victoire Daubié", "Argenteuil", 0, "GT", 48.952686, 2.234744],
  ["0951104J", "Lycée Jean Perrin", "Saint-Ouen-l'Aumône", 0, "GTP", 49.05795, 2.130162],
  ["0951399E", "Lycée Alfred Kastler", "Cergy", 0, "GT", 49.034669, 2.08472],
  ["0951994B", "Lycée ORT", "Villiers-le-Bel", 1, "GTP", 48.99432, 2.409859],
  ["0950785M", "Lycée Notre-Dame", "Sannois", 1, "GT", 48.973939, 2.254657],
  ["0951940T", "Lycée Ozar Hatorah", "Sarcelles", 1, "G", 48.982782, 2.389436],
  ["0951811C", "Lycée Fernand et Nadia Léger", "Argenteuil", 0, "GTP", 48.951595, 2.226456],
  ["0952134D", "École Beth Yaacov", "Sarcelles", 1, "", 48.981214, 2.375474],
  ["0952343F", "Factory Academy", "Argenteuil", 1, "P", 48.947615, 2.227372],
  ["0952212N", "Lycée de la Nouvelle Chance", "Pontoise", 0, "", 49.03348, 2.088621],
  ["0950800D", "Lycée Cognacq-Jay", "Argenteuil", 1, "P", 48.943351, 2.25044],
  ["0950656X", "Lycée professionnel Le Corbusier", "Cormeilles-en-Parisis", 0, "P", 48.978929, 2.199731],
  ["0951937P", "Lycée Paul-Émile Victor", "Osny", 0, "GP", 49.06969, 2.068838],
  ["0950657Y", "Lycée professionnel Ferdinand Buisson", "Ermont", 0, "P", 48.979719, 2.271944],
  ["0951723G", "Lycée Montesquieu", "Herblay-sur-Seine", 0, "GT", 48.999975, 2.146164],
  ["0950759J", "Lycée Notre-Dame de Bury", "Margency", 1, "GT", 49.002273, 2.28195],
  ["0951147F", "Lycée Fragonard", "L'Isle-Adam", 0, "GT", 49.11643, 2.224465],
  ["0950812S", "Lycée Jeanne d'Arc", "Franconville", 1, "GP", 48.988314, 2.230244],
  ["0950709E", "Lycée professionnel Virginia Henderson", "Arnouville", 0, "P", 48.985437, 2.407255],
  ["0951787B", "Lycée Arthur Rimbaud", "Garges-lès-Gonesse", 0, "P", 48.969313, 2.395196],
  ["0950658Z", "Lycée Château d'Épluches", "Saint-Ouen-l'Aumône", 0, "P", 49.055163, 2.131906],
  ["0951282C", "Lycée professionnel régional du Vexin", "Chars", 0, "P", 49.156893, 1.943413],
  ["0951998F", "ENPA, École nationale des professions de l'automobile", "Argenteuil", 1, "P", 48.943795, 2.244618],
  ["0950641F", "Lycée Jean Jaurès", "Argenteuil", 0, "GTP", 48.939939, 2.226185],
  ["0951748J", "Lycée Évariste Galois", "Beaumont-sur-Oise", 0, "GTP", 49.146401, 2.294858],
  ["0951221L", "Lycée Vauban", "Pontoise", 1, "GTP", 49.051276, 2.097019],
  ["0950805J", "Lycée professionnel Saint-Jean", "Sannois", 1, "P", 48.970189, 2.237266],
  ["0950753C", "Lycée Notre-Dame Providence", "Enghien-les-Bains", 1, "G", 48.967415, 2.311985],
  ["0952284S", "Lycée Philippe Kieffer", "Cormeilles-en-Parisis", 0, "", 48.960229, 2.187298],
  ["0951722F", "Lycée Jean Monnet", "Franconville", 0, "GT", 48.991081, 2.214792],
  ["0951824S", "Lycée de l'Hautil", "Jouy-le-Moutier", 0, "GTP", 49.009759, 2.026327],
  ["0952158E", "Lycée Paul Ricœur", "Louvres", 1, "G", 49.043675, 2.50821],
  ["0952173W", "Lycée Paulette Nardal", "Bezons", 0, "GP", 48.921608, 2.21541],
  ["0951618T", "Lycée Auguste Escoffier", "Éragny", 0, "P", 49.021927, 2.108345],
  ["0950651S", "Lycée Jacques Prévert", "Taverny", 0, "GT", 49.014893, 2.210733],
  ["0951763A", "Lycée Louis Jouvet", "Taverny", 0, "GTP", 49.019492, 2.208604],
  ["0950666H", "Lycée Georges Braque", "Argenteuil", 0, "GTP", 48.950536, 2.250704],
  ["0951727L", "Lycée Charles Baudelaire", "Fosses", 0, "GTP", 49.101541, 2.505006],
  ["0951710T", "Lycée Camille Claudel", "Vauréal", 0, "GTP", 49.033256, 2.022028],
  ["0950646L", "Lycée René Cassin", "Gonesse", 0, "GT", 48.984749, 2.430034],
  ["0950650R", "Lycée Jean-Jacques Rousseau", "Sarcelles", 0, "GTP", 48.993993, 2.384751],
  ["0951753P", "Lycée Léonard de Vinci", "Saint-Witz", 0, "GT", 49.087751, 2.560343],
  ["0951922Y", "Lycée Camille Saint-Saëns", "Deuil-la-Barre", 0, "GT", 48.971962, 2.3362],
  ["0951788C", "Lycée George Sand", "Domont", 0, "GTP", 49.027079, 2.339673],
  ["0950647M", "Lycée Gérard de Nerval", "Luzarches", 0, "GT", 49.108124, 2.42498],
  ["0951756T", "Lycée Jules Verne", "Cergy", 0, "GTP", 49.05179, 2.00983],
  ["0951048Y", "Lycée Torat Emet", "Sarcelles", 1, "G", 48.981214, 2.375474],
  ["0952196W", "Lycée Gustave Monod", "Enghien-les-Bains", 0, "GTP", 48.971996, 2.295734],
  ["0951637N", "Lycée Galilée", "Cergy", 0, "GT", 49.045728, 2.030137],
  ["0950762M", "Lycée Saint-Martin de France", "Pontoise", 1, "G", 49.041028, 2.094249],
  ["0950949R", "Lycée professionnel Jean Mermoz", "Montsoult", 0, "P", 49.067086, 2.323093],
  ["0951728M", "Lycée Edmond Rostand", "Saint-Ouen-l'Aumône", 0, "GTP", 49.039125, 2.1169],
];

const collator = new Intl.Collator("fr", { sensitivity: "base" });

export const LYCEES: Lycee[] = ROWS.map(([uai, nom, commune, prive, voies, lat, lng]) => ({
  uai,
  nom,
  commune,
  secteur: (prive ? "Privé" : "Public") as Secteur,
  voies: voies.split("") as Voie[],
  lat,
  lng,
})).sort((a, b) => collator.compare(a.commune, b.commune) || collator.compare(a.nom, b.nom));

const BY_UAI = new Map(LYCEES.map((l) => [l.uai, l]));

export function getLycee(uai: string): Lycee | undefined {
  return BY_UAI.get(uai.toUpperCase());
}

export const COMMUNES: string[] = [...new Set(LYCEES.map((l) => l.commune))].sort(collator.compare);

const VOIE_LABEL: Record<Voie, string> = { G: "Général", T: "Techno", P: "Pro" };

export function voiesLabel(l: Lycee): string {
  return l.voies.length ? l.voies.map((v) => VOIE_LABEL[v]).join(" · ") : "Enseignement secondaire";
}

/** Normalise une chaîne pour la recherche (minuscules, sans accents). */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
