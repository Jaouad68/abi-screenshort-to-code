import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { startOfMonth, startOfToday, startOfWeek } from "@/lib/dates";
import { PageHeader, EmptyState, StatutBadge, ImmutableNote } from "@/components/ui";
import { FREQUENCE_LABEL, formatDateTime } from "@/lib/labels";
import { validerTache } from "./actions";

export const dynamic = "force-dynamic";

function periodStart(frequence: string): Date {
  if (frequence === "HEBDOMADAIRE") return startOfWeek();
  if (frequence === "MENSUELLE") return startOfMonth();
  return startOfToday();
}

export default async function NettoyagePage() {
  const user = await requireUser();

  const taches = await prisma.tacheNettoyage.findMany({
    where: { etablissementId: user.etablissementId, actif: true },
    orderBy: [{ frequence: "asc" }, { libelle: "asc" }],
    include: {
      validations: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { utilisateur: true },
      },
    },
  });

  const items = taches.map((t) => {
    const last = t.validations[0];
    const faitPeriode = last ? last.createdAt >= periodStart(t.frequence) : false;
    return { ...t, last, faitPeriode };
  });

  const restant = items.filter((i) => !i.faitPeriode).length;

  return (
    <div>
      <PageHeader
        title="Plan de nettoyage"
        subtitle="Cochez chaque tâche réalisée. La validation est horodatée et signée."
        action={
          <StatutBadge
            label={restant === 0 ? "Tout est fait ✓" : `${restant} à faire`}
            tone={restant === 0 ? "ok" : "warn"}
          />
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon="🧽"
          title="Aucune tâche de nettoyage"
          hint="Le gérant peut créer le plan de nettoyage dans « Réglages »."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li
              key={t.id}
              className={`card flex items-center gap-3 px-4 py-3 ${t.faitPeriode ? "opacity-70" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800">
                  {t.faitPeriode && "✓ "}
                  {t.libelle}
                </p>
                <p className="text-xs text-slate-500">
                  {t.zone} · {FREQUENCE_LABEL[t.frequence]}
                  {t.faitPeriode && t.last && (
                    <> · fait le {formatDateTime(t.last.createdAt)} par {t.last.utilisateur.nom}</>
                  )}
                </p>
              </div>
              {t.faitPeriode ? (
                <StatutBadge label="Validé" tone="ok" />
              ) : (
                <form action={validerTache}>
                  <input type="hidden" name="tacheId" value={t.id} />
                  <button className="btn-primary px-4 py-2 text-sm">Valider</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      <ImmutableNote />
    </div>
  );
}
