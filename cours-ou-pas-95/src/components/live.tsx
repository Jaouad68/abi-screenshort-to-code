import type { LiveState } from "@/lib/client/hooks";

const LABEL: Record<LiveState, string> = {
  live: "En direct",
  polling: "Actualisation auto",
  connecting: "Connexion…",
  offline: "Hors ligne",
};

export function LiveIndicator({ state }: { state: LiveState }) {
  const color = state === "offline" ? "var(--bloque)" : state === "connecting" ? "var(--inconnu)" : "var(--normal)";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-fill px-2.5 py-1 text-[12px] font-semibold text-label-2">
      <span
        className={`h-2 w-2 rounded-full ${state === "live" || state === "polling" ? "animate-live" : ""}`}
        style={{ background: color }}
      />
      {LABEL[state]}
    </span>
  );
}
