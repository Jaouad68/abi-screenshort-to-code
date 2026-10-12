import type { StatutRenouvellement, StatutIntervention } from "@/generated/prisma/client";

const RENOUVELLEMENT: Record<StatutRenouvellement, { label: string; cls: string }> = {
  A_CONTACTER: { label: "À contacter", cls: "bg-accent-l text-accent-d" },
  CONTACTE: { label: "Contacté", cls: "bg-brand-l text-brand-d" },
  RENOUVELE: { label: "Renouvelé", cls: "bg-ok-l text-ok" },
  PERDU: { label: "Perdu", cls: "bg-danger-l text-danger" },
};

export function StatutRenouvellementBadge({ statut }: { statut: StatutRenouvellement }) {
  const s = RENOUVELLEMENT[statut];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

const INTERVENTION: Record<StatutIntervention, { label: string; cls: string }> = {
  PLANIFIEE: { label: "Planifiée", cls: "bg-brand-l text-brand-d" },
  EN_COURS: { label: "En cours", cls: "bg-accent-l text-accent-d" },
  TERMINEE: { label: "Terminée", cls: "bg-ok-l text-ok" },
  ANNULEE: { label: "Annulée", cls: "bg-line text-muted" },
};

export function StatutInterventionBadge({ statut }: { statut: StatutIntervention }) {
  const s = INTERVENTION[statut];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

const FENETRE: Record<string, { label: string; cls: string }> = {
  echu: { label: "En retard", cls: "bg-danger-l text-danger" },
  "30": { label: "≤ 30 j", cls: "bg-danger-l text-danger" },
  "60": { label: "≤ 60 j", cls: "bg-accent-l text-accent-d" },
  "90": { label: "≤ 90 j", cls: "bg-brand-l text-brand-d" },
  "hors-fenetre": { label: "Plus tard", cls: "bg-line text-muted" },
};

export function FenetreBadge({ fenetre }: { fenetre: string }) {
  const s = FENETRE[fenetre] ?? FENETRE["hors-fenetre"];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}
