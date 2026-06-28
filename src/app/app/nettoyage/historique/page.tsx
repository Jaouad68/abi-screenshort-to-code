import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { daysAgo } from "@/lib/dates";
import { PageHeader, EmptyState, ImmutableNote } from "@/components/ui";
import { FREQUENCE_LABEL, formatDateTime } from "@/lib/labels";

export const dynamic = "force-dynamic";

const JOURS_OPTIONS = [7, 30, 90];

export default async function HistoriqueNettoyagePage({
  searchParams,
}: {
  searchParams: { jours?: string };
}) {
  const user = await requireUser();
  const jours = JOURS_OPTIONS.includes(Number(searchParams.jours)) ? Number(searchParams.jours) : 30;

  const validations = await prisma.validationNettoyage.findMany({
    where: { tache: { etablissementId: user.etablissementId }, createdAt: { gte: daysAgo(jours) } },
    include: { tache: true, utilisateur: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Historique du nettoyage"
        subtitle="Validations horodatées et signées."
        action={
          <Link href="/app/nettoyage" className="btn-secondary py-2 text-sm">
            ← Tâches
          </Link>
        }
      />

      <form method="get" className="card mb-5 flex gap-3 p-4">
        <select name="jours" defaultValue={String(jours)} className="field">
          {JOURS_OPTIONS.map((j) => (
            <option key={j} value={j}>
              {j} jours
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary">
          Afficher
        </button>
      </form>

      {validations.length === 0 ? (
        <EmptyState icon="🧽" title="Aucune validation sur la période" />
      ) : (
        <ul className="space-y-2">
          {validations.map((v) => (
            <li key={v.id} className="card flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800">✓ {v.tache.libelle}</p>
                <p className="text-xs text-slate-500">
                  {v.tache.zone} · {FREQUENCE_LABEL[v.tache.frequence]}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs text-slate-500">
                <p>{formatDateTime(v.createdAt)}</p>
                <p className="font-medium text-slate-600">{v.utilisateur.nom}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ImmutableNote />
    </div>
  );
}
