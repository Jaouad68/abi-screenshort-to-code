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
          serviceRoleKeyShape: keyShape(process.env.SUPABASE_SERVICE_ROLE_KEY),
          anonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

/** Forme de la clé (préfixe connu, longueur, caractères parasites), jamais sa valeur. */
function keyShape(key: string | undefined) {
  if (!key) return null;
  const prefix = ["sb_secret_", "sb_publishable_", "eyJ"].find((p) => key.startsWith(p)) ?? "inconnu";
  return {
    prefix,
    length: key.length,
    whitespace: /\s/.test(key),
    quotes: /["']/.test(key),
    containsEquals: key.includes("="),
  };
}
