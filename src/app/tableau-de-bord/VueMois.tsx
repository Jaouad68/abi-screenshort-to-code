import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  debutEtFinDeMoisUtc,
  ajouterMois,
  formatMoisFr,
  debutDeSemaineIso,
  ajouterJours,
} from "@/lib/datetime";

export async function VueMois({ salonId, moisISO }: { salonId: string; moisISO: string }) {
  const { debut, fin } = debutEtFinDeMoisUtc(moisISO);

  const rendezVous = await prisma.appointment.findMany({
    where: { salonId, debutAt: { gte: debut, lt: fin }, statut: { not: "ANNULE" } },
    select: { debutAt: true },
  });

  const compteParJour = new Map<string, number>();
  for (const rdv of rendezVous) {
    const jourISO = rdv.debutAt.toISOString().slice(0, 10);
    compteParJour.set(jourISO, (compteParJour.get(jourISO) ?? 0) + 1);
  }

  const premierJourMois = `${moisISO}-01`;
  const dernierJourDate = new Date(fin);
  dernierJourDate.setUTCDate(dernierJourDate.getUTCDate() - 1);
  const dernierJourMois = dernierJourDate.toISOString().slice(0, 10);

  const debutGrille = debutDeSemaineIso(premierJourMois);
  const finGrilleBrute = debutDeSemaineIso(dernierJourMois);
  const finGrille = ajouterJours(finGrilleBrute, 6);

  const jours: string[] = [];
  let curseur = debutGrille;
  while (curseur <= finGrille) {
    jours.push(curseur);
    curseur = ajouterJours(curseur, 1);
  }

  const moisCourant = premierJourMois.slice(0, 7);

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-2">
        <h1 className="font-serif text-3xl capitalize">{formatMoisFr(moisISO)}</h1>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Link href={`/tableau-de-bord?vue=mois&date=${ajouterMois(moisISO, -1)}-01`} className="hover:text-sage-d">
            ← Mois précédent
          </Link>
          <Link href="/tableau-de-bord?vue=mois" className="hover:text-sage-d">
            Ce mois-ci
          </Link>
          <Link href={`/tableau-de-bord?vue=mois&date=${ajouterMois(moisISO, 1)}-01`} className="hover:text-sage-d">
            Mois suivant →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase font-semibold text-muted mb-2">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((j) => (
          <div key={j}>{j}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {jours.map((jourISO) => {
          const horsMois = jourISO.slice(0, 7) !== moisCourant;
          const compte = compteParJour.get(jourISO) ?? 0;
          const jourNumero = Number(jourISO.slice(8, 10));
          return (
            <Link
              key={jourISO}
              href={`/tableau-de-bord?date=${jourISO}`}
              className={`rounded-control border border-line p-2 min-h-[64px] flex flex-col items-center gap-1 hover:border-sage-line transition-colors ${
                horsMois ? "opacity-30" : "bg-paper"
              }`}
            >
              <span className="text-sm tabular-nums">{jourNumero}</span>
              {compte > 0 && (
                <span className="text-xs font-semibold text-sage-d bg-sage-l rounded-pill px-2">
                  {compte}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
