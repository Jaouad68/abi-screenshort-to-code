import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { peutGererActivite } from "@/lib/permissions";
import { formatDateCourt, formatDateHeure, toInputDate } from "@/lib/date";
import { formatCents, centsToEurosInput } from "@/lib/money";
import { PERIODICITE_LABEL } from "@/lib/echeance";
import { carte, btnSecondaire, btnDanger } from "@/lib/ui";
import { ContratForm } from "../ContratForm";
import { modifierContrat, supprimerContrat } from "../actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { StatutRenouvellementBadge, StatutInterventionBadge } from "@/components/StatutBadge";
import { StatutActions } from "../../renouvellements/StatutActions";

export default async function ContratDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { user, company } = await requireUser();
  const { id } = await params;
  const { erreur } = await searchParams;

  const contrat = await prisma.contrat.findFirst({
    where: { id, companyId: company.id },
    include: {
      client: true,
      equipement: true,
      historique: { orderBy: { createdAt: "desc" }, include: { creePar: true } },
      interventions: { orderBy: { datePrevue: "desc" }, include: { technicien: true } },
    },
  });
  if (!contrat) notFound();

  const peutGerer = peutGererActivite(user.role);

  const [clients, equipements] = peutGerer
    ? await Promise.all([
        prisma.client.findMany({ where: { companyId: company.id }, orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
        prisma.equipement.findMany({
          where: { companyId: company.id },
          select: { id: true, clientId: true, type: true, marque: true },
        }),
      ])
    : [[], []];

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <Link href="/tableau-de-bord/contrats" className="text-sm text-muted hover:text-brand">
          ← Contrats
        </Link>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <h1 className="text-2xl font-bold text-ink">{contrat.reference}</h1>
          <StatutRenouvellementBadge statut={contrat.statut} />
          {!contrat.actif && (
            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-line text-muted">
              Inactif
            </span>
          )}
        </div>
        <p className="text-muted">
          <Link href={`/tableau-de-bord/clients/${contrat.clientId}`} className="hover:text-brand font-medium">
            {contrat.client.nom}
          </Link>
          {contrat.equipement && (
            <>
              {" · "}
              <Link href={`/tableau-de-bord/equipements/${contrat.equipement.id}`} className="hover:text-brand">
                {contrat.equipement.type || "Équipement"}
              </Link>
            </>
          )}
        </p>
      </div>

      {erreur === "interventions" && (
        <p className="rounded-control bg-danger-l text-danger px-4 py-3 text-sm">
          Impossible de supprimer ce contrat : des interventions y sont rattachées.
        </p>
      )}

      {peutGerer && (
        <section className={carte}>
          <h2 className="font-bold text-lg mb-3">Suivi du renouvellement</h2>
          <StatutActions
            contratId={contrat.id}
            statutActuel={contrat.statut}
            dateEcheance={contrat.dateEcheance}
            periodicite={contrat.periodicite}
          />
        </section>
      )}

      <section className={carte}>
        <h2 className="font-bold text-lg mb-3">Détails du contrat</h2>
        {peutGerer ? (
          <ContratForm
            // Le renouvellement (StatutActions, plus haut) modifie ce contrat
            // depuis un composant voisin sans démonter celui-ci : la clé,
            // dérivée de updatedAt, force un remontage pour que les champs
            // (non contrôlés) reflètent bien les nouvelles dates après coup.
            key={contrat.updatedAt.toISOString()}
            action={modifierContrat.bind(null, contrat.id)}
            clients={clients}
            equipements={equipements.map((e) => ({
              id: e.id,
              clientId: e.clientId,
              label: [e.type, e.marque].filter(Boolean).join(" — ") || "Équipement",
            }))}
            valeurs={{
              clientId: contrat.clientId,
              equipementId: contrat.equipementId ?? "",
              type: contrat.type,
              periodicite: contrat.periodicite,
              montant: centsToEurosInput(contrat.montantCents),
              dateDebut: toInputDate(contrat.dateDebut),
              dateEcheance: toInputDate(contrat.dateEcheance),
              notes: contrat.notes,
            }}
          />
        ) : (
          <dl className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">Type</dt>
              <dd className="font-medium">{contrat.type}</dd>
            </div>
            <div>
              <dt className="text-muted">Périodicité</dt>
              <dd className="font-medium">{PERIODICITE_LABEL[contrat.periodicite]}</dd>
            </div>
            <div>
              <dt className="text-muted">Montant</dt>
              <dd className="font-medium">{formatCents(contrat.montantCents)}</dd>
            </div>
            <div>
              <dt className="text-muted">Échéance</dt>
              <dd className="font-medium">{formatDateCourt(contrat.dateEcheance)}</dd>
            </div>
          </dl>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Interventions ({contrat.interventions.length})</h2>
          {peutGerer && (
            <Link
              href={`/tableau-de-bord/interventions/nouvelle?contrat=${contrat.id}&client=${contrat.clientId}`}
              className={btnSecondaire}
            >
              + Planifier
            </Link>
          )}
        </div>
        {contrat.interventions.length === 0 ? (
          <p className="text-sm text-muted">Aucune intervention planifiée pour ce contrat.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {contrat.interventions.map((it) => (
              <li key={it.id}>
                <Link
                  href={`/tableau-de-bord/interventions/${it.id}`}
                  className={`${carte} flex items-center justify-between gap-3 hover:border-brand`}
                >
                  <div>
                    <p className="font-semibold text-ink">{it.titre}</p>
                    <p className="text-sm text-muted">
                      {formatDateCourt(it.datePrevue)} · {it.technicien?.nom ?? "Non affecté"}
                    </p>
                  </div>
                  <StatutInterventionBadge statut={it.statut} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-bold text-lg mb-3">Historique du suivi</h2>
        {contrat.historique.length === 0 ? (
          <p className="text-sm text-muted">Aucun changement de statut enregistré.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {contrat.historique.map((h) => (
              <li key={h.id} className={`${carte} text-sm`}>
                <div className="flex items-center justify-between gap-3">
                  <StatutRenouvellementBadge statut={h.statut} />
                  <span className="text-muted text-xs">{formatDateHeure(h.createdAt)}</span>
                </div>
                {h.commentaire && <p className="mt-1.5 text-ink-2">{h.commentaire}</p>}
                {h.creePar && <p className="mt-1 text-xs text-muted">par {h.creePar.nom}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {peutGerer && (
        <section className="border-t border-line pt-6">
          <ConfirmButton
            action={supprimerContrat.bind(null, contrat.id)}
            message={`Supprimer définitivement le contrat ${contrat.reference} ?`}
            className={btnDanger}
          >
            Supprimer ce contrat
          </ConfirmButton>
        </section>
      )}
    </div>
  );
}
