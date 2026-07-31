import Link from "next/link";
import type { DevisStatut } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { DevisRow } from "@/components/DevisRow";
import { STATUT_LABEL } from "@/lib/statut";
import { btnPrimaire } from "@/lib/ui";

export default async function TableauDeBordPage() {
  const { user, company } = await requireUser();

  const seuilRelance = new Date(new Date().getTime() - company.relanceJours * 86_400_000);

  const [stats, derniers, nbClients, aRelancer] = await Promise.all([
    prisma.devis.groupBy({
      by: ["statut"],
      where: { userId: user.id },
      _sum: { totalTtcCents: true },
      _count: { _all: true },
    }),
    prisma.devis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { client: { select: { nom: true } } },
    }),
    prisma.client.count({ where: { userId: user.id } }),
    prisma.devis.findMany({
      where: { userId: user.id, statut: "ENVOYE", envoyeLe: { lte: seuilRelance } },
      orderBy: { envoyeLe: "asc" },
      include: { client: { select: { nom: true } } },
    }),
  ]);

  const sommeTtc = (s: DevisStatut) =>
    stats.find((x) => x.statut === s)?._sum.totalTtcCents ?? 0;
  const nombre = (s: DevisStatut) =>
    stats.find((x) => x.statut === s)?._count._all ?? 0;

  // CA prévisionnel : devis envoyés (en attente) + acceptés (à réaliser).
  const caPrevisionnel = sommeTtc("ENVOYE") + sommeTtc("ACCEPTE");
  // CA signé : acceptés + facturés.
  const caSigne = sommeTtc("ACCEPTE") + sommeTtc("FACTURE");

  // Taux d'acceptation parmi les devis ayant reçu une réponse.
  const nbAcceptes = nombre("ACCEPTE") + nombre("FACTURE");
  const nbRepondus = nbAcceptes + nombre("REFUSE");
  const tauxAcceptation =
    nbRepondus > 0 ? Math.round((nbAcceptes / nbRepondus) * 100) : null;

  const totalDevis =
    nombre("BROUILLON") +
    nombre("ENVOYE") +
    nombre("ACCEPTE") +
    nombre("REFUSE") +
    nombre("FACTURE");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Bonjour 👋</h1>
          <p className="text-muted">{company.nom}</p>
        </div>
        <Link href="/tableau-de-bord/devis/nouveau" className={btnPrimaire}>
          + Nouveau devis
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Kpi
          titre="CA prévisionnel"
          valeur={formatCents(caPrevisionnel)}
          detail="Envoyés + acceptés"
          accent
        />
        <Kpi
          titre="Taux d'acceptation"
          valeur={tauxAcceptation === null ? "—" : `${tauxAcceptation} %`}
          detail={nbRepondus > 0 ? `${nbAcceptes}/${nbRepondus} répondus` : "Aucune réponse"}
        />
        <Kpi titre="CA signé" valeur={formatCents(caSigne)} detail="Acceptés + facturés" />
        <Kpi
          titre="Devis · Clients"
          valeur={`${totalDevis} · ${nbClients}`}
          detail="Au total"
        />
      </div>

      {/* Répartition par statut */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8 -mx-1 px-1">
        {(["BROUILLON", "ENVOYE", "ACCEPTE", "REFUSE", "FACTURE"] as DevisStatut[]).map(
          (s) => (
            <Link
              key={s}
              href={`/tableau-de-bord/devis?statut=${s}`}
              className="shrink-0 rounded-card border border-line bg-card px-4 py-2.5 text-center min-w-[84px]"
            >
              <div className="text-lg font-bold tabular-nums">{nombre(s)}</div>
              <div className="text-[11px] text-muted">{STATUT_LABEL[s]}</div>
            </Link>
          ),
        )}
      </div>

      {/* Devis à relancer */}
      {aRelancer.length > 0 && (
        <section className="mb-8 rounded-card border border-accent/40 bg-accent-l p-4">
          <h2 className="font-bold text-accent-d mb-1">
            À relancer ({aRelancer.length})
          </h2>
          <p className="text-sm text-accent-d/80 mb-3">
            Devis envoyés il y a plus de {company.relanceJours} jours, sans réponse.
          </p>
          <ul className="grid gap-2">
            {aRelancer.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/tableau-de-bord/devis/${d.id}`}
                  className="flex items-center justify-between gap-3 rounded-control bg-white/70 px-3 py-2.5 hover:bg-white"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-semibold">{d.numero}</span>
                    <span className="text-muted"> · {d.client.nom}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatCents(d.totalTtcCents)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Derniers devis */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-lg">Derniers devis</h2>
        <Link href="/tableau-de-bord/devis" className="text-sm text-brand font-semibold">
          Tout voir
        </Link>
      </div>
      {derniers.length === 0 ? (
        <div className="rounded-card border border-dashed border-line bg-card p-6 text-center">
          <p className="text-muted mb-4">Aucun devis pour l’instant.</p>
          <Link href="/tableau-de-bord/devis/nouveau" className={btnPrimaire}>
            Créer mon premier devis
          </Link>
        </div>
      ) : (
        <ul className="grid gap-2">
          {derniers.map((d) => (
            <li key={d.id}>
              <DevisRow devis={d} montrerClient />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Kpi({
  titre,
  valeur,
  detail,
  accent,
}: {
  titre: string;
  valeur: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-card border p-4 ${
        accent ? "border-brand/30 bg-brand-l" : "border-line bg-card"
      }`}
    >
      <div className="text-xs font-semibold text-muted">{titre}</div>
      <div className={`text-xl sm:text-2xl font-bold tabular-nums mt-1 ${accent ? "text-brand-d" : ""}`}>
        {valeur}
      </div>
      <div className="text-[11px] text-muted mt-0.5">{detail}</div>
    </div>
  );
}
