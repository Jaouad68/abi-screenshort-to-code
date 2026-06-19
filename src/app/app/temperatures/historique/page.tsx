import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { daysAgo } from "@/lib/dates";
import { PageHeader, EmptyState, ImmutableNote } from "@/components/ui";
import { TempChart, type ChartPoint } from "@/components/TempChart";
import { TYPE_EQUIPEMENT_LABEL } from "@/lib/labels";
import { ReleveItem } from "../ReleveItem";
import { toReleveView } from "../serialize";

export const dynamic = "force-dynamic";

const JOURS_OPTIONS = [7, 30, 90];

export default async function HistoriqueTemperaturePage({
  searchParams,
}: {
  searchParams: { equipement?: string; jours?: string };
}) {
  const user = await requireUser();

  const equipements = await prisma.equipement.findMany({
    where: { etablissementId: user.etablissementId },
    orderBy: [{ actif: "desc" }, { nom: "asc" }],
  });

  const jours = JOURS_OPTIONS.includes(Number(searchParams.jours)) ? Number(searchParams.jours) : 30;
  const selectedId =
    searchParams.equipement && equipements.some((e) => e.id === searchParams.equipement)
      ? searchParams.equipement
      : equipements[0]?.id;

  const selected = equipements.find((e) => e.id === selectedId);

  const releves = selectedId
    ? await prisma.releveTemperature.findMany({
        where: {
          equipementId: selectedId,
          createdAt: { gte: daysAgo(jours) },
          correctionDeId: null,
        },
        include: {
          equipement: true,
          utilisateur: true,
          correction: { include: { utilisateur: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // Pour la courbe : on retient la valeur effective (corrigée si correction).
  const points: ChartPoint[] = releves.map((r) => {
    const eff = r.correction ?? r;
    return { t: r.createdAt.getTime(), v: eff.valeur, conforme: eff.conforme };
  });

  const horsPlage = points.filter((p) => !p.conforme).length;

  return (
    <div>
      <PageHeader
        title="Historique des températures"
        subtitle="Filtrez par équipement et période. Données conservées ≥ 12 mois."
        action={
          <Link href="/app/temperatures" className="btn-secondary py-2 text-sm">
            ← Saisie
          </Link>
        }
      />

      {equipements.length === 0 ? (
        <EmptyState icon="🌡️" title="Aucun équipement" />
      ) : (
        <>
          <form method="get" className="card mb-5 grid grid-cols-1 gap-3 p-4 sm:grid-cols-[1fr_auto_auto]">
            <select name="equipement" defaultValue={selectedId} className="field">
              {equipements.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom} {e.actif ? "" : "(inactif)"}
                </option>
              ))}
            </select>
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

          {selected && (
            <div className="card mb-5 p-5">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-800">{selected.nom}</h2>
                  <p className="text-xs text-slate-500">
                    {TYPE_EQUIPEMENT_LABEL[selected.type]} · cible {selected.tempMin} à {selected.tempMax} °C
                  </p>
                </div>
                <span className="text-sm text-slate-500">
                  {points.length} relevés · <span className={horsPlage ? "text-red-600 font-semibold" : ""}>{horsPlage} hors plage</span>
                </span>
              </div>
              <TempChart points={points} tempMin={selected.tempMin} tempMax={selected.tempMax} />
            </div>
          )}

          <h2 className="mb-3 text-lg font-bold text-slate-800">Relevés ({releves.length})</h2>
          {releves.length === 0 ? (
            <EmptyState icon="📭" title="Aucun relevé sur la période" />
          ) : (
            <ul className="space-y-2">
              {releves.map((r) => (
                <ReleveItem key={r.id} releve={toReleveView(r)} />
              ))}
            </ul>
          )}
        </>
      )}

      <ImmutableNote />
    </div>
  );
}
