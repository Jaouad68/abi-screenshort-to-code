/**
 * Détection des lycées du 95 cités dans un titre d'article (veille presse).
 *
 * Pour limiter les faux positifs, un article n'est rattaché à un lycée que si
 * son titre contient à la fois « lycée <nom> » et la ville du lycée, ainsi
 * qu'un mot-clé de mobilisation (blocus, grève…).
 */

import { COMMUNES, LYCEES, normalize, type Lycee } from "@/data/lycees";

export interface RssItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

/** Normalisation pour la recherche : minuscules, sans accents ni ponctuation. */
export function simplify(s: string): string {
  return ` ${normalize(s).replace(/[^a-z0-9]+/g, " ").trim()} `;
}

const KEYWORDS = /\b(blocus|bloque|bloques|bloquee|bloquees|blocage|blocages|bloquent|greve|greves|mobilisation|mobilises|manifestation|manifestations|manifestent|rassemblement|rassemblements|incident|incidents|ferme|fermes|fermee|fermees|fermeture|evacue|evacuation|police|poubelles)\b/;

/** Anciens noms ou noms d'usage encore employés par la presse. */
const EXTRA_ALIASES: Record<string, string[]> = {
  "0952173W": ["eugene ronceray", "ronceray"], // Paulette Nardal (Bezons), ex-lycée Eugène-Ronceray
  "0950947N": ["la tourelle", "tourelle"], // Maryse-Condé (Sarcelles), ex-lycée de la Tourelle
  "0950658Z": ["chateau d epluches", "epluches"],
};

/** Noms trop courants pour servir seuls d'alias (« lycée Jean »…). */
const GENERIC = new Set(["jean", "notre", "dame", "saint", "joseph", "martin", "france", "jacques", "nouvelle", "chance"]);

const PREFIX = /^(lycee|ecole|enpa|section)( (professionnel|polyvalent|prive|regional|general|technologique))*( (de|du|des|d|la|le|l))?\s*/;

function aliasesFor(l: Lycee): string[] {
  const base = simplify(l.nom.split(",")[0]).trim().replace(PREFIX, "").trim();
  const out = new Set<string>();
  if (base) out.add(base);
  const tokens = base.split(" ");
  const last = tokens[tokens.length - 1];
  // Nom de famille seul (« lycée Pissarro », « lycée Léger »), s'il est assez distinctif.
  if (tokens.length >= 2 && last.length >= 4 && !GENERIC.has(last)) out.add(last);
  for (const a of EXTRA_ALIASES[l.uai] ?? []) out.add(a);
  return [...out];
}

function communeAliases(commune: string): string[] {
  const full = simplify(commune).trim();
  const out = new Set([full]);
  // « Garges-lès-Gonesse » → « garges », « Herblay-sur-Seine » → « herblay »…
  const m = full.match(/^([a-z]{5,}) (les|sur|en|le|l) /);
  if (m) out.add(m[1]);
  return [...out];
}

const COMMUNE_ALIASES = new Map(COMMUNES.map((c) => [c, communeAliases(c)]));

const PATTERNS = LYCEES.map((l) => ({
  uai: l.uai,
  commune: COMMUNE_ALIASES.get(l.commune) ?? [simplify(l.commune).trim()],
  lycee: new RegExp(
    ` lycee( (professionnel|polyvalent|prive|des metiers))*( (de|du|d|la|le|l))* (${aliasesFor(l)
      .map((a) => a.replace(/ /g, " "))
      .join("|")}) `,
  ),
}));

/** Titre sans le nom du média ajouté par Google Actualités (« … - Le Parisien »). */
export function cleanTitle(title: string, source: string): string {
  const suffix = ` - ${source}`;
  return source && title.endsWith(suffix) ? title.slice(0, -suffix.length) : title;
}

/** Codes UAI des lycées mentionnés dans le titre, s'il parle de mobilisation. */
export function matchLycees(title: string): string[] {
  const text = simplify(title);
  if (!KEYWORDS.test(text)) return [];
  return PATTERNS.filter((p) => p.lycee.test(text) && p.commune.some((c) => text.includes(` ${c} `))).map((p) => p.uai);
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .trim();
}

/** Lecture minimale d'un flux RSS 2.0 (Google Actualités). */
export function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  for (const [, body] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const tag = (name: string) => body.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1];
    const title = tag("title");
    const url = tag("link");
    const date = tag("pubDate");
    if (!title || !url || !date) continue;
    const published = new Date(decode(date));
    if (Number.isNaN(published.getTime())) continue;
    const source = decode(tag("source") ?? "");
    items.push({ title: cleanTitle(decode(title), source), url: decode(url), source, publishedAt: published.toISOString() });
  }
  return items;
}

const TOPIC = /\b(lycee|lycees|lyceen|lyceens|lyceenne|lyceennes|blocus|blocage|blocages)\b/;
const VAL_DOISE = new RegExp(
  ` (val d oise|${[...new Set([...COMMUNE_ALIASES.values()].flat())].join("|")}) `,
);

/** L'article parle-t-il de la mobilisation lycéenne ? (revue de presse) */
export function isAboutLycees(title: string): boolean {
  const text = simplify(title);
  return TOPIC.test(text) && KEYWORDS.test(text);
}

/** L'article concerne-t-il le Val-d'Oise (département ou une de ses villes) ? */
export function isValDoise(title: string): boolean {
  return VAL_DOISE.test(simplify(title));
}
