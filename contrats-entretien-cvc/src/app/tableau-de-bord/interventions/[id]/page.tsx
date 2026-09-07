import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { peutGererActivite } from "@/lib/permissions";
import { formatDateHeure } from "@/lib/date";
import { carte, btnSecondaire, btnDanger } from "@/lib/ui";
import { StatutInterventionBadge } from "@/components/StatutBadge";
import { ConfirmButton } from "@/components/ConfirmButton";
import { supprimerIntervention } from "../actions";
import { ChecklistPanel } from "./ChecklistPanel";
import { CommentairesPanel } from "./CommentairesPanel";
import { PhotoUpload } from "./PhotoUpload";
import { StatutSwitcher } from "./StatutSwitcher";
import { PlanificationForm } from "./PlanificationForm";

export default async function InterventionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, company } = await requireUser();
  const { id } = await params;

  const intervention = await prisma.intervention.findFirst({
    where: { id, companyId: company.id },
    include: {
      client: true,
      equipement: true,
      contrat: true,
      technicien: true,
      checklist: { orderBy: { ordre: "asc" } },
      photos: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!intervention) notFound();

  const peutGerer = peutGererActivite(user.role);
  const estAffecte = intervention.technicienId === user.id;
  if (!peutGerer && !estAffecte) {
    redirect("/tableau-de-bord/interventions");
  }
  const peutSuivre = peutGerer || estAffecte;

  const techniciens = peutGerer
    ? await prisma.user.findMany({
        where: { companyId: company.id, role: "TECHNICIEN", actif: true },
        select: { id: true, nom: true },
        orderBy: { nom: "asc" },
      })
    : [];

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <Link href="/tableau-de-bord/interventions" className="text-sm text-muted hover:text-brand">
          ← Interventions
        </Link>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <h1 className="text-2xl font-bold text-ink">{intervention.titre}</h1>
          <StatutInterventionBadge statut={intervention.statut} />
        </div>
        <p className="text-muted">
          <Link href={`/tableau-de-bord/clients/${intervention.clientId}`} className="hover:text-brand font-medium">
            {intervention.client.nom}
          </Link>
          {intervention.equipement && <> · {intervention.equipement.type}</>}
          {intervention.contrat && (
            <>
              {" · "}
              <Link href={`/tableau-de-bord/contrats/${intervention.contrat.id}`} className="hover:text-brand">
                {intervention.contrat.reference}
              </Link>
            </>
          )}
        </p>
        <p className="text-sm text-muted mt-1">
          {formatDateHeure(intervention.datePrevue)} · {intervention.technicien?.nom ?? "Non affecté"}
        </p>
      </div>

      <section className={carte}>
        <h2 className="font-bold text-lg mb-3">Statut</h2>
        {peutSuivre ? (
          <StatutSwitcher interventionId={intervention.id} statut={intervention.statut} />
        ) : (
          <StatutInterventionBadge statut={intervention.statut} />
        )}
      </section>

      <section className={carte}>
        <h2 className="font-bold text-lg mb-3">Checklist d&apos;entretien</h2>
        <ChecklistPanel
          interventionId={intervention.id}
          items={intervention.checklist}
          editable={peutSuivre}
        />
      </section>

      <section className={carte}>
        <h2 className="font-bold text-lg mb-3">Commentaires du technicien</h2>
        <CommentairesPanel
          interventionId={intervention.id}
          commentaires={intervention.commentaires}
          editable={peutSuivre}
        />
      </section>

      <section className={carte}>
        <h2 className="font-bold text-lg mb-3">Photos</h2>
        <PhotoUpload interventionId={intervention.id} photos={intervention.photos} editable={peutSuivre} />
      </section>

      <section className="flex flex-wrap gap-3">
        <Link href={`/tableau-de-bord/interventions/${intervention.id}/compte-rendu`} className={btnSecondaire}>
          Générer le compte rendu (PDF)
        </Link>
      </section>

      {peutGerer && (
        <section className={carte}>
          <h2 className="font-bold text-lg mb-3">Planification</h2>
          <PlanificationForm
            interventionId={intervention.id}
            titre={intervention.titre}
            datePrevue={intervention.datePrevue}
            technicienId={intervention.technicienId ?? ""}
            techniciens={techniciens}
          />
        </section>
      )}

      {peutGerer && (
        <section className="border-t border-line pt-6">
          <ConfirmButton
            action={supprimerIntervention.bind(null, intervention.id)}
            message="Supprimer définitivement cette intervention ?"
            className={btnDanger}
          >
            Supprimer cette intervention
          </ConfirmButton>
        </section>
      )}
    </div>
  );
}
