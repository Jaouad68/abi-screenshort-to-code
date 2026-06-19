import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { startOfToday } from "@/lib/dates";
import { PageHeader, EmptyState, ImmutableNote } from "@/components/ui";
import { ReleveForm } from "./ReleveForm";
import { ReleveItem } from "./ReleveItem";
import { toReleveView } from "./serialize";

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
        correctionDeId: null, // on n'affiche pas les corrections comme des lignes autonomes
      },
      include: {
        equipement: true,
        utilisateur: true,
        correction: { include: { utilisateur: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Relevés de température"
        subtitle="Sélectionnez l'enceinte, saisissez la température, enregistrez."
        action={
          <Link href="/app/temperatures/historique" className="btn-secondary py-2 text-sm">
            Historique
          </Link>
        }
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
            <ReleveItem key={r.id} releve={toReleveView(r)} />
          ))}
        </ul>
      )}

      <ImmutableNote />
    </div>
  );
}
