import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estTechnicien } from "@/lib/permissions";
import { classerEcheance } from "@/lib/echeance";
import { formatDateCourt } from "@/lib/date";
import { carte, btnPrimaire } from "@/lib/ui";
import { StatutInterventionBadge } from "@/components/StatutBadge";
import { EmptyState } from "@/components/EmptyState";

export default async function TableauDeBordPage() {
  const { user, company } = await requireUser();

  if (estTechnicien(user.role)) {
    const interventions = await prisma.intervention.findMany({
      where: {
        companyId: company.id,
        technicienId: user.id,
        statut: { in: ["PLANIFIEE", "EN_COURS"] },
      },
      include: { client: true },
      orderBy: { datePrevue: "asc" },
      take: 10,
    });

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Bonjour {user.nom.split(" ")[0]}</h1>
          <p className="text-muted">Vos prochaines interventions.</p>
        </div>

        {interventions.length === 0 ? (
          <EmptyState
            titre="Aucune intervention planifiée"
            description="Votre dirigeant ou l'administratif vous en affectera prochainement."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {interventions.map((it) => (
              <li key={it.id}>
                <Link href={`/tableau-de-bord/interventions/${it.id}`} className={`${carte} block hover:border-brand`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">{it.titre}</p>
                      <p className="text-sm text-muted truncate">{it.client.nom}</p>
                    </div>
                    <StatutInterventionBadge statut={it.statut} />
                  </div>
                  <p className="text-sm text-muted mt-2">{formatDateCourt(it.datePrevue)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const [totalContrats, contratsActifs, interventionsAVenir, contratsPourEcheance] = await Promise.all([
    prisma.contrat.count({ where: { companyId: company.id } }),
    prisma.contrat.count({ where: { companyId: company.id, actif: true } }),
    prisma.intervention.findMany({
      where: { companyId: company.id, statut: { in: ["PLANIFIEE", "EN_COURS"] } },
      include: { client: true, technicien: true },
      orderBy: { datePrevue: "asc" },
      take: 5,
    }),
    prisma.contrat.findMany({
      where: { companyId: company.id, actif: true, statut: { not: "RENOUVELE" } },
      select: { dateEcheance: true, statut: true },
    }),
  ]);

  const compteurs = { echu: 0, "30": 0, "60": 0, "90": 0 };
  for (const c of contratsPourEcheance) {
    const f = classerEcheance(c.dateEcheance);
    if (f !== "hors-fenetre") compteurs[f]++;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Tableau de bord</h1>
        <p className="text-muted">Vue d&apos;ensemble de {company.nom}.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={carte}>
          <p className="text-2xl font-bold text-ink tabular-nums">{contratsActifs}</p>
          <p className="text-sm text-muted">Contrats actifs</p>
        </div>
        <div className={carte}>
          <p className="text-2xl font-bold text-ink tabular-nums">{totalContrats}</p>
          <p className="text-sm text-muted">Contrats au total</p>
        </div>
        <Link href="/tableau-de-bord/renouvellements" className={`${carte} hover:border-brand`}>
          <p className="text-2xl font-bold text-danger tabular-nums">{compteurs.echu + compteurs["30"]}</p>
          <p className="text-sm text-muted">À traiter sous 30 j</p>
        </Link>
        <Link href="/tableau-de-bord/interventions" className={`${carte} hover:border-brand`}>
          <p className="text-2xl font-bold text-ink tabular-nums">{interventionsAVenir.length}</p>
          <p className="text-sm text-muted">Interventions à venir</p>
        </Link>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-ink">Renouvellements à traiter</h2>
          <Link href="/tableau-de-bord/renouvellements" className="text-sm font-semibold text-brand">
            Tout voir →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className={carte}>
            <p className="text-xl font-bold text-danger tabular-nums">{compteurs.echu}</p>
            <p className="text-xs text-muted">En retard</p>
          </div>
          <div className={carte}>
            <p className="text-xl font-bold text-ink tabular-nums">{compteurs["30"]}</p>
            <p className="text-xs text-muted">Sous 30 jours</p>
          </div>
          <div className={carte}>
            <p className="text-xl font-bold text-ink tabular-nums">{compteurs["60"] + compteurs["90"]}</p>
            <p className="text-xs text-muted">Sous 60-90 jours</p>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-ink">Prochaines interventions</h2>
          <Link href="/tableau-de-bord/interventions" className="text-sm font-semibold text-brand">
            Tout voir →
          </Link>
        </div>
        {interventionsAVenir.length === 0 ? (
          <EmptyState
            titre="Aucune intervention planifiée"
            description="Planifiez un entretien depuis la fiche d'un contrat ou d'un client."
            actionHref="/tableau-de-bord/interventions/nouvelle"
            actionLabel="Planifier une intervention"
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {interventionsAVenir.map((it) => (
              <li key={it.id}>
                <Link href={`/tableau-de-bord/interventions/${it.id}`} className={`${carte} block hover:border-brand`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">{it.titre} — {it.client.nom}</p>
                      <p className="text-sm text-muted">
                        {formatDateCourt(it.datePrevue)} · {it.technicien?.nom ?? "Non affecté"}
                      </p>
                    </div>
                    <StatutInterventionBadge statut={it.statut} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/tableau-de-bord/clients/import" className={btnPrimaire}>
          Importer des clients (CSV)
        </Link>
        <Link href="/tableau-de-bord/contrats/nouveau" className={btnPrimaire}>
          Nouveau contrat
        </Link>
      </div>
    </div>
  );
}
