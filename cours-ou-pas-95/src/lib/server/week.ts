import "server-only";
import { weekDays } from "@/lib/dates";
import { computeWeek, type DayStatus } from "@/lib/status";
import { recentMentionsByLycee } from "./news";
import { getStore, type NewsMention } from "./store";

export interface WeekPayload {
  start: string;
  days: string[];
  /** Seuls les lycées ayant au moins un signalement ou une décision apparaissent. */
  statuses: Record<string, DayStatus[]>;
  /** Articles de presse récents, par lycée (veille automatique). */
  news: Record<string, NewsMention[]>;
  mode: "supabase" | "demo";
  generatedAt: string;
}

export async function getWeek(start: string): Promise<WeekPayload> {
  const store = getStore();
  const days = weekDays(start);
  const from = days[0];
  const to = days[days.length - 1];
  const [reports, overrides, news] = await Promise.all([
    store.listReports(from, to),
    store.listOverrides(from, to),
    recentMentionsByLycee(),
  ]);
  return {
    start,
    days,
    statuses: computeWeek(days, reports, overrides),
    news,
    mode: store.mode,
    generatedAt: new Date().toISOString(),
  };
}
