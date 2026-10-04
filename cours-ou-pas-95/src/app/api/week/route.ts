import type { NextRequest } from "next/server";
import { currentWeekStart, isIsoDate, mondayOf } from "@/lib/dates";
import { getWeek } from "@/lib/server/week";

export const dynamic = "force-dynamic";

/** GET /api/week?start=YYYY-MM-DD → statuts de la semaine (lundi → samedi). */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("start");
  const start = isIsoDate(raw) ? mondayOf(raw) : currentWeekStart();
  try {
    const week = await getWeek(start);
    return Response.json(week, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    // Diagnostic lisible (aucune clé n'est renvoyée, seulement leur présence).
    console.error("[api/week]", e);
    return Response.json(
      {
        error: e instanceof Error ? e.message : String(e),
        config: {
          supabaseUrl: Boolean(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL),
          serviceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
          anonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
