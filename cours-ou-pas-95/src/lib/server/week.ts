import "server-only";
import { weekDays } from "@/lib/dates";
import { computeWeek, type DayStatus } from "@/lib/status";
import { getStore } from "./store";

export interface WeekPayload {
  start: string;
  days: string[];
  /** Seuls les lycées ayant au moins un signalement ou une décision apparaissent. */
  statuses: Record<string, DayStatus[]>;
  mode: "supabase" | "demo";
  generatedAt: string;
}

export async function getWeek(start: string): Promise<WeekPayload> {
  const store = getStore();
  const days = weekDays(start);
  const from = days[0];
  const to = days[days.length - 1];
  const [reports, overrides] = await Promise.all([store.listReports(from, to), store.listOverrides(from, to)]);
  return {
    start,
    days,
    statuses: computeWeek(days, reports, overrides),
    mode: store.mode,
    generatedAt: new Date().toISOString(),
  };
}
