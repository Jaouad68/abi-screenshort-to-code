import { requireGarageId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { joursRestants } from "@/lib/ct";
import { AjoutVehiculeForm } from "./AjoutVehiculeForm";
import { envoyerRappelMaintenant, marquerStatutVehicule } from "./actions";

const STATUT_LABEL: Record<string, string> = {
  A_VENIR: "Pas encore relancé",
  ENVOYE: "En attente",
  SANS_REPONSE: "Sans réponse",
  CONFIRME: "RDV pris",
};

const STATUT_CLS: Record<string, string> = {
  A_VENIR: "bg-surface-3 text-text-dim",
  ENVOYE: "bg-surface-3 text-text-dim",
  SANS_REPONSE: "bg-coral-bg text-coral",
  CONFIRME: "bg-mint-bg text-mint",
};

export default async function VehiculesPage() {
  const garageId = await requireGarageId();

  const vehicules = await prisma.vehicule.findMany({
    where: { garageId },
    orderBy: { ctEcheance: "asc" },
    include: { rappels: { orderBy: { envoyeLe: "desc" }, take: 1 } },
  });

  const aujourdHui = new Date();

  return (
    <div className="flex flex-col gap-4.5">
      <AjoutVehiculeForm />

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-5 pt-5 pb-1">
          <h2 className="font-extrabold text-sm">
            Véhicules suivis <span className="text-text-faint font-semibold">({vehicules.length})</span>
          </h2>
        </div>

        {vehicules.length === 0 ? (
          <p className="text-text-faint text-sm px-5 pb-6 pt-2">
            Aucun véhicule pour l&apos;instant — ajoutez-en un pour démarrer l&apos;agent 1.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[720px]">
              <thead>
                <tr className="text-left text-[0.7rem] font-bold uppercase tracking-wide text-text-faint">
                  <th className="px-5 pb-3">Véhicule</th>
                  <th className="px-2 pb-3">CT prévu</th>
                  <th className="px-2 pb-3">Dernier rappel</th>
                  <th className="px-2 pb-3">Statut</th>
                  <th className="px-5 pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {vehicules.map((v) => {
                  const restants = joursRestants(v.ctEcheance, aujourdHui);
                  const dernierRappel = v.rappels[0];
                  return (
                    <tr key={v.id} className="border-t border-border">
                      <td className="px-5 py-3.5">
                        <div className="font-mono font-bold text-sm">{v.plaque}</div>
                        <div className="text-xs text-text-faint font-semibold">{v.clientNom}</div>
                      </td>
                      <td className="px-2 py-3.5 text-sm">
                        <div className="font-mono">{v.ctEcheance.toLocaleDateString("fr-FR")}</div>
                        <div className="text-xs text-text-faint">
                          {restants >= 0 ? `dans ${restants} j` : `dépassé de ${-restants} j`}
                        </div>
                      </td>
                      <td className="px-2 py-3.5 text-sm text-text-dim">
                        {dernierRappel ? dernierRappel.envoyeLe.toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-2 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${STATUT_CLS[v.statut]}`}>
                          {STATUT_LABEL[v.statut]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <form action={envoyerRappelMaintenant.bind(null, v.id)}>
                            <button
                              type="submit"
                              className="rounded-[8px] bg-lime text-lime-ink text-xs font-bold px-2.5 py-1.5 hover:brightness-105 transition"
                            >
                              Rappel
                            </button>
                          </form>
                          {v.statut !== "CONFIRME" && (
                            <form action={marquerStatutVehicule.bind(null, v.id, "CONFIRME")}>
                              <button
                                type="submit"
                                className="rounded-[8px] bg-surface-3 text-text-dim text-xs font-bold px-2.5 py-1.5 hover:text-text transition"
                              >
                                RDV pris
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
