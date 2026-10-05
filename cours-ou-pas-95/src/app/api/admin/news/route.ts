import { z } from "zod";
import { NEWS_WINDOW_HOURS, scanNews } from "@/lib/server/news";
import { getStore } from "@/lib/server/store";
import { isAdmin, unauthorized } from "@/lib/server/security";

export const dynamic = "force-dynamic";

/** GET /api/admin/news : articles détectés (masqués compris). */
export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  const since = new Date(Date.now() - NEWS_WINDOW_HOURS * 3_600_000).toISOString();
  try {
    // Les articles de la revue de presse (UAI vide) ne sont pas à modérer ici.
    const mentions = (await getStore().listMentions(since, true)).filter((m) => m.uai !== "");
    return Response.json({ mentions, ready: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ mentions: [], ready: false }, { headers: { "Cache-Control": "no-store" } });
  }
}

/** POST /api/admin/news : lancer la veille immédiatement. */
export async function POST() {
  if (!(await isAdmin())) return unauthorized();
  try {
    return Response.json(await scanNews({ force: true }));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

const Patch = z.object({ id: z.string().min(1), hidden: z.boolean() });

/** PATCH /api/admin/news { id, hidden } : masquer un faux positif (ou le réafficher). */
export async function PATCH(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  const parsed = Patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Données invalides." }, { status: 400 });
  await getStore().setMentionHidden(parsed.data.id, parsed.data.hidden);
  return Response.json({ ok: true });
}
