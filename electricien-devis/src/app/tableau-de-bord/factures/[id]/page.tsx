import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  marquerPayee,
  marquerEmise,
  annulerFacture,
  supprimerFacture,
} from "../actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/date";
import { calculerAcompte } from "@/lib/calcul";
import { FACTURE_STATUT_LABEL, FACTURE_STATUT_CLASSES } from "@/lib/statut";
import { btnPrimaire, btnSecondaire, btnDanger } from "@/lib/ui";

export default async function FactureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireUser();
  const { id } = await params;

  const facture = await prisma.facture.findFirst({
    where: { id, userId: user.id },
    include: {
      client: { select: { id: true, nom: true } },
      devis: { select: { id: true, numero: true } },
    },
  });
  if (!facture) notFound();

  const acompte =
    facture.acomptePct > 0
      ? calculerAcompte(facture.totalTtcCents, facture.acomptePct)
      : null;

  return (
    <div>
      <Link href="/tableau-de-bord/factures" className="text-sm text-muted hover:text-brand">
        ← Factures
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mt-2 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{facture.numero}</h1>
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${FACTURE_STATUT_CLASSES[facture.statut]}`}
            >
              {FACTURE_STATUT_LABEL[facture.statut]}
            </span>
          </div>
          <Link
            href={`/tableau-de-bord/clients/${facture.client.id}`}
            className="text-muted hover:text-brand"
          >
            {facture.client.nom}
          </Link>
        </div>
        <Link
          href={`/tableau-de-bord/factures/${facture.id}/imprimer`}
          target="_blank"
          className="inline-flex items-center gap-2 rounded-control bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-d min-h-[44px]"
        >
          Aperçu / PDF
        </Link>
      </div>

      <div className="rounded-card border border-line bg-card p-5 mb-6">
        <dl className="grid gap-2 text-sm">
          <Row libelle="Date">{formatDate(facture.dateFacture)}</Row>
          {facture.objet && <Row libelle="Objet">{facture.objet}</Row>}
          {facture.devis && (
            <Row libelle="Devis d'origine">
              <Link
                href={`/tableau-de-bord/devis/${facture.devis.id}`}
                className="text-brand hover:underline"
              >
                {facture.devis.numero}
              </Link>
            </Row>
          )}
          <Row libelle="Total HT">{formatCents(facture.totalHtCents)}</Row>
          <Row libelle="TVA">{formatCents(facture.totalTvaCents)}</Row>
          <Row libelle="Total TTC">
            <span className="font-bold text-brand">{formatCents(facture.totalTtcCents)}</span>
          </Row>
          {acompte && (
            <>
              <Row libelle={`Acompte (${facture.acomptePct} %)`}>
                {formatCents(acompte.acompteCents)}
              </Row>
              <Row libelle="Solde">{formatCents(acompte.soldeCents)}</Row>
            </>
          )}
          {facture.datePaiement && (
            <Row libelle="Payée le">{formatDate(facture.datePaiement)}</Row>
          )}
        </dl>
      </div>

      {/* Actions de statut */}
      <div className="flex flex-wrap gap-2 mb-8">
        {facture.statut === "EMISE" && (
          <>
            <form action={marquerPayee.bind(null, facture.id)}>
              <button type="submit" className={btnPrimaire}>
                Marquer payée
              </button>
            </form>
            <form action={annulerFacture.bind(null, facture.id)}>
              <button type="submit" className={btnSecondaire}>
                Annuler
              </button>
            </form>
          </>
        )}
        {facture.statut !== "EMISE" && (
          <form action={marquerEmise.bind(null, facture.id)}>
            <button type="submit" className={btnSecondaire}>
              Repasser en « Émise »
            </button>
          </form>
        )}
      </div>

      <section className="border-t border-line pt-6">
        <ConfirmButton
          action={supprimerFacture.bind(null, facture.id)}
          message={`Supprimer définitivement la facture ${facture.numero} ?`}
          className={btnDanger}
        >
          Supprimer cette facture
        </ConfirmButton>
      </section>
    </div>
  );
}

function Row({ libelle, children }: { libelle: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{libelle}</dt>
      <dd className="tabular-nums text-right">{children}</dd>
    </div>
  );
}
