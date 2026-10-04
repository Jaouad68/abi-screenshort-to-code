import { cookies } from "next/headers";
import { z } from "zod";
import { getLycee } from "@/data/lycees";
import { addDays, isIsoDate, todayParis, weekdayIndex } from "@/lib/dates";
import { STATUSES } from "@/lib/status";
import { getStore } from "@/lib/server/store";
import { clientIp, DEVICE_COOKIE, hashIp, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MIN } from "@/lib/server/security";

export const dynamic = "force-dynamic";

const Body = z.object({
  uai: z.string().min(8).max(8),
  date: z.string().refine(isIsoDate, "Date invalide"),
  status: z.enum(STATUSES),
});

/** On accepte les signalements de la veille jusqu'à deux semaines à l'avance. */
const PAST_DAYS = 1;
const FUTURE_DAYS = 14;

/** POST /api/reports { uai, date, status } */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Signalement invalide." }, { status: 400 });
  }
  const { uai, date, status } = parsed.data;

  const lycee = getLycee(uai);
  if (!lycee) return Response.json({ error: "Lycée inconnu." }, { status: 404 });

  const today = todayParis();
  if (date < addDays(today, -PAST_DAYS) || date > addDays(today, FUTURE_DAYS)) {
    return Response.json({ error: "On ne peut signaler que les jours proches." }, { status: 400 });
  }
  if (weekdayIndex(date) === 6) {
    return Response.json({ error: "Pas de cours le dimanche." }, { status: 400 });
  }

  const store = getStore();
  const ipHash = hashIp(clientIp(request));
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60_000).toISOString();
  if ((await store.countRecentByIp(ipHash, since)) >= RATE_LIMIT_MAX) {
    return Response.json(
      { error: "Trop de signalements depuis ce réseau. Réessaie dans quelques minutes." },
      { status: 429 },
    );
  }

  const jar = await cookies();
  let deviceId = jar.get(DEVICE_COOKIE)?.value;
  if (!deviceId || !/^[0-9a-f-]{36}$/.test(deviceId)) {
    deviceId = crypto.randomUUID();
    jar.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  await store.upsertReport({ uai: lycee.uai, date, status, deviceId, ipHash });
  await store.notify(lycee.uai, date);

  return Response.json({ ok: true });
}
