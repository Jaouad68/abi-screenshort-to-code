import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader, EmptyState, StatutBadge, ImmutableNote } from "@/components/ui";
import { formatDateTime } from "@/lib/labels";
import { DeclarerNCForm, ResoudreNCForm } from "./NCForms";

export const dynamic = "force-dynamic";

export default async function NonConformitesPage() {
  const user = await requireUser();

  const ncs = await prisma.nonConformite.findMany({
    where: { etablissementId: user.etablissementId },
    include: { utilisateur: true },
    orderBy: [{ statut: "asc" }, { createdAt: "desc" }],
  });

  const ouverts = ncs.filter((n) => n.statut === "OUVERT");
  const resolus = ncs.filter((n) => n.statut === "RESOLU");

  return (
    <div>
      <PageHeader
        title="Non-conformités"
        subtitle="Déclarez les anomalies et tracez l'action corrective appliquée."
        action={
          <StatutBadge
            label={ouverts.length === 0 ? "Aucune ouverte ✓" : `${ouverts.length} ouverte(s)`}
            tone={ouverts.length === 0 ? "ok" : "danger"}
          />
        }
      />

      <DeclarerNCForm />

      {ncs.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon="✅" title="Aucune non-conformité" hint="Tout est en ordre." />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {ouverts.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-slate-800">À traiter</h2>
              <ul className="space-y-3">
                {ouverts.map((n) => (
                  <li key={n.id} className="card p-4 ring-1 ring-red-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">{n.type}</p>
                        <p className="mt-0.5 text-sm text-slate-600">{n.description}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDateTime(n.createdAt)} · {n.utilisateur.nom}
                          {n.responsable && <> · resp. {n.responsable}</>}
                        </p>
                      </div>
                      <StatutBadge label="Ouvert" tone="danger" />
                    </div>
                    {n.photoData && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={n.photoData}
                        alt="Photo"
                        className="mt-3 h-28 w-28 rounded-lg object-cover ring-1 ring-slate-200"
                      />
                    )}
                    <ResoudreNCForm id={n.id} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {resolus.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-slate-800">Résolues</h2>
              <ul className="space-y-2">
                {resolus.map((n) => (
                  <li key={n.id} className="card p-4 opacity-90">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">{n.type}</p>
                        <p className="mt-0.5 text-sm text-slate-600">{n.description}</p>
                        {n.actionCorrective && (
                          <p className="mt-1 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
                            <span className="font-semibold">Action corrective :</span> {n.actionCorrective}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-slate-400">
                          Ouvert {formatDateTime(n.createdAt)}
                          {n.resolvedAt && <> · résolu {formatDateTime(n.resolvedAt)}</>}
                          {n.responsable && <> · {n.responsable}</>}
                        </p>
                      </div>
                      <StatutBadge label="Résolu" tone="ok" />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <ImmutableNote />
    </div>
  );
}
