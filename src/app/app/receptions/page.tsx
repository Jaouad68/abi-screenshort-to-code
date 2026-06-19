import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { daysAgo } from "@/lib/dates";
import { PageHeader, ConformeBadge, EmptyState, ImmutableNote } from "@/components/ui";
import { formatDateTime, formatTemp } from "@/lib/labels";
import { ReceptionForm } from "./ReceptionForm";

export const dynamic = "force-dynamic";

const JOURS_OPTIONS = [7, 30, 90];

export default async function ReceptionsPage({
  searchParams,
}: {
  searchParams: { jours?: string };
}) {
  const user = await requireUser();
  const jours = JOURS_OPTIONS.includes(Number(searchParams.jours)) ? Number(searchParams.jours) : 30;

  const receptions = await prisma.reception.findMany({
    where: { etablissementId: user.etablissementId, createdAt: { gte: daysAgo(jours) } },
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

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">
          Historique <span className="text-slate-400">({receptions.length})</span>
        </h2>
        <form method="get" className="flex gap-2">
          <select name="jours" defaultValue={String(jours)} className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
            {JOURS_OPTIONS.map((j) => (
              <option key={j} value={j}>
                {j} jours
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
            OK
          </button>
        </form>
      </div>

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
