import Link from "next/link";
import { requireGarageId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { joursRestants } from "@/lib/ct";
import { joursEcoules } from "@/lib/devis";
import { formaterCentimes } from "@/lib/money";
import { formaterTempsRelatif } from "@/lib/temps";
import { relancerDevisMaintenant } from "./devis/actions";

function debutDuMoisUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
function moisPrecedent(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
}
function delta(actuel: number, precedent: number): string | null {
  if (precedent === 0) return actuel > 0 ? "nouveau ce mois-ci" : null;
  const pct = Math.round(((actuel - precedent) / precedent) * 100);
  const signe = pct >= 0 ? "+" : "";
  return `${signe}${pct}% vs mois dernier`;
}

const CIRCONFERENCE = 2 * Math.PI * 15.5;

export default async function ApercuPage() {
  const garageId = await requireGarageId();
  const aujourdHui = new Date();
  const debutMois = debutDuMoisUtc(aujourdHui);
  const debutMoisDernier = moisPrecedent(aujourdHui);

  const [
    vehicules,
    devisEnCours,
    devisEnAttenteCount,
    rappelsCeMois,
    rappelsMoisDernier,
    relancesCeMois,
    relancesMoisDernier,
    devisReveilles,
    derniersRappels,
    dernieresRelances,
  ] = await Promise.all([
    prisma.vehicule.findMany({ where: { garageId }, select: { statut: true, ctEcheance: true } }),
    prisma.devis.findMany({
      where: { garageId, statut: { in: ["EN_ATTENTE", "RELANCE"] } },
      orderBy: { emisLe: "asc" },
      take: 6,
    }),
    prisma.devis.count({ where: { garageId, statut: { in: ["EN_ATTENTE", "RELANCE"] } } }),
    prisma.rappelCt.count({ where: { vehicule: { garageId }, envoyeLe: { gte: debutMois } } }),
    prisma.rappelCt.count({
      where: { vehicule: { garageId }, envoyeLe: { gte: debutMoisDernier, lt: debutMois } },
    }),
    prisma.relanceDevis.count({ where: { devis: { garageId }, envoyeLe: { gte: debutMois } } }),
    prisma.relanceDevis.count({
      where: { devis: { garageId }, envoyeLe: { gte: debutMoisDernier, lt: debutMois } },
    }),
    prisma.devis.aggregate({
      where: { garageId, statut: "SIGNE", updatedAt: { gte: debutMois }, relances: { some: {} } },
      _sum: { montantCentimes: true },
    }),
    prisma.rappelCt.findMany({
      where: { vehicule: { garageId } },
      orderBy: { envoyeLe: "desc" },
      take: 5,
      include: { vehicule: { select: { plaque: true, clientNom: true } } },
    }),
    prisma.relanceDevis.findMany({
      where: { devis: { garageId } },
      orderBy: { envoyeLe: "desc" },
      take: 5,
      include: { devis: { select: { reference: true, clientNom: true } } },
    }),
  ]);

  const relancesTotalCeMois = rappelsCeMois + relancesCeMois;
  const relancesTotalMoisDernier = rappelsMoisDernier + relancesMoisDernier;
  const deltaRelances = delta(relancesTotalCeMois, relancesTotalMoisDernier);

  const ctARelancer = vehicules.filter(
    (v) => v.statut !== "CONFIRME" && joursRestants(v.ctEcheance, aujourdHui) <= 7
  ).length;

  const confirme = vehicules.filter((v) => v.statut === "CONFIRME").length;
  const enAttente = vehicules.filter((v) => v.statut === "ENVOYE").length;
  const sansReponse = vehicules.filter((v) => v.statut === "SANS_REPONSE").length;
  const totalRelances = confirme + enAttente + sansReponse;
  const tauxReponse = totalRelances > 0 ? Math.round((confirme / totalRelances) * 100) : null;

  const segments = [
    { valeur: confirme, couleur: "var(--lime)" },
    { valeur: enAttente, couleur: "var(--mint)" },
    { valeur: sansReponse, couleur: "var(--coral)" },
  ];
  let offset = 0;
  const arcs = segments.map((s) => {
    const longueur = totalRelances > 0 ? (s.valeur / totalRelances) * CIRCONFERENCE : 0;
    const arc = { ...s, longueur, offset: -offset };
    offset += longueur;
    return arc;
  });

  const activite = [
    ...derniersRappels.map((r) => ({
      key: `rappel-${r.id}`,
      envoyeLe: r.envoyeLe,
      texte: (
        <>
          <b>Rappel CT</b> envoyé à {r.vehicule.plaque}
        </>
      ),
      couleur: "lime" as const,
    })),
    ...dernieresRelances.map((r) => ({
      key: `relance-${r.id}`,
      envoyeLe: r.envoyeLe,
      texte: (
        <>
          Devis <b>{r.devis.reference}</b> relancé
        </>
      ),
      couleur: "mint" as const,
    })),
  ]
    .sort((a, b) => b.envoyeLe.getTime() - a.envoyeLe.getTime())
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-4.5">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-surface border border-border rounded-md p-4 flex flex-col gap-1.5">
          <span className="text-xs text-text-faint font-semibold">Relances envoyées</span>
          <span className="text-2xl font-extrabold tabular">{relancesTotalCeMois}</span>
          <span className="text-xs font-bold text-mint">{deltaRelances ?? "ce mois-ci"}</span>
        </div>
        <div className="bg-surface border border-border rounded-md p-4 flex flex-col gap-1.5">
          <span className="text-xs text-text-faint font-semibold">Devis réveillés</span>
          <span className="text-2xl font-extrabold tabular">
            {formaterCentimes(devisReveilles._sum.montantCentimes ?? 0)}
          </span>
          <span className="text-xs font-bold text-text-faint">signés après relance ce mois-ci</span>
        </div>
        <div className="bg-surface border border-border rounded-md p-4 flex flex-col gap-1.5">
          <span className="text-xs text-text-faint font-semibold">CT à relancer</span>
          <span className="text-2xl font-extrabold tabular">{ctARelancer}</span>
          <span className="text-xs font-bold text-coral">sous 7 jours, aujourd&apos;hui</span>
        </div>
        <div className="bg-surface border border-border rounded-md p-4 flex flex-col gap-1.5">
          <span className="text-xs text-text-faint font-semibold">Taux de réponse CT</span>
          <span className="text-2xl font-extrabold tabular">{tauxReponse !== null ? `${tauxReponse}%` : "—"}</span>
          <span className="text-xs font-bold text-text-faint">sur les rappels envoyés</span>
        </div>
      </div>

      {/* Donut + rail */}
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-3.5 items-start">
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-extrabold text-sm mb-4">Aperçu des contrôles techniques</h2>
          {totalRelances === 0 ? (
            <p className="text-text-faint text-sm">
              Aucun rappel envoyé pour l&apos;instant — ajoutez des véhicules dans{" "}
              <Link href="/tableau-de-bord/vehicules" className="text-lime font-bold">
                Contrôles techniques
              </Link>
              .
            </p>
          ) : (
            <div className="flex items-center gap-5 flex-wrap">
              <div className="relative w-[148px] h-[148px] flex-none">
                <svg viewBox="0 0 36 36" width="148" height="148">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--surface-3)" strokeWidth="4.2" />
                  {arcs.map((a, i) => (
                    <circle
                      key={i}
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke={a.couleur}
                      strokeWidth="4.2"
                      strokeDasharray={`${a.longueur} ${CIRCONFERENCE - a.longueur}`}
                      strokeDashoffset={a.offset}
                      strokeLinecap="round"
                      transform="rotate(-90 18 18)"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <b className="text-xl font-extrabold">{totalRelances}</b>
                  <span className="text-[0.68rem] text-text-faint font-semibold">rappels envoyés</span>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 flex-1 min-w-[160px]">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-[3px] bg-lime flex-none" />
                  <span className="text-text-dim font-semibold flex-1">RDV pris</span>
                  <span className="font-bold tabular">{confirme}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-[3px] bg-mint flex-none" />
                  <span className="text-text-dim font-semibold flex-1">En attente</span>
                  <span className="font-bold tabular">{enAttente}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-[3px] bg-coral flex-none" />
                  <span className="text-text-dim font-semibold flex-1">Sans réponse</span>
                  <span className="font-bold tabular">{sansReponse}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="bg-surface-2 border border-border rounded-md px-4 py-3">
                  <div className="text-xs text-text-faint font-semibold">Véhicules suivis</div>
                  <div className="text-lg font-extrabold tabular">{vehicules.length}</div>
                </div>
                <div className="bg-surface-2 border border-border rounded-md px-4 py-3">
                  <div className="text-xs text-text-faint font-semibold">Devis en attente</div>
                  <div className="text-lg font-extrabold tabular">{devisEnAttenteCount}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-extrabold text-sm mb-3.5">Activité récente</h2>
          {activite.length === 0 ? (
            <p className="text-text-faint text-sm">Rien à signaler pour l&apos;instant.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {activite.map((a) => (
                <div key={a.key} className="flex items-start gap-2.5">
                  <span
                    className={`w-6 h-6 rounded-[7px] grid place-items-center flex-none mt-0.5 ${
                      a.couleur === "lime" ? "bg-lime-bg text-lime" : "bg-mint-bg text-mint"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M9 12L11 14L15.5 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-sm text-text-dim leading-snug">
                    {a.texte}
                    <span className="block text-xs text-text-faint mt-0.5">
                      {formaterTempsRelatif(a.envoyeLe, aujourdHui)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Devis en attente */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-5 pt-5 pb-1 flex items-center justify-between">
          <h2 className="font-extrabold text-sm">Devis en attente</h2>
          <Link href="/tableau-de-bord/devis" className="text-xs font-bold text-lime">
            Tout voir
          </Link>
        </div>
        {devisEnCours.length === 0 ? (
          <p className="text-text-faint text-sm px-5 pb-6 pt-2">Aucun devis en attente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[560px]">
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
                {devisEnCours.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-sm">{d.clientNom}</div>
                      <div className="text-xs text-text-faint font-mono">Devis {d.reference}</div>
                    </td>
                    <td className="px-2 py-3.5 text-sm font-mono">{joursEcoules(d.emisLe, aujourdHui)} j</td>
                    <td className="px-2 py-3.5 text-sm font-mono">{formaterCentimes(d.montantCentimes)}</td>
                    <td className="px-2 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          d.statut === "EN_ATTENTE" ? "bg-coral-bg text-coral" : "bg-surface-3 text-text-dim"
                        }`}
                      >
                        {d.statut === "EN_ATTENTE" ? "Jamais relancé" : "Relance en cours"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <form action={relancerDevisMaintenant.bind(null, d.id)}>
                        <button
                          type="submit"
                          className="rounded-[8px] bg-lime text-lime-ink text-xs font-bold px-2.5 py-1.5 hover:brightness-105 transition"
                        >
                          Relancer
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Agent 3 teaser */}
      <div className="bg-gradient-to-br from-surface-2 to-surface border border-border-strong rounded-lg p-5 flex flex-col gap-2.5">
        <span className="self-start inline-flex items-center gap-1.5 bg-lime-bg text-lime rounded-full px-2.5 py-1 text-xs font-bold">
          <svg viewBox="0 0 24 24" fill="none" className="w-2.5 h-2.5">
            <path
              d="M12 3L14.5 9L21 9.7L16.2 14L17.6 20.5L12 17.2L6.4 20.5L7.8 14L3 9.7L9.5 9L12 3Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
          Bientôt disponible
        </span>
        <h2 className="font-extrabold">Agent 3 · Décroche à sa place</h2>
        <p className="text-sm text-text-dim max-w-md">
          L&apos;agent vocal répond au comptoir quand le mécanicien est occupé, prend le message et
          propose un créneau — actuellement en cadrage sur un garage pilote.
        </p>
      </div>
    </div>
  );
}
