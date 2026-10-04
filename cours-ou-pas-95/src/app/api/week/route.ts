import type { NextRequest } from "next/server";
import { currentWeekStart, isIsoDate, mondayOf } from "@/lib/dates";
import { getWeek } from "@/lib/server/week";

export const dynamic = "force-dynamic";

/** GET /api/week?start=YYYY-MM-DD → statuts de la semaine (lundi → samedi). */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("start");
  const start = isIsoDate(raw) ? mondayOf(raw) : currentWeekStart();
  const week = await getWeek(start);
  return Response.json(week, { headers: { "Cache-Control": "no-store" } });
}
