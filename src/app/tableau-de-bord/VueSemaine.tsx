import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { dateVersHeure, debutDeSemaineIso, ajouterJours } from "@/lib/datetime";
import { STATUT_LABEL } from "@/lib/statut";

export async function VueSemaine({ salonId, date }: { salonId: string; date: string }) {
  const lundi = debutDeSemaineIso(date);
  const jours = Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i));

  const debut = new Date(`${jours[0]}T00:00:00.000Z`);
  const fin = new Date(`${jours[6]}T23:59:59.999Z`);

  const rendezVous = await prisma.appointment.findMany({
    where: { salonId, debutAt: { gte: debut, lte: fin } },
    include: { client: true, service: true, praticien: true },
    orderBy: { debutAt: "asc" },
  });

  const parJour = jours.map((jourISO) => ({
    jourISO,
    rendezVous: rendezVous.filter((rdv) => rdv.debutAt.toISOString().slice(0, 10) === jourISO),
  }));

  const finSemaineLabel = new Date(`${jours[6]}T00:00:00.000Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const debutSemaineLabel = new Date(`${jours[0]}T00:00:00.000Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-2">
        <h1 className="font-serif text-3xl capitalize">
          {debutSemaineLabel} — {finSemaineLabel}
        </h1>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Link href={`/tableau-de-bord?vue=semaine&date=${ajouterJours(lundi, -7)}`} className="hover:text-sage-d">
            ← Semaine précédente
          </Link>
          <Link href="/tableau-de-bord?vue=semaine" className="hover:text-sage-d">
            Cette semaine
          </Link>
          <Link href={`/tableau-de-bord?vue=semaine&date=${ajouterJours(lundi, 7)}`} className="hover:text-sage-d">
            Semaine suivante →
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {parJour.map(({ jourISO, rendezVous: rdvsJour }) => {
          const label = new Date(`${jourISO}T00:00:00.000Z`).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          });
          const totalJour = rdvsJour
            .filter((r) => r.statut !== "ANNULE")
            .reduce((sum, r) => sum + r.service.prixCents, 0);

          return (
            <Link
              key={jourISO}
              href={`/tableau-de-bord?date=${jourISO}`}
              className="bg-paper rounded-card border border-line p-4 hover:border-sage-line transition-colors"
            >
              <p className="font-semibold capitalize mb-1">{label}</p>
              <p className="text-xs text-muted mb-3">
                {rdvsJour.length} rendez-vous · {formatCents(totalJour)}
              </p>
              <div className="flex flex-col gap-1">
                {rdvsJour.slice(0, 5).map((rdv) => (
                  <p key={rdv.id} className="text-sm truncate">
                    <span className="tabular-nums text-muted">{dateVersHeure(rdv.debutAt)}</span>{" "}
                    {rdv.client.prenom} ·{" "}
                    <span className="text-muted">{STATUT_LABEL[rdv.statut]}</span>
                  </p>
                ))}
                {rdvsJour.length > 5 && (
                  <p className="text-xs text-muted">+{rdvsJour.length - 5} autre(s)</p>
                )}
                {rdvsJour.length === 0 && <p className="text-sm text-muted italic">Rien de prévu</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
