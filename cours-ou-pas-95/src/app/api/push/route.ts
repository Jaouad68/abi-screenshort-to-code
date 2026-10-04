import { z } from "zod";
import { getLycee } from "@/data/lycees";
import { isPushConfigured } from "@/lib/server/push";
import { getStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";

const MAX_LYCEES = 20;

const Subscribe = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(1000),
    keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(10).max(100) }),
  }),
  uais: z.array(z.string()).max(MAX_LYCEES),
});

/** POST /api/push { subscription, uais } : s'abonner (ou mettre à jour les lycées suivis). */
export async function POST(request: Request) {
  if (!isPushConfigured()) return Response.json({ error: "Notifications non configurées." }, { status: 503 });
  const parsed = Subscribe.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Abonnement invalide." }, { status: 400 });
  const { subscription, uais } = parsed.data;
  const valid = [...new Set(uais.map((u) => getLycee(u)?.uai).filter((u): u is string => Boolean(u)))];

  const store = getStore();
  if (valid.length === 0) await store.deleteSubscription(subscription.endpoint);
  else
    await store.upsertSubscription({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      uais: valid,
    });
  return Response.json({ ok: true, uais: valid });
}

/** DELETE /api/push { endpoint } : se désabonner. */
export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== "string") return Response.json({ error: "endpoint manquant" }, { status: 400 });
  await getStore().deleteSubscription(body.endpoint);
  return Response.json({ ok: true });
}
