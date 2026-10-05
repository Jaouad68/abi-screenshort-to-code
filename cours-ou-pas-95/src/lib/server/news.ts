import "server-only";
import { createHash } from "node:crypto";
import { COMMUNES } from "@/data/lycees";
import { isAboutLycees, isValDoise, matchLycees, parseRss } from "@/lib/news-match";
import { getStore, type NewsMention } from "./store";

/**
 * Veille presse automatique : interroge Google Actualités, rattache les
 * articles récents aux lycées cités et les enregistre. Les mentions sont
 * informatives : elles ne changent pas le statut, la modération décide.
 */

/** Intervalle minimal entre deux veilles. */
export const NEWS_SCAN_INTERVAL_MIN = 15;
/** Fenêtre d'affichage des articles rattachés à un lycée. */
export const NEWS_WINDOW_HOURS = 72;
/** Fenêtre de la revue de presse (onglet « Presse »). */
export const PRESS_WINDOW_DAYS = 7;
/**
 * Les articles de la revue de presse sont stockés dans la même table que les
 * mentions, avec un code UAI vide.
 */
const PRESS_UAI = "";

const LAST_SCAN_KEY = "news_last_scan";
const COMMUNE_GROUP = 8;

function queries(): string[] {
  const groups: string[][] = [];
  for (let i = 0; i < COMMUNES.length; i += COMMUNE_GROUP) groups.push(COMMUNES.slice(i, i + COMMUNE_GROUP));
  return [
    `blocus lycée "Val-d'Oise" when:7d`,
    `lycée blocage OR grève "Val-d'Oise" when:7d`,
    `blocus lycées when:2d`,
    ...groups.map((g) => `lycée (blocus OR blocage OR grève) (${g.map((c) => `"${c}"`).join(" OR ")}) when:2d`),
  ];
}

async function fetchFeed(q: string) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=fr&gl=FR&ceid=FR:fr`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; CoursOuPas95/1.0)", Accept: "application/rss+xml" },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google Actualités : HTTP ${res.status}`);
  return parseRss(await res.text());
}

export interface ScanResult {
  skipped: boolean;
  articles: number;
  mentions: number;
  errors: string[];
}

/** Lance une veille si la précédente date de plus de 15 minutes (ou si `force`). */
export async function scanNews({ force = false } = {}): Promise<ScanResult> {
  const store = getStore();
  const last = await store.getMeta(LAST_SCAN_KEY).catch(() => null);
  if (!force && last && Date.now() - Date.parse(last) < NEWS_SCAN_INTERVAL_MIN * 60_000) {
    return { skipped: true, articles: 0, mentions: 0, errors: [] };
  }
  // On marque la veille avant de la lancer, pour éviter les doublons concurrents.
  await store.setMeta(LAST_SCAN_KEY, new Date().toISOString());

  const since = Date.now() - NEWS_WINDOW_HOURS * 3_600_000;
  const pressSince = Date.now() - PRESS_WINDOW_DAYS * 86_400_000;
  const errors: string[] = [];
  const results = await Promise.allSettled(queries().map(fetchFeed));
  const seen = new Map<string, Omit<NewsMention, "hidden">>();
  let articles = 0;
  for (const r of results) {
    if (r.status === "rejected") {
      errors.push(String((r.reason as Error)?.message ?? r.reason));
      continue;
    }
    for (const item of r.value) {
      const published = Date.parse(item.publishedAt);
      if (published >= pressSince && isAboutLycees(item.title)) {
        const id = createHash("sha1").update(`press|${item.title.toLowerCase()}|${item.source}`).digest("hex").slice(0, 24);
        seen.set(id, { id, uai: PRESS_UAI, ...item });
      }
      if (published < since) continue;
      articles++;
      for (const uai of matchLycees(item.title)) {
        // Même article repris par plusieurs requêtes : une seule mention par lycée.
        const id = createHash("sha1").update(`${uai}|${item.title.toLowerCase()}|${item.source}`).digest("hex").slice(0, 24);
        seen.set(id, { id, uai, ...item });
      }
    }
  }
  await store.upsertMentions([...seen.values()]);
  const mentions = [...seen.values()].filter((m) => m.uai !== PRESS_UAI).length;
  return { skipped: false, articles, mentions, errors };
}

/** Mentions visibles des dernières 72 h, regroupées par lycée (3 au plus). */
export async function recentMentionsByLycee(): Promise<Record<string, NewsMention[]>> {
  const since = new Date(Date.now() - NEWS_WINDOW_HOURS * 3_600_000).toISOString();
  const list = await getStore()
    .listMentions(since)
    .catch(() => [] as NewsMention[]); // table absente tant que supabase/v3.sql n'a pas été exécuté
  const out: Record<string, NewsMention[]> = {};
  for (const m of list) {
    if (m.uai === PRESS_UAI) continue;
    const arr = (out[m.uai] ??= []);
    if (arr.length < 3) arr.push(m);
  }
  return out;
}

export interface PressArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  /** Concerne le Val-d'Oise (titre citant le département ou une de ses villes). */
  valDoise: boolean;
  /** Lycées du 95 identifiés dans le titre. */
  uais: string[];
}

/** Revue de presse des 7 derniers jours, du plus récent au plus ancien. */
export async function pressArticles(): Promise<PressArticle[]> {
  const since = new Date(Date.now() - PRESS_WINDOW_DAYS * 86_400_000).toISOString();
  const list = await getStore()
    .listMentions(since)
    .catch(() => [] as NewsMention[]);
  const uaisByTitle = new Map<string, string[]>();
  for (const m of list) {
    if (m.uai === PRESS_UAI) continue;
    const key = m.title.toLowerCase();
    uaisByTitle.set(key, [...(uaisByTitle.get(key) ?? []), m.uai]);
  }
  const seenTitles = new Set<string>();
  const out: PressArticle[] = [];
  for (const m of list) {
    const key = m.title.toLowerCase();
    if (m.uai !== PRESS_UAI || seenTitles.has(key)) continue;
    seenTitles.add(key);
    const uais = uaisByTitle.get(key) ?? [];
    out.push({
      id: m.id,
      title: m.title,
      url: m.url,
      source: m.source,
      publishedAt: m.publishedAt,
      valDoise: uais.length > 0 || isValDoise(m.title),
      uais,
    });
  }
  return out;
}
