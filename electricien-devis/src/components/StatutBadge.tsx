import type { DevisStatut } from "@/generated/prisma/client";
import { STATUT_LABEL, STATUT_CLASSES } from "@/lib/statut";

export function StatutBadge({ statut }: { statut: DevisStatut }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUT_CLASSES[statut]}`}
    >
      {STATUT_LABEL[statut]}
    </span>
  );
}
