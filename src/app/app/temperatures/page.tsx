import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { startOfToday } from "@/lib/dates";
import { PageHeader, ConformeBadge, EmptyState, ImmutableNote } from "@/components/ui";
import { TYPE_EQUIPEMENT_LABEL, formatTime, formatTemp } from "@/lib/labels";
import { ReleveForm } from "./ReleveForm";

export const dynamic = "force-dynamic";

export default async function TemperaturesPage() {
  const user = await requireUser();

  const [equipements, releves] = await Promise.all([
    prisma.equipement.findMany({
      where: { etablissementId: user.etablissementId, actif: true },
      orderBy: { nom: "asc" },
    }),
    prisma.releveTemperature.findMany({
      where: {
        equipement: { etablissementId: user.etablissementId },
        createdAt: { gte: startOfToday() },
      },
      include: { equipement: true, utilisateur: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Relevés de température"
        subtitle="Sélectionnez l'enceinte, saisissez la température, enregistrez."
      />

      <ReleveForm
        equipements={equipements.map((e) => ({
          id: e.id,
          nom: e.nom,
          type: e.type,
          tempMin: e.tempMin,
          tempMax: e.tempMax,
        }))}
      />

      <h2 className="mb-3 mt-8 text-lg font-bold text-slate-800">
        Relevés du jour <span className="text-slate-400">({releves.length})</span>
      </h2>

      {releves.length === 0 ? (
        <EmptyState icon="🌡️" title="Aucun relevé aujourd'hui" hint="Le premier relevé apparaîtra ici." />
      ) : (
        <ul className="space-y-2">
          {releves.map((r) => (
            <li
              key={r.id}
              className="card flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800">{r.equipement.nom}</p>
                <p className="text-xs text-slate-500">
                  {TYPE_EQUIPEMENT_LABEL[r.equipement.type]} · {formatTime(r.createdAt)} · {r.utilisateur.nom}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={
                    r.conforme
                      ? "text-lg font-bold tabular-nums text-slate-800"
                      : "text-lg font-bold tabular-nums text-red-600"
                  }
                >
                  {formatTemp(r.valeur)}
                </span>
                <ConformeBadge conforme={r.conforme} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <ImmutableNote />
    </div>
  );
}
