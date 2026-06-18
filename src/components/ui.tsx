import clsx from "clsx";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ConformeBadge({ conforme }: { conforme: boolean }) {
  return (
    <span
      className={clsx(
        "badge",
        conforme ? "bg-brand-100 text-brand-800" : "bg-red-100 text-red-700"
      )}
    >
      {conforme ? "✓ Conforme" : "✕ Hors plage"}
    </span>
  );
}

export function StatutBadge({
  label,
  tone,
}: {
  label: string;
  tone: "ok" | "warn" | "danger" | "neutral";
}) {
  const map = {
    ok: "bg-brand-100 text-brand-800",
    warn: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
    neutral: "bg-slate-100 text-slate-600",
  };
  return <span className={clsx("badge", map[tone])}>{label}</span>;
}

export function EmptyState({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="mt-3 font-semibold text-slate-700">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

export function ImmutableNote() {
  return (
    <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
      <span>🔒</span>
      Enregistrements horodatés côté serveur et inviolables. Toute correction crée une nouvelle entrée tracée.
    </p>
  );
}
