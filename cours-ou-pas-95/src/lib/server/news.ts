import "server-only";
import { createHash } from "node:crypto";
import { COMMUNES } from "@/data/lycees";
import { matchLycees, parseRss } from "@/lib/news-match";
import { getStore, type NewsMention } from "./store";

/**
 * Veille presse automatique : interroge Google Actualités, rattache les
 * articles récents aux lycées cités et les enregistre. Les mentions sont
 * informatives : elles ne changent pas le statut, la modération décide.
 */

/** Intervalle minimal entre deux veilles. */
export const NEWS_SCAN_INTERVAL_MIN = 15;
/** Fenêtre d'affichage des articles. */
export const NEWS_WINDOW_HOURS = 72;

const LAST_SCAN_KEY = "news_last_scan";
const COMMUNE_GROUP = 8;

function queries(): string[] {
  const groups: string[][] = [];
  for (let i = 0; i < COMMUNES.length; i += COMMUNE_GROUP) groups.push(COMMUNES.slice(i, i + COMMUNE_GROUP));
  return [
    `blocus lycée "Val-d'Oise" when:2d`,
    `lycée blocage OR grève "Val-d'Oise" when:2d`,
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
      if (Date.parse(item.publishedAt) < since) continue;
      articles++;
      for (const uai of matchLycees(item.title)) {
        // Même article repris par plusieurs requêtes : une seule mention par lycée.
        const id = createHash("sha1").update(`${uai}|${item.title.toLowerCase()}|${item.source}`).digest("hex").slice(0, 24);
        seen.set(id, { id, uai, ...item });
      }
    }
  }
  await store.upsertMentions([...seen.values()]);
  return { skipped: false, articles, mentions: seen.size, errors };
}

/** Mentions visibles des dernières 72 h, regroupées par lycée (3 au plus). */
export async function recentMentionsByLycee(): Promise<Record<string, NewsMention[]>> {
  const since = new Date(Date.now() - NEWS_WINDOW_HOURS * 3_600_000).toISOString();
  const list = await getStore()
    .listMentions(since)
    .catch(() => [] as NewsMention[]); // table absente tant que supabase/v3.sql n'a pas été exécuté
  const out: Record<string, NewsMention[]> = {};
  for (const m of list) {
    const arr = (out[m.uai] ??= []);
    if (arr.length < 3) arr.push(m);
  }
  return out;
}
