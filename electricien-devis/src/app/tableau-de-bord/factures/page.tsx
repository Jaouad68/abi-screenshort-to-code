import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { formatDateCourt } from "@/lib/date";
import { FACTURE_STATUT_LABEL, FACTURE_STATUT_CLASSES } from "@/lib/statut";

export default async function FacturesPage() {
  const { user } = await requireUser();

  const factures = await prisma.facture.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { client: { select: { nom: true } } },
  });

  const caPaye = factures
    .filter((f) => f.statut === "PAYEE")
    .reduce((s, f) => s + f.totalTtcCents, 0);
  const caEnAttente = factures
    .filter((f) => f.statut === "EMISE")
    .reduce((s, f) => s + f.totalTtcCents, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Factures</h1>
      <p className="text-muted mb-5">
        Une facture se crée depuis un devis accepté (bouton « Convertir en facture »).
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-card border border-ok/30 bg-ok-l p-4">
          <div className="text-xs font-semibold text-muted">Encaissé</div>
          <div className="text-xl font-bold tabular-nums text-ok mt-1">{formatCents(caPaye)}</div>
        </div>
        <div className="rounded-card border border-line bg-card p-4">
          <div className="text-xs font-semibold text-muted">En attente de paiement</div>
          <div className="text-xl font-bold tabular-nums mt-1">{formatCents(caEnAttente)}</div>
        </div>
      </div>

      {factures.length === 0 ? (
        <p className="text-muted italic">Aucune facture pour le moment.</p>
      ) : (
        <ul className="grid gap-2">
          {factures.map((f) => (
            <li key={f.id}>
              <Link
                href={`/tableau-de-bord/factures/${f.id}`}
                className="flex items-center justify-between gap-3 rounded-card border border-line bg-card px-4 py-3.5 hover:border-brand transition"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{f.numero}</span>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${FACTURE_STATUT_CLASSES[f.statut]}`}
                    >
                      {FACTURE_STATUT_LABEL[f.statut]}
                    </span>
                  </div>
                  <p className="text-sm text-muted truncate">
                    {formatDateCourt(f.dateFacture)} · {f.client.nom}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">
                  {formatCents(f.totalTtcCents)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
