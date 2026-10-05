"use client";

import { useEffect, useRef, useState } from "react";
import { IconShare } from "./icons";

/**
 * Bouton « Partager en story » : partage l'image du statut via le menu natif
 * (Instagram, Snapchat, WhatsApp…), ou la télécharge si le partage de
 * fichiers n'est pas disponible.
 *
 * L'image est préchargée : sur iPhone, le partage doit partir immédiatement
 * après le toucher, sans attendre un téléchargement.
 */
export function StoryButton({
  uai,
  day,
  version,
  text,
  onToast,
}: {
  uai: string;
  day: string;
  /** Change quand le statut change, pour régénérer l'image. */
  version: string;
  text: string;
  onToast: (msg: string, tone?: "success" | "error") => void;
}) {
  const url = `/api/story/${uai}?jour=${day}&v=${encodeURIComponent(version)}`;
  const file = useRef<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    file.current = null;
    const ctrl = new AbortController();
    fetch(url, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b) => (file.current = new File([b], `cours-ou-pas-${uai}-${day}.png`, { type: "image/png" })))
      .catch(() => {});
    return () => ctrl.abort();
  }, [url, uai, day]);

  const share = async () => {
    setBusy(true);
    try {
      const f = file.current ?? new File([await (await fetch(url)).blob()], `cours-ou-pas-${uai}-${day}.png`, { type: "image/png" });
      const pageUrl = `${window.location.origin}/lycee/${uai}?jour=${day}`;
      if (navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f], text: `${text}\n${pageUrl}` });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(f);
        a.download = f.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
        onToast("Image téléchargée");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") onToast("Partage impossible", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={share}
      disabled={busy}
      className="pressable mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-card py-3.5 text-[16px] font-semibold text-accent shadow-card disabled:opacity-50"
    >
      <IconShare width={19} height={19} />
      {busy ? "Préparation…" : "Partager en story"}
    </button>
  );
}
