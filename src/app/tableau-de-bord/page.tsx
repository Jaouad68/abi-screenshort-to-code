import Link from "next/link";
import { requireSalon } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { dateVersHeure, debutEtFinDeJourUtc, dateISOActuelle, ajouterJours } from "@/lib/datetime";
import type { ReglagesAcompte } from "@/lib/horaires";
import { STATUT_LABEL, ACOMPTE_LABEL } from "@/lib/statut";
import { marquerHonore, marquerNonVenu } from "./actions-agenda";

export default async function TableauDeBordPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const salon = await requireSalon();
  const { date: dateParam } = await searchParams;
  const date = dateParam ?? dateISOActuelle();

  const { debut, fin } = debutEtFinDeJourUtc(date);
  const rendezVous = await prisma.appointment.findMany({
    where: { salonId: salon.id, debutAt: { gte: debut, lte: fin } },
    include: { client: true, service: true, praticien: true },
    orderBy: { debutAt: "asc" },
  });

  const reglages = salon.reglagesAcompte as ReglagesAcompte;
  const totalPrevu = rendezVous
    .filter((r) => r.statut !== "ANNULE")
    .reduce((sum, r) => sum + r.service.prixCents, 0);

  const dateAffichee = new Date(`${date}T00:00:00.000Z`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-serif text-3xl capitalize">{dateAffichee}</h1>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Link href={`/tableau-de-bord?date=${ajouterJours(date, -1)}`} className="hover:text-sage-d">
            ← Veille
          </Link>
          <Link href="/tableau-de-bord" className="hover:text-sage-d">
            Aujourd&apos;hui
          </Link>
          <Link href={`/tableau-de-bord?date=${ajouterJours(date, 1)}`} className="hover:text-sage-d">
            Lendemain →
          </Link>
        </div>
      </div>
      <p className="text-muted mb-8">
        {rendezVous.length} rendez-vous · {formatCents(totalPrevu)} prévus
      </p>

      <div className="flex flex-col gap-3">
        {rendezVous.length === 0 && (
          <p className="text-muted italic">Aucun rendez-vous ce jour-là.</p>
        )}
        {rendezVous.map((rdv) => {
          const alerteNoShow = rdv.client.noShowCount >= reglages.seuilNoShow;
          return (
            <div
              key={rdv.id}
              className={`bg-paper rounded-card border border-line px-6 py-4 ${
                rdv.statut === "ANNULE" || rdv.statut === "NON_VENU" ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">
                    <span className="tabular-nums">{dateVersHeure(rdv.debutAt)}</span>{" "}
                    {rdv.client.prenom}
                    {alerteNoShow && (
                      <span className="ml-2 text-xs font-semibold text-danger">
                        ⚠ {rdv.client.noShowCount} non venue{rdv.client.noShowCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted">
                    {rdv.service.nom} · {rdv.praticien.nom} · {formatCents(rdv.service.prixCents)}
                    {rdv.acompteStatut !== "AUCUN" && (
                      <>
                        {" "}
                        ·{" "}
                        <span className="text-brass font-medium">
                          {ACOMPTE_LABEL[rdv.acompteStatut]} ({formatCents(rdv.acompteCents)})
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs uppercase font-semibold text-muted">
                    {STATUT_LABEL[rdv.statut]}
                  </span>
                  {(rdv.statut === "RESERVE" || rdv.statut === "CONFIRME") && (
                    <div className="flex gap-2">
                      <form action={marquerHonore.bind(null, rdv.id)}>
                        <button
                          type="submit"
                          className="rounded-control border border-line px-3 py-1.5 text-sm font-semibold hover:border-sage-line min-h-[36px]"
                        >
                          Terminé
                        </button>
                      </form>
                      <form action={marquerNonVenu.bind(null, rdv.id)}>
                        <button
                          type="submit"
                          className="rounded-control border border-danger text-danger px-3 py-1.5 text-sm font-semibold hover:bg-danger/10 min-h-[36px]"
                        >
                          Non venu
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
