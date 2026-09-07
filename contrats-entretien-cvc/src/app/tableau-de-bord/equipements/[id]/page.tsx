import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { peutGererActivite } from "@/lib/permissions";
import { toInputDate, formatDateCourt } from "@/lib/date";
import { carte, btnDanger, btnSecondaire } from "@/lib/ui";
import { EquipementForm } from "../EquipementForm";
import { modifierEquipement, supprimerEquipement } from "../actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { StatutRenouvellementBadge } from "@/components/StatutBadge";

export default async function EquipementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { user, company } = await requireUser();
  const { id } = await params;
  const { erreur } = await searchParams;

  const equipement = await prisma.equipement.findFirst({
    where: { id, companyId: company.id },
    include: {
      client: true,
      contrats: { orderBy: { dateEcheance: "asc" } },
    },
  });
  if (!equipement) notFound();

  const peutGerer = peutGererActivite(user.role);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <Link href={`/tableau-de-bord/clients/${equipement.clientId}`} className="text-sm text-muted hover:text-brand">
          ← {equipement.client.nom}
        </Link>
        <h1 className="text-2xl font-bold text-ink mt-1">
          {equipement.type || "Équipement"} {equipement.marque && `— ${equipement.marque}`}
        </h1>
      </div>

      {erreur === "contrats" && (
        <p className="rounded-control bg-danger-l text-danger px-4 py-3 text-sm">
          Impossible de supprimer cet équipement : il est rattaché à des contrats.
        </p>
      )}

      <section className={carte}>
        {peutGerer ? (
          <EquipementForm
            action={modifierEquipement.bind(null, equipement.id)}
            valeurs={{
              type: equipement.type,
              marque: equipement.marque,
              modele: equipement.modele,
              numeroSerie: equipement.numeroSerie,
              localisation: equipement.localisation,
              dateInstallation: equipement.dateInstallation ? toInputDate(equipement.dateInstallation) : "",
              notes: equipement.notes,
            }}
          />
        ) : (
          <dl className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">Marque / Modèle</dt>
              <dd className="font-medium">{[equipement.marque, equipement.modele].filter(Boolean).join(" / ") || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">N° de série</dt>
              <dd className="font-medium">{equipement.numeroSerie || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Localisation</dt>
              <dd className="font-medium">{equipement.localisation || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Installation</dt>
              <dd className="font-medium">
                {equipement.dateInstallation ? formatDateCourt(equipement.dateInstallation) : "—"}
              </dd>
            </div>
            {equipement.notes && (
              <div className="sm:col-span-2">
                <dt className="text-muted">Notes</dt>
                <dd className="font-medium whitespace-pre-wrap">{equipement.notes}</dd>
              </div>
            )}
          </dl>
        )}
      </section>

      <section>
        <h2 className="font-bold text-ink mb-3">Contrats liés ({equipement.contrats.length})</h2>
        {equipement.contrats.length === 0 ? (
          <p className="text-sm text-muted">Aucun contrat rattaché à cet équipement.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {equipement.contrats.map((c) => (
              <li key={c.id}>
                <Link href={`/tableau-de-bord/contrats/${c.id}`} className={`${carte} flex items-center justify-between gap-3 hover:border-brand`}>
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

      {peutGerer && (
        <section className="border-t border-line pt-5 flex gap-3">
          <Link href={`/tableau-de-bord/contrats/nouveau?equipement=${equipement.id}&client=${equipement.clientId}`} className={btnSecondaire}>
            Nouveau contrat pour cet équipement
          </Link>
          <ConfirmButton
            action={supprimerEquipement.bind(null, equipement.id)}
            message="Supprimer définitivement cet équipement ?"
            className={btnDanger}
          >
            Supprimer
          </ConfirmButton>
        </section>
      )}
    </div>
  );
}
