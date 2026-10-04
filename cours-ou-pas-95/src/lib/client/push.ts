"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Notifications push côté navigateur.
 *
 * Sur iPhone, les notifications web ne fonctionnent que si l'app a été
 * ajoutée à l'écran d'accueil (iOS 16.4 ou plus récent).
 */

export type PushState = "loading" | "unavailable" | "ios-install" | "unsupported" | "denied" | "off" | "on";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  return (await navigator.serviceWorker.getRegistration("/")) ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

async function currentState(): Promise<PushState> {
  if (!PUBLIC_KEY) return "unavailable";
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) return isIos() && !isStandalone() ? "ios-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

async function sendSubscription(sub: PushSubscription, uais: string[]): Promise<void> {
  const json = sub.toJSON();
  const res = await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: { endpoint: json.endpoint, keys: json.keys }, uais }),
  });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Abonnement impossible.");
}

/** Met à jour la liste des lycées suivis, si l'appareil est abonné. */
export async function syncPushLycees(uais: string[]): Promise<void> {
  if (!PUBLIC_KEY || !("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) await sendSubscription(sub, uais);
}

export function usePush() {
  const [state, setState] = useState<PushState>("loading");

  useEffect(() => {
    let alive = true;
    void currentState().then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, []);

  const enable = useCallback(async (uais: string[]) => {
    if (!PUBLIC_KEY) return;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState(permission === "denied" ? "denied" : "off");
      return;
    }
    const reg = await registration();
    await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY) }));
    await sendSubscription(sub, uais);
    setState("on");
  }, []);

  const disable = useCallback(async () => {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
      await sub.unsubscribe();
    }
    setState("off");
  }, []);

  return { state, enable, disable };
}
