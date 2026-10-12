import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { peutGererActivite } from "@/lib/permissions";
import { formatDateCourt } from "@/lib/date";
import { carte, btnPrimaire, btnSecondaire, btnDanger } from "@/lib/ui";
import { ClientForm } from "../ClientForm";
import { modifierClient, supprimerClient } from "../actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { StatutRenouvellementBadge, StatutInterventionBadge } from "@/components/StatutBadge";
import { EmptyState } from "@/components/EmptyState";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { user, company } = await requireUser();
  const { id } = await params;
  const { erreur } = await searchParams;

  const client = await prisma.client.findFirst({
    where: { id, companyId: company.id },
    include: {
      equipements: { orderBy: { createdAt: "asc" } },
      contrats: { orderBy: { dateEcheance: "asc" } },
      interventions: { orderBy: { datePrevue: "desc" }, take: 5, include: { technicien: true } },
    },
  });
  if (!client) notFound();

  const peutGerer = peutGererActivite(user.role);

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <Link href="/tableau-de-bord/clients" className="text-sm text-muted hover:text-brand">
          ← Clients
        </Link>
        <h1 className="text-2xl font-bold text-ink mt-1">{client.nom}</h1>
        {client.importeLe && (
          <p className="text-xs text-muted mt-1">Importé le {formatDateCourt(client.importeLe)}</p>
        )}
      </div>

      {erreur === "contrats" && (
        <p className="rounded-control bg-danger-l text-danger px-4 py-3 text-sm">
          Impossible de supprimer ce client : il est rattaché à des contrats. Supprimez
          d&apos;abord ses contrats.
        </p>
      )}

      <section className={carte}>
        <h2 className="font-bold text-lg mb-3">Fiche client</h2>
        {peutGerer ? (
          <ClientForm
            action={modifierClient.bind(null, client.id)}
            valeurs={{
              nom: client.nom,
              adresse: client.adresse,
              codePostal: client.codePostal,
              ville: client.ville,
              telephone: client.telephone,
              email: client.email,
              notes: client.notes,
            }}
          />
        ) : (
          <dl className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="sm:col-span-2">
              <dt className="text-muted">Adresse</dt>
              <dd className="font-medium">
                {[client.adresse, client.codePostal, client.ville].filter(Boolean).join(", ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Téléphone</dt>
              <dd className="font-medium">{client.telephone || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">E-mail</dt>
              <dd className="font-medium">{client.email || "—"}</dd>
            </div>
            {client.notes && (
              <div className="sm:col-span-2">
                <dt className="text-muted">Notes</dt>
                <dd className="font-medium whitespace-pre-wrap">{client.notes}</dd>
              </div>
            )}
          </dl>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Équipements ({client.equipements.length})</h2>
          {peutGerer && (
            <Link href={`/tableau-de-bord/clients/${client.id}/equipements/nouveau`} className={btnSecondaire}>
              + Équipement
            </Link>
          )}
        </div>
        {client.equipements.length === 0 ? (
          <p className="text-sm text-muted">Aucun équipement enregistré.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {client.equipements.map((e) => (
              <li key={e.id}>
                <Link href={`/tableau-de-bord/equipements/${e.id}`} className={`${carte} block hover:border-brand`}>
                  <p className="font-semibold text-ink">{e.type || "Équipement"}</p>
                  <p className="text-sm text-muted">
                    {[e.marque, e.modele, e.localisation].filter(Boolean).join(" · ") || "—"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Contrats ({client.contrats.length})</h2>
          {peutGerer && (
            <Link href={`/tableau-de-bord/contrats/nouveau?client=${client.id}`} className={btnPrimaire}>
              + Contrat
            </Link>
          )}
        </div>
        {client.contrats.length === 0 ? (
          <p className="text-sm text-muted">Aucun contrat pour ce client.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {client.contrats.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/tableau-de-bord/contrats/${c.id}`}
                  className={`${carte} flex items-center justify-between gap-3 hover:border-brand`}
                >
                  <div>
                    <p className="font-semibold text-ink">{c.reference} — {c.type}</p>
                    <p className="text-sm text-muted">Échéance {formatDateCourt(c.dateEcheance)}</p>
                  </div>
                  <StatutRenouvellementBadge statut={c.statut} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-bold text-lg mb-3">Historique des interventions</h2>
        {client.interventions.length === 0 ? (
          <EmptyState titre="Aucune intervention" description="Aucune intervention planifiée ou réalisée pour ce client." />
        ) : (
          <ul className="flex flex-col gap-2">
            {client.interventions.map((it) => (
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

      {peutGerer && (
        <section className="border-t border-line pt-6">
          <ConfirmButton
            action={supprimerClient.bind(null, client.id)}
            message={`Supprimer définitivement le client « ${client.nom} » ?`}
            className={btnDanger}
          >
            Supprimer ce client
          </ConfirmButton>
        </section>
      )}
    </div>
  );
}
