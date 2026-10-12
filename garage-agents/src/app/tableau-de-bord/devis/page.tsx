import { requireGarageId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { joursEcoules } from "@/lib/devis";
import { formaterCentimes } from "@/lib/money";
import { AjoutDevisForm } from "./AjoutDevisForm";
import { relancerDevisMaintenant, marquerStatutDevis } from "./actions";

const STATUT_LABEL: Record<string, string> = {
  EN_ATTENTE: "Jamais relancé",
  RELANCE: "Relance en cours",
  SIGNE: "Signé",
  PERDU: "Perdu",
};

const STATUT_CLS: Record<string, string> = {
  EN_ATTENTE: "bg-coral-bg text-coral",
  RELANCE: "bg-surface-3 text-text-dim",
  SIGNE: "bg-mint-bg text-mint",
  PERDU: "bg-surface-3 text-text-faint",
};

export default async function DevisPage() {
  const garageId = await requireGarageId();

  const devis = await prisma.devis.findMany({
    where: { garageId },
    orderBy: { emisLe: "asc" },
    include: { relances: { orderBy: { envoyeLe: "desc" }, take: 1 } },
  });

  const aujourdHui = new Date();

  return (
    <div className="flex flex-col gap-4.5">
      <AjoutDevisForm />

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-5 pt-5 pb-1">
          <h2 className="font-extrabold text-sm">
            Devis <span className="text-text-faint font-semibold">({devis.length})</span>
          </h2>
        </div>

        {devis.length === 0 ? (
          <p className="text-text-faint text-sm px-5 pb-6 pt-2">
            Aucun devis pour l&apos;instant — ajoutez-en un pour démarrer l&apos;agent 2.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[720px]">
              <thead>
                <tr className="text-left text-[0.7rem] font-bold uppercase tracking-wide text-text-faint">
                  <th className="px-5 pb-3">Client</th>
                  <th className="px-2 pb-3">Ancienneté</th>
                  <th className="px-2 pb-3">Montant</th>
                  <th className="px-2 pb-3">Statut</th>
                  <th className="px-5 pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {devis.map((d) => {
                  const jours = joursEcoules(d.emisLe, aujourdHui);
                  const enCours = d.statut === "EN_ATTENTE" || d.statut === "RELANCE";
                  return (
                    <tr key={d.id} className="border-t border-border">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-sm">{d.clientNom}</div>
                        <div className="text-xs text-text-faint font-mono">Devis {d.reference}</div>
                      </td>
                      <td className="px-2 py-3.5 text-sm font-mono">{jours} j</td>
                      <td className="px-2 py-3.5 text-sm font-mono">{formaterCentimes(d.montantCentimes)}</td>
                      <td className="px-2 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${STATUT_CLS[d.statut]}`}>
                          {STATUT_LABEL[d.statut]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {enCours && (
                            <>
                              <form action={relancerDevisMaintenant.bind(null, d.id)}>
                                <button
                                  type="submit"
                                  className="rounded-[8px] bg-lime text-lime-ink text-xs font-bold px-2.5 py-1.5 hover:brightness-105 transition"
                                >
                                  Relancer
                                </button>
                              </form>
                              <form action={marquerStatutDevis.bind(null, d.id, "SIGNE")}>
                                <button
                                  type="submit"
                                  className="rounded-[8px] bg-surface-3 text-text-dim text-xs font-bold px-2.5 py-1.5 hover:text-text transition"
                                >
                                  Signé
                                </button>
                              </form>
                            </>
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
