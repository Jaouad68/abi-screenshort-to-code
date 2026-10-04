"use client";

import { useState } from "react";
import { useFavorites, useMounted } from "@/lib/client/hooks";
import { usePush } from "@/lib/client/push";
import { IconBell } from "./icons";

/** Carte « Être prévenu » : active les notifications push pour un lycée. */
export function NotifyCard({ uai, onToast }: { uai: string; onToast: (msg: string, tone?: "success" | "error") => void }) {
  const { state, enable, disable } = usePush();
  const { isFav, add, toggle } = useFavorites();
  const mounted = useMounted();
  const [busy, setBusy] = useState(false);

  if (!mounted || state === "loading" || state === "unavailable" || state === "unsupported") return null;
  const following = isFav(uai);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      onToast(ok);
    } catch (e) {
      onToast((e as Error).message || "Impossible d'activer les notifications.", "error");
    } finally {
      setBusy(false);
    }
  };

  let title: string;
  let text: string;
  let action: { label: string; onClick: () => void } | null = null;

  if (state === "ios-install") {
    title = "Alertes sur iPhone";
    text = "Ajoute d'abord l'app à ton écran d'accueil : bouton Partager, puis « Sur l'écran d'accueil ». Ouvre-la ensuite depuis son icône.";
  } else if (state === "denied") {
    title = "Notifications bloquées";
    text = "Tu as refusé les notifications. Réactive-les dans les réglages de ton navigateur pour ce site.";
  } else if (state === "off") {
    title = "Être prévenu";
    text = "Reçois une alerte dès que le statut de ce lycée change (blocus, reprise des cours…).";
    action = { label: "Activer les alertes", onClick: () => run(() => enable(add(uai)), "Alertes activées 🔔") };
  } else if (following) {
    title = "Alertes activées";
    text = "Tu seras prévenu dès qu'un changement est confirmé pour ce lycée.";
    action = { label: "Ne plus suivre", onClick: () => run(async () => toggle(uai), "Alertes désactivées pour ce lycée") };
  } else {
    title = "Être prévenu";
    text = "Les alertes sont activées sur cet appareil. Ajoute ce lycée à tes favoris pour le suivre.";
    action = { label: "Suivre ce lycée", onClick: () => run(async () => void add(uai), "Lycée suivi 🔔") };
  }

  const on = state === "on" && following;
  return (
    <section className="mt-5 flex items-start gap-3 rounded-[22px] bg-card p-4 shadow-card">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-white ${on ? "bg-normal" : "bg-[#ff9500]"}`}
      >
        <IconBell width={20} height={20} strokeWidth={2.3} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-semibold">{title}</div>
        <p className="mt-0.5 text-[14px] leading-snug text-label-2">{text}</p>
        {action && (
          <button
            onClick={action.onClick}
            disabled={busy}
            className={`pressable mt-2.5 rounded-full px-4 py-2 text-[14px] font-semibold disabled:opacity-50 ${
              on ? "bg-fill text-label" : "bg-accent text-white"
            }`}
          >
            {busy ? "…" : action.label}
          </button>
        )}
        {state === "on" && (
          <button onClick={() => run(disable, "Alertes désactivées")} className="mt-2 block text-[12px] text-label-3 underline">
            Désactiver toutes les alertes sur cet appareil
          </button>
        )}
      </div>
    </section>
  );
}
