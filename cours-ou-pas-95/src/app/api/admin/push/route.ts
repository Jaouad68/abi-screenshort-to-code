import { generateVapidKeys, isPushConfigured } from "@/lib/server/push";
import { getStore } from "@/lib/server/store";
import { isAdmin, unauthorized } from "@/lib/server/security";

export const dynamic = "force-dynamic";

/** GET /api/admin/push : état des notifications. */
export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  const configured = isPushConfigured();
  const subscriptions = await getStore().countSubscriptions();
  return Response.json({ configured, subscriptions }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST /api/admin/push : génère une paire de clés VAPID à copier dans les
 * variables d'environnement (rien n'est enregistré côté serveur).
 */
export async function POST() {
  if (!(await isAdmin())) return unauthorized();
  return Response.json(generateVapidKeys(), { headers: { "Cache-Control": "no-store" } });
}
