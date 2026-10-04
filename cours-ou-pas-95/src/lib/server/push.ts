import "server-only";
import webpush from "web-push";
import { getLycee } from "@/data/lycees";
import { relativeDayLabel, todayParis } from "@/lib/dates";
import { computeDayStatus, STATUS_META, type Confidence } from "@/lib/status";
import { getStore } from "./store";

/**
 * Notifications push : quand le statut d'un lycée change de façon fiable,
 * on prévient les appareils qui suivent ce lycée.
 */

/** Seuls les statuts fiables déclenchent une notification (anti-troll). */
const NOTIFY_CONFIDENCE: Confidence[] = ["officiel", "referent", "confirme"];

let configured: boolean | undefined;

export function isPushConfigured(): boolean {
  if (configured !== undefined) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  configured = Boolean(pub && priv);
  if (configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contact@cours-ou-pas.fr", pub!, priv!);
  }
  return configured;
}

export function generateVapidKeys() {
  return webpush.generateVAPIDKeys();
}

/** Recalcule le statut du jour et envoie une notification s'il a changé. */
export async function maybeNotifyStatusChange(uai: string, date: string): Promise<void> {
  if (!isPushConfigured()) return;
  const today = todayParis();
  if (date < today) return;

  const store = getStore();
  const [reports, overrides] = await Promise.all([store.listReports(date, date), store.listOverrides(date, date)]);
  const day = computeDayStatus(
    date,
    reports.filter((r) => r.uai === uai),
    overrides.find((o) => o.uai === uai) ?? null,
  );
  if (day.status === "inconnu" || !day.confidence || !NOTIFY_CONFIDENCE.includes(day.confidence)) return;

  const previous = await store.getNotified(uai, date);
  if (previous === day.status) return;
  await store.setNotified(uai, date, day.status);
  // Pas d'alerte pour un premier statut « cours normaux » : seul un changement est utile.
  if (!previous && day.status === "normal") return;

  const lycee = getLycee(uai);
  if (!lycee) return;
  const meta = STATUS_META[day.status];
  const payload = JSON.stringify({
    title: lycee.nom,
    body: `${relativeDayLabel(date, today)} : ${meta.label} ${meta.emoji}${day.note ? ` · ${day.note}` : ""}`,
    url: `/lycee/${uai}?jour=${date}`,
    tag: `${uai}|${date}`,
  });

  const subs = await store.listSubscriptionsFor(uai);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 6 * 3600,
          urgency: "high",
        });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        // Abonnement expiré ou révoqué : on le supprime.
        if (code === 404 || code === 410) await store.deleteSubscription(s.endpoint);
        else console.error("[push]", code, (e as Error).message);
      }
    }),
  );
}
