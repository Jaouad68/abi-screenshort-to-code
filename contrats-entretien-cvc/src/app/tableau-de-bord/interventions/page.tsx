import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { peutGererActivite } from "@/lib/permissions";
import { formatDateHeure } from "@/lib/date";
import { champ, btnPrimaire, btnSecondaire, carte } from "@/lib/ui";
import { StatutInterventionBadge } from "@/components/StatutBadge";
import { EmptyState } from "@/components/EmptyState";
import type { StatutIntervention } from "@/generated/prisma/client";

export default async function InterventionsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; technicien?: string }>;
}) {
  const { user, company } = await requireUser();
  const { statut = "", technicien = "" } = await searchParams;
  const peutGerer = peutGererActivite(user.role);

  const techniciens = peutGerer
    ? await prisma.user.findMany({
        where: { companyId: company.id, role: "TECHNICIEN" },
        select: { id: true, nom: true },
        orderBy: { nom: "asc" },
      })
    : [];

  const where = {
    companyId: company.id,
    ...(statut ? { statut: statut as StatutIntervention } : {}),
    ...(peutGerer ? (technicien ? { technicienId: technicien } : {}) : { technicienId: user.id }),
  };

  const interventions = await prisma.intervention.findMany({
    where,
    include: { client: true, technicien: true },
    orderBy: { datePrevue: "asc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Interventions</h1>
        {peutGerer && (
          <Link href="/tableau-de-bord/interventions/nouvelle" className={btnPrimaire}>
            Planifier
          </Link>
        )}
      </div>

      <form className="flex flex-wrap gap-2">
        <select name="statut" defaultValue={statut} className={champ + " w-auto"}>
          <option value="">Tous les statuts</option>
          <option value="PLANIFIEE">Planifiée</option>
          <option value="EN_COURS">En cours</option>
          <option value="TERMINEE">Terminée</option>
          <option value="ANNULEE">Annulée</option>
        </select>
        {peutGerer && (
          <select name="technicien" defaultValue={technicien} className={champ + " w-auto"}>
            <option value="">Tous les techniciens</option>
            {techniciens.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom}
              </option>
            ))}
          </select>
        )}
        <button type="submit" className={btnSecondaire}>
          Filtrer
        </button>
      </form>

      {interventions.length === 0 ? (
        <EmptyState
          titre="Aucune intervention"
          description={peutGerer ? "Planifiez votre première intervention." : "Rien de planifié pour vous pour le moment."}
          actionHref={peutGerer ? "/tableau-de-bord/interventions/nouvelle" : undefined}
          actionLabel="Planifier"
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {interventions.map((it) => (
            <li key={it.id}>
              <Link href={`/tableau-de-bord/interventions/${it.id}`} className={`${carte} block hover:border-brand`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">
                      {it.titre} — {it.client.nom}
                    </p>
                    <p className="text-sm text-muted truncate">
                      {formatDateHeure(it.datePrevue)} · {it.technicien?.nom ?? "Non affecté"}
                    </p>
                  </div>
                  <StatutInterventionBadge statut={it.statut} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
