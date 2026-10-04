import { after, type NextRequest } from "next/server";
import { maybeNotifyStatusChange } from "@/lib/server/push";
import { getStore } from "@/lib/server/store";
import { isAdmin, unauthorized } from "@/lib/server/security";

export const dynamic = "force-dynamic";

/** GET /api/admin/reports → 200 derniers signalements */
export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  const reports = await getStore().listRecentReports(200);
  return Response.json({ reports }, { headers: { "Cache-Control": "no-store" } });
}

/** DELETE /api/admin/reports?id=… */
export async function DELETE(request: NextRequest) {
  if (!(await isAdmin())) return unauthorized();
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });
  const store = getStore();
  const deleted = await store.deleteReport(id);
  if (deleted) {
    await store.notify(deleted.uai, deleted.date);
    after(() => maybeNotifyStatusChange(deleted.uai, deleted.date));
  }
  return Response.json({ ok: true });
}
