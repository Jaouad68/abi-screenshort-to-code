import Link from "next/link";
import type { DevisStatut } from "@/generated/prisma/client";
import { formatCents } from "@/lib/money";
import { formatDateCourt } from "@/lib/date";
import { StatutBadge } from "./StatutBadge";

export type DevisRowData = {
  id: string;
  numero: string;
  dateDevis: Date;
  statut: DevisStatut;
  totalTtcCents: number;
  client?: { nom: string } | null;
};

export function DevisRow({
  devis,
  montrerClient = false,
}: {
  devis: DevisRowData;
  montrerClient?: boolean;
}) {
  return (
    <Link
      href={`/tableau-de-bord/devis/${devis.id}`}
      className="flex items-center justify-between gap-3 rounded-card border border-line bg-card px-4 py-3.5 hover:border-brand transition"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{devis.numero}</span>
          <StatutBadge statut={devis.statut} />
        </div>
        <p className="text-sm text-muted truncate">
          {formatDateCourt(devis.dateDevis)}
          {montrerClient && devis.client ? ` · ${devis.client.nom}` : ""}
        </p>
      </div>
      <span className="shrink-0 font-semibold tabular-nums">
        {formatCents(devis.totalTtcCents)}
      </span>
    </Link>
  );
}
