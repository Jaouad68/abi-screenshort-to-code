"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Feuille modale qui glisse depuis le bas (bottom sheet iOS).
 * On peut la fermer en glissant vers le bas, en touchant le fond ou avec Échap.
 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-backdrop-in bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-lg animate-sheet-in rounded-t-[28px] bg-elevated pb-safe shadow-float"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined, transition: drag ? "none" : undefined }}
        onTouchStart={(e) => (startY.current = e.touches[0].clientY)}
        onTouchMove={(e) => {
          if (startY.current === null) return;
          setDrag(Math.max(0, e.touches[0].clientY - startY.current));
        }}
        onTouchEnd={() => {
          if (drag > 110) onClose();
          setDrag(0);
          startY.current = null;
        }}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <span className="h-[5px] w-9 rounded-full bg-fill-strong" />
        </div>
        <h2 className="px-6 pt-2 font-display text-[22px] font-bold tracking-tight">{title}</h2>
        <div className="px-4 pt-3 pb-2">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Petite notification éphémère, en haut de l'écran. */
export function Toast({ message, tone = "success", onDone }: { message: string | null; tone?: "success" | "error"; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center pt-safe">
      <div
        role="status"
        className="glass mt-3 flex animate-pop items-center gap-2 rounded-full px-4 py-2.5 text-[15px] font-semibold shadow-float"
      >
        <span className="h-2 w-2 rounded-full" style={{ background: tone === "success" ? "var(--normal)" : "var(--bloque)" }} />
        {message}
      </div>
    </div>
  );
}
