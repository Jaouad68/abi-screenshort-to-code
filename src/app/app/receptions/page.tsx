import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { daysAgo } from "@/lib/dates";
import { PageHeader, ConformeBadge, EmptyState, ImmutableNote } from "@/components/ui";
import { formatDateTime, formatTemp } from "@/lib/labels";
import { ReceptionForm } from "./ReceptionForm";

export const dynamic = "force-dynamic";

export default async function ReceptionsPage() {
  const user = await requireUser();

  const receptions = await prisma.reception.findMany({
    where: { etablissementId: user.etablissementId, createdAt: { gte: daysAgo(30) } },
    include: { utilisateur: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Contrôle à réception"
        subtitle="Enregistrez chaque livraison : fournisseur, température, conformité."
      />

      <ReceptionForm />

      <h2 className="mb-3 mt-8 text-lg font-bold text-slate-800">
        30 derniers jours <span className="text-slate-400">({receptions.length})</span>
      </h2>

      {receptions.length === 0 ? (
        <EmptyState icon="📦" title="Aucune réception enregistrée" />
      ) : (
        <ul className="space-y-2">
          {receptions.map((r) => (
            <li key={r.id} className="card flex items-center gap-3 px-4 py-3">
              {r.photoData && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={r.photoData}
                  alt="Bon de livraison"
                  className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-800">
                  {r.produit} <span className="font-normal text-slate-500">· {r.fournisseur}</span>
                </p>
                <p className="text-xs text-slate-500">
                  {formatDateTime(r.createdAt)}
                  {r.temperature !== null && <> · {formatTemp(r.temperature)}</>}
                  {r.numeroLot && <> · lot {r.numeroLot}</>} · {r.utilisateur.nom}
                </p>
              </div>
              <ConformeBadge conforme={r.conforme} />
            </li>
          ))}
        </ul>
      )}

      <ImmutableNote />
    </div>
  );
}
