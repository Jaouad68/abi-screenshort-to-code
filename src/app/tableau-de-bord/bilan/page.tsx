import Link from "next/link";
import { requireSalon } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { calculerBilan, type AppointmentPourBilan } from "@/lib/bilan";
import { moisActuelISO, debutEtFinDeMoisUtc, ajouterMois, formatMoisFr } from "@/lib/datetime";

async function chargerBilanDuMois(salonId: string, moisISO: string) {
  const { debut, fin } = debutEtFinDeMoisUtc(moisISO);
  const rendezVous = await prisma.appointment.findMany({
    where: { salonId, debutAt: { gte: debut, lt: fin } },
    include: { service: true },
  });

  const pourBilan: AppointmentPourBilan[] = rendezVous.map((r) => ({
    debutAt: r.debutAt,
    finAt: r.finAt,
    statut: r.statut,
    source: r.source,
    acompteCents: r.acompteCents,
    acompteStatut: r.acompteStatut,
    prixCents: r.service.prixCents,
  }));

  return { bilan: calculerBilan(pourBilan), total: rendezVous.length };
}

export default async function BilanPage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>;
}) {
  const salon = await requireSalon();
  const { mois: moisParam } = await searchParams;
  const mois = moisParam ?? moisActuelISO();
  const moisPrecedent = ajouterMois(mois, -1);

  const [{ bilan, total }, { bilan: bilanPrecedent }] = await Promise.all([
    chargerBilanDuMois(salon.id, mois),
    chargerBilanDuMois(salon.id, moisPrecedent),
  ]);

  const tauxActuel = Math.round(bilan.tauxNonVenue * 100);
  const tauxPrecedent = Math.round(bilanPrecedent.tauxNonVenue * 100);
  const enLigne = Math.round(bilan.pourcentageEnLigne * 100);

  const sources: string[] = [];
  if (bilan.creneauxRepriseCount > 0) {
    sources.push(
      `${bilan.creneauxRepriseCount} créneau${bilan.creneauxRepriseCount > 1 ? "x" : ""} libéré${bilan.creneauxRepriseCount > 1 ? "s" : ""} puis repris`
    );
  }
  if (bilan.acomptesConservesCount > 0) {
    sources.push(
      `${bilan.acomptesConservesCount} acompte${bilan.acomptesConservesCount > 1 ? "s" : ""} conservé${bilan.acomptesConservesCount > 1 ? "s" : ""}`
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h1 className="font-serif text-3xl capitalize">{formatMoisFr(mois)}</h1>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Link href={`/tableau-de-bord/bilan?mois=${ajouterMois(mois, -1)}`} className="hover:text-sage-d">
            ← Mois précédent
          </Link>
          <Link href="/tableau-de-bord/bilan" className="hover:text-sage-d">
            Ce mois-ci
          </Link>
          <Link href={`/tableau-de-bord/bilan?mois=${ajouterMois(mois, 1)}`} className="hover:text-sage-d">
            Mois suivant →
          </Link>
        </div>
      </div>
      <p className="text-muted mb-8">{total} rendez-vous ce mois-ci.</p>

      <div className="card-hover bg-sage text-white rounded-card p-6 mb-3 flex items-start gap-4">
        <span className="shrink-0 w-11 h-11 rounded-full bg-white/15 flex items-center justify-center text-xl">
          €
        </span>
        <div>
          <p className="text-xs uppercase font-semibold tracking-wide text-sage-l mb-2">
            Récupéré grâce à RésaZen
          </p>
          <p className="font-serif text-4xl mb-2">{formatCents(bilan.recupereCents)}</p>
          <p className="text-sage-l text-sm">
            {sources.length > 0 ? sources.join(" et ") : "Rien à signaler ce mois-ci."}
          </p>
        </div>
      </div>

      <div className="card-hover bg-paper rounded-card border border-line p-6 mb-8">
        <p className="text-xs uppercase font-semibold text-muted tracking-wide mb-4">
          D&apos;où vient ce montant
        </p>
        <div className="flex flex-col gap-3">
          {bilan.creneauxRepriseCents > 0 && (
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span>Créneaux libérés puis repris</span>
              <span className="text-brass font-semibold">{formatCents(bilan.creneauxRepriseCents)}</span>
            </div>
          )}
          {bilan.acomptesConservesCents > 0 && (
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span>Acomptes conservés sur annulation tardive</span>
              <span className="text-brass font-semibold">
                {formatCents(bilan.acomptesConservesCents)}
              </span>
            </div>
          )}
          {bilan.creneauxRepriseCents === 0 && bilan.acomptesConservesCents === 0 && (
            <p className="text-muted italic">Aucun montant récupéré ce mois-ci.</p>
          )}
          {bilan.creneauxNonReprisCount > 0 &&
            (() => {
              const pluriel = bilan.creneauxNonReprisCount > 1;
              const sujet = `${bilan.creneauxNonReprisCount} créneau${pluriel ? "x" : ""} libéré${pluriel ? "s" : ""}`;
              const verbe = pluriel ? "n'ont" : "n'a";
              const reste = pluriel ? "ils ne sont pas comptés" : "il n'est pas compté";
              return (
                <p className="text-sm text-muted">
                  <strong>
                    {sujet} {verbe} pas trouvé preneur
                  </strong>{" "}
                  : {reste} ci-dessus.
                </p>
              );
            })()}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="card-hover bg-paper rounded-card border border-line p-6">
          <p className="text-sm text-muted mb-2">Taux de non-venue</p>
          <p className="font-serif text-3xl mb-1">{tauxActuel} %</p>
          <p
            className={`text-xs font-semibold ${
              tauxActuel === tauxPrecedent
                ? "text-muted font-normal"
                : tauxActuel < tauxPrecedent
                  ? "text-sage-d"
                  : "text-danger"
            }`}
          >
            {tauxActuel === tauxPrecedent
              ? "stable par rapport au mois précédent"
              : tauxActuel < tauxPrecedent
                ? `↓ contre ${tauxPrecedent} % le mois précédent`
                : `↑ contre ${tauxPrecedent} % le mois précédent`}
          </p>
        </div>
        <div className="card-hover bg-paper rounded-card border border-line p-6">
          <p className="text-sm text-muted mb-2">RDV pris en ligne</p>
          <p className="font-serif text-3xl mb-1">{enLigne} %</p>
          <p className="text-xs text-muted">autant de temps au téléphone en moins</p>
        </div>
      </div>

      <p className="text-sm text-muted mt-8">
        Ce chiffre ne compte que ce qui est prouvable : l&apos;argent réellement encaissé. Les
        créneaux libérés qui n&apos;ont trouvé personne sont affichés, mais comptés à zéro.
      </p>

      <div className="mt-8 pt-8 border-t border-line flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Fichier client</p>
          <p className="text-sm text-muted">
            Export CSV de vos clientes (RGPD) : coordonnées, consentement SMS, historique.
          </p>
        </div>
        <a
          href="/api/export/clients"
          className="rounded-pill bg-ink text-white px-5 py-2.5 font-semibold hover:bg-ink-2 transition-colors min-h-[44px] flex items-center shrink-0"
        >
          Télécharger (CSV)
        </a>
      </div>
    </div>
  );
}
