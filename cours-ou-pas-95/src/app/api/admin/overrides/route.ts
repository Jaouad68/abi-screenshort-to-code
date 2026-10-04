import { after, type NextRequest } from "next/server";
import { z } from "zod";
import { getLycee } from "@/data/lycees";
import { addDays, isIsoDate, todayParis } from "@/lib/dates";
import { STATUSES } from "@/lib/status";
import { maybeNotifyStatusChange } from "@/lib/server/push";
import { getStore } from "@/lib/server/store";
import { isAdmin, unauthorized } from "@/lib/server/security";

export const dynamic = "force-dynamic";

const Body = z.object({
  uai: z.string(),
  date: z.string().refine(isIsoDate),
  status: z.enum(STATUSES),
  note: z.string().trim().max(280).optional(),
});

/** GET /api/admin/overrides → décisions à partir d'hier */
export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  const overrides = await getStore().listAllOverrides(addDays(todayParis(), -1));
  return Response.json({ overrides }, { headers: { "Cache-Control": "no-store" } });
}

/** POST /api/admin/overrides { uai, date, status, note? } */
export async function POST(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Données invalides." }, { status: 400 });
  const lycee = getLycee(parsed.data.uai);
  if (!lycee) return Response.json({ error: "Lycée inconnu." }, { status: 404 });

  const store = getStore();
  await store.upsertOverride({
    uai: lycee.uai,
    date: parsed.data.date,
    status: parsed.data.status,
    note: parsed.data.note || null,
  });
  await store.notify(lycee.uai, parsed.data.date);
  after(() => maybeNotifyStatusChange(lycee.uai, parsed.data.date));
  return Response.json({ ok: true });
}

/** DELETE /api/admin/overrides?uai=…&date=… */
export async function DELETE(request: NextRequest) {
  if (!(await isAdmin())) return unauthorized();
  const uai = request.nextUrl.searchParams.get("uai");
  const date = request.nextUrl.searchParams.get("date");
  if (!uai || !isIsoDate(date)) return Response.json({ error: "Paramètres manquants." }, { status: 400 });
  const store = getStore();
  await store.deleteOverride(uai, date);
  await store.notify(uai, date);
  after(() => maybeNotifyStatusChange(uai, date));
  return Response.json({ ok: true });
}
