import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculerTotaux, montantLigneHtCents, calculerAcompte } from "@/lib/calcul";
import { formatCents, formatQuantite } from "@/lib/money";
import { formatDate } from "@/lib/date";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";

export default async function ImprimerFacturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, company } = await requireUser();
  const { id } = await params;

  const facture = await prisma.facture.findFirst({
    where: { id, userId: user.id },
    include: {
      client: true,
      devis: { select: { numero: true } },
      lignes: { orderBy: { ordre: "asc" } },
    },
  });
  if (!facture) notFound();

  const totaux = calculerTotaux(facture.lignes);
  const acompte =
    facture.acomptePct > 0 ? calculerAcompte(totaux.totalTtcCents, facture.acomptePct) : null;

  return (
    <div>
      <div className="no-print flex items-center justify-between gap-3 mb-5">
        <Link
          href={`/tableau-de-bord/factures/${facture.id}`}
          className="text-sm text-muted hover:text-brand"
        >
          ← Retour à la facture
        </Link>
        <PrintButton className="inline-flex items-center gap-2 rounded-control bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-d min-h-[44px]" />
      </div>

      <article className="mx-auto max-w-[210mm] bg-white text-ink rounded-card border border-line print:border-0 print:rounded-none p-6 sm:p-10 print:p-0 text-[13px] leading-relaxed">
        <header className="flex flex-wrap justify-between gap-6 border-b-2 border-ink pb-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Logo logoDataUrl={company.logoDataUrl} nom={company.nom} size={40} />
              <span className="text-lg font-bold">{company.nom}</span>
            </div>
            <div className="text-muted">
              {company.adresse && <div>{company.adresse}</div>}
              {(company.codePostal || company.ville) && (
                <div>
                  {company.codePostal} {company.ville}
                </div>
              )}
              {company.telephone && <div>Tél. {company.telephone}</div>}
              {company.email && <div>{company.email}</div>}
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold tracking-tight">FACTURE</h1>
            <div className="mt-1 font-semibold">{facture.numero}</div>
            <div className="text-muted mt-2">
              <div>Date : {formatDate(facture.dateFacture)}</div>
              {facture.devis && <div>Réf. devis : {facture.devis.numero}</div>}
            </div>
          </div>
        </header>

        <div className="flex flex-wrap justify-between gap-6 py-5">
          <div className="text-muted text-[12px]">
            {company.siret && <div>SIRET : {company.siret}</div>}
            {company.tvaIntra && <div>TVA intracom. : {company.tvaIntra}</div>}
            {company.assurance && <div>{company.assurance}</div>}
          </div>
          <div className="min-w-[60mm]">
            <div className="text-[11px] font-semibold uppercase text-muted tracking-wide mb-1">
              Facturé à
            </div>
            <div className="font-semibold">{facture.client.nom}</div>
            <div className="text-muted">
              {facture.client.adresse && <div>{facture.client.adresse}</div>}
              {(facture.client.codePostal || facture.client.ville) && (
                <div>
                  {facture.client.codePostal} {facture.client.ville}
                </div>
              )}
            </div>
          </div>
        </div>

        {facture.objet && (
          <p className="mb-3">
            <span className="font-semibold">Objet :</span> {facture.objet}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr
                className="bg-brand text-white"
                style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
              >
                <th className="text-left font-semibold px-2 py-2">Désignation</th>
                <th className="text-right font-semibold px-2 py-2 w-14">Qté</th>
                <th className="text-left font-semibold px-2 py-2 w-14">Unité</th>
                <th className="text-right font-semibold px-2 py-2 w-24">P.U. HT</th>
                <th className="text-right font-semibold px-2 py-2 w-14">TVA</th>
                <th className="text-right font-semibold px-2 py-2 w-28">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {facture.lignes.map((l) => (
                <tr key={l.id} className="border-b border-line align-top">
                  <td className="px-2 py-2">
                    <div className="font-medium">{l.libelle}</div>
                    {l.description && (
                      <div className="text-muted text-[11px]">{l.description}</div>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatQuantite(l.quantiteMilli)}
                  </td>
                  <td className="px-2 py-2">{l.unite}</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatCents(l.prixUnitaireCents)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{l.tauxTva} %</td>
                  <td className="px-2 py-2 text-right tabular-nums font-medium">
                    {formatCents(montantLigneHtCents(l))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-4">
          <dl className="w-full max-w-[80mm] text-[12px]">
            <div className="flex justify-between py-1">
              <dt className="text-muted">Total HT</dt>
              <dd className="tabular-nums font-medium">{formatCents(totaux.totalHtCents)}</dd>
            </div>
            {totaux.ventilationTva.map((v) => (
              <div key={v.taux} className="flex justify-between py-1 text-muted">
                <dt>TVA {v.taux} %</dt>
                <dd className="tabular-nums">{formatCents(v.montantTvaCents)}</dd>
              </div>
            ))}
            <div className="flex justify-between py-2 mt-1 border-t-2 border-ink text-[15px] font-bold">
              <dt>Total TTC</dt>
              <dd className="tabular-nums">{formatCents(totaux.totalTtcCents)}</dd>
            </div>
            {acompte && (
              <>
                <div className="flex justify-between py-1 mt-1 border-t border-line">
                  <dt className="font-semibold">Acompte déjà versé ({facture.acomptePct} %)</dt>
                  <dd className="tabular-nums font-semibold">{formatCents(acompte.acompteCents)}</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="font-semibold">Net à payer</dt>
                  <dd className="tabular-nums font-semibold">{formatCents(acompte.soldeCents)}</dd>
                </div>
              </>
            )}
          </dl>
        </div>

        <div className="mt-8 text-[11px] text-muted">
          {facture.conditions && <p className="mb-2">{facture.conditions}</p>}
          {company.iban && <p className="mb-2">Règlement par virement — IBAN : {company.iban}</p>}
          <p className="mb-2">
            En cas de retard de paiement, application de pénalités au taux légal en vigueur et
            d’une indemnité forfaitaire pour frais de recouvrement de 40 €.
          </p>
          {company.mentionsLegales && <p>{company.mentionsLegales}</p>}
        </div>
      </article>
    </div>
  );
}
