"use client";

import { useTransition } from "react";
import { changerStatutIntervention } from "../actions";
import { btnSecondaire, btnPrimaire } from "@/lib/ui";
import type { StatutIntervention } from "@/generated/prisma/client";

const OPTIONS: { valeur: StatutIntervention; label: string }[] = [
  { valeur: "PLANIFIEE", label: "Planifiée" },
  { valeur: "EN_COURS", label: "En cours" },
  { valeur: "TERMINEE", label: "Terminée" },
  { valeur: "ANNULEE", label: "Annulée" },
];

export function StatutSwitcher({ interventionId, statut }: { interventionId: string; statut: StatutIntervention }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.filter((o) => o.valeur !== statut).map((o) => (
        <button
          key={o.valeur}
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => changerStatutIntervention(interventionId, o.valeur))}
          className={o.valeur === "TERMINEE" ? btnPrimaire : btnSecondaire}
        >
          {o.valeur === "TERMINEE" ? "Marquer terminée" : o.label}
        </button>
      ))}
    </div>
  );
}
