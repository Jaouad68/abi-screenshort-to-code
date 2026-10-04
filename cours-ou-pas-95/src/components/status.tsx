import { CONFIDENCE_META, STATUS_META, type Confidence, type DisplayStatus } from "@/lib/status";
import { IconBlock, IconCheck, IconQuestion, IconShield, IconWarning } from "./icons";

export const STATUS_COLOR: Record<DisplayStatus, string> = {
  normal: "var(--normal)",
  perturbe: "var(--perturbe)",
  bloque: "var(--bloque)",
  inconnu: "var(--inconnu)",
};

const GLYPH: Record<DisplayStatus, typeof IconCheck> = {
  normal: IconCheck,
  perturbe: IconWarning,
  bloque: IconBlock,
  inconnu: IconQuestion,
};

/** Pastille ronde colorée, façon icône de réglages iOS. */
export function StatusIcon({ status, size = 36, className = "" }: { status: DisplayStatus; size?: number; className?: string }) {
  const Glyph = GLYPH[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-white ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(160deg, color-mix(in srgb, ${STATUS_COLOR[status]} 80%, white), ${STATUS_COLOR[status]})`,
      }}
    >
      <Glyph width={size * 0.52} height={size * 0.52} strokeWidth={2.6} />
    </span>
  );
}

export function StatusDot({ status, size = 8 }: { status: DisplayStatus; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: STATUS_COLOR[status] }} />;
}

export function StatusPill({ status, className = "" }: { status: DisplayStatus; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold ${className}`}
      style={{
        color: status === "inconnu" ? "var(--label-2)" : STATUS_COLOR[status],
        background: `color-mix(in srgb, ${STATUS_COLOR[status]} 14%, transparent)`,
      }}
    >
      {STATUS_META[status].short}
    </span>
  );
}

export function ConfidenceBadge({ confidence, onDark = false }: { confidence: Confidence; onDark?: boolean }) {
  const meta = CONFIDENCE_META[confidence];
  return (
    <span
      title={meta.description}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
        onDark ? "bg-white/20 text-white backdrop-blur" : "bg-fill text-label-2"
      }`}
    >
      {confidence === "officiel" && <IconShield width={13} height={13} strokeWidth={2.4} />}
      {meta.label}
    </span>
  );
}
