import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { peutGererActivite } from "@/lib/permissions";
import { formatDate, formatDateHeure } from "@/lib/date";
import { PrintButton } from "@/components/PrintButton";
import { StatutInterventionBadge } from "@/components/StatutBadge";

export default async function CompteRenduPage({ params }: { params: Promise<{ id: string }> }) {
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
  if (!peutGerer && intervention.technicienId !== user.id) {
    redirect("/tableau-de-bord/interventions");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-0">
      <div className="no-print flex items-center justify-between gap-3 mb-6 pt-4">
        <Link href={`/tableau-de-bord/interventions/${intervention.id}`} className="text-sm text-muted hover:text-brand">
          ← Retour à l&apos;intervention
        </Link>
        <PrintButton className="inline-flex items-center justify-center gap-2 rounded-control bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-d min-h-[44px]" />
      </div>

      <article className="bg-white text-ink p-6 sm:p-10 rounded-card border border-line print:border-0 print:rounded-none print:p-0">
        <header className="flex items-start justify-between gap-4 border-b border-line pb-5 mb-6">
          <div>
            <p className="text-lg font-bold">{company.nom}</p>
            <p className="text-sm text-muted">Compte rendu d&apos;intervention</p>
            <p className="font-semibold mt-1">{intervention.titre}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{formatDate(intervention.datePrevue)}</p>
            <StatutInterventionBadge statut={intervention.statut} />
          </div>
        </header>

        <section className="grid sm:grid-cols-2 gap-5 mb-6 text-sm">
          <div>
            <p className="text-muted mb-0.5">Client</p>
            <p className="font-semibold">{intervention.client.nom}</p>
            <p>{[intervention.client.adresse, intervention.client.codePostal, intervention.client.ville].filter(Boolean).join(", ")}</p>
            {intervention.client.telephone && <p>{intervention.client.telephone}</p>}
          </div>
          <div>
            <p className="text-muted mb-0.5">Équipement</p>
            <p className="font-semibold">{intervention.equipement?.type || "—"}</p>
            <p>
              {[intervention.equipement?.marque, intervention.equipement?.modele].filter(Boolean).join(" ")}
            </p>
            {intervention.equipement?.numeroSerie && <p>N° série : {intervention.equipement.numeroSerie}</p>}
          </div>
          <div>
            <p className="text-muted mb-0.5">Contrat</p>
            <p className="font-semibold">{intervention.contrat?.reference ?? "—"}</p>
            <p>{intervention.contrat?.type}</p>
          </div>
          <div>
            <p className="text-muted mb-0.5">Intervenant</p>
            <p className="font-semibold">{intervention.technicien?.nom ?? "Non affecté"}</p>
            <p>{formatDateHeure(intervention.datePrevue)}</p>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="font-bold mb-2">Checklist d&apos;entretien</h2>
          {intervention.checklist.length === 0 ? (
            <p className="text-sm text-muted">Aucun point de contrôle enregistré.</p>
          ) : (
            <ul className="text-sm flex flex-col gap-1.5">
              {intervention.checklist.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <span aria-hidden>{item.fait ? "☑" : "☐"}</span>
                  <span>{item.libelle}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-6">
          <h2 className="font-bold mb-2">Observations</h2>
          <p className="text-sm whitespace-pre-wrap">
            {intervention.commentaires || "Aucune observation particulière."}
          </p>
        </section>

        {intervention.photos.length > 0 && (
          <section className="mb-6 break-inside-avoid">
            <h2 className="font-bold mb-2">Photos</h2>
            <div className="grid grid-cols-3 gap-2">
              {intervention.photos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.dataUrl} alt={p.legende || "Photo d'intervention"} className="w-full aspect-square object-cover rounded-control border border-line" />
              ))}
            </div>
          </section>
        )}

        <footer className="border-t border-line pt-5 mt-8 grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-muted mb-8">Signature du technicien</p>
            <p className="border-t border-line pt-1">{intervention.technicien?.nom ?? ""}</p>
          </div>
          <div>
            <p className="text-muted mb-8">Signature du client</p>
            <p className="border-t border-line pt-1">&nbsp;</p>
          </div>
        </footer>
      </article>
    </div>
  );
}
