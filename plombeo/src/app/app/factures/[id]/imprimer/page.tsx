import { notFound } from "next/navigation";
import { calculerSolde, lireFacture, totalTtc, totauxFacture } from "@/lib/facturation";
import { organisationCourante } from "@/lib/dal";
import { formaterEuros, formaterTaux } from "@/lib/calcul";
import { formaterQuantite } from "@/lib/format";
import { adresseCourte } from "@/lib/libelles";
import { BoutonImprimer } from "../../../devis/[id]/imprimer/BoutonImprimer";

export const metadata = { title: "Facture à imprimer — Plombéo" };

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export default async function PageImprimerFacture(
  props: PageProps<"/app/factures/[id]/imprimer">,
) {
  const { id } = await props.params;
  const facture = await lireFacture(id);
  if (!facture) notFound();

  const organisation = await organisationCourante();
  const totaux = totauxFacture(facture);
  const solde = calculerSolde(totalTtc(facture), facture.paiements, facture.avoirs);

  return (
    <div className="bg-white text-encre">
      <div className="no-print flex flex-wrap gap-2 mb-6">
        <BoutonImprimer />
        <a
          href={`/app/factures/${facture.id}`}
          className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                     font-semibold bg-white text-encre border border-trait hover:bg-fond"
        >
          Retour à la facture
        </a>
      </div>

      <article className="max-w-[210mm] mx-auto text-sm">
        <header className="flex justify-between gap-8 mb-8">
          <div>
            <p className="text-lg font-bold">{organisation.nom}</p>
            {organisation.formeJuridique && <p>{organisation.formeJuridique}</p>}
            {organisation.adresse && <p>{organisation.adresse}</p>}
            <p>{adresseCourte({ codePostal: organisation.codePostal, ville: organisation.ville })}</p>
            {organisation.telephone && <p>Tél. {organisation.telephone}</p>}
            {organisation.email && <p>{organisation.email}</p>}
            {organisation.siret && <p>SIRET {organisation.siret}</p>}
            {organisation.tvaIntracommunautaire && <p>TVA {organisation.tvaIntracommunautaire}</p>}
            {organisation.assuranceDecennale && <p>{organisation.assuranceDecennale}</p>}
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold">
              {facture.type === "ACOMPTE" ? "FACTURE D'ACOMPTE" : "FACTURE"}
            </h1>
            <p className="font-semibold">{facture.numero ?? "(non émise)"}</p>
            <p>Le {formatDate.format(facture.dateFacture)}</p>
            {facture.dateEcheance && (
              <p>Échéance : {formatDate.format(facture.dateEcheance)}</p>
            )}
          </div>
        </header>

        <section className="mb-8">
          <p className="font-semibold">Client</p>
          <p>{facture.client.nomAffichage}</p>
          {adresseCourte(facture.client) && <p>{adresseCourte(facture.client)}</p>}
          {facture.property && (
            <p className="mt-2">
              <span className="font-semibold">Lieu d&apos;intervention : </span>
              {adresseCourte(facture.property)}
            </p>
          )}
        </section>

        {facture.objet && (
          <p className="mb-6">
            <span className="font-semibold">Objet : </span>
            {facture.objet}
          </p>
        )}

        <table className="w-full border-collapse mb-4">
          <thead>
            <tr className="border-b-2 border-encre text-left">
              <th className="py-1 pr-2">Désignation</th>
              <th className="py-1 px-2 text-right">Qté</th>
              <th className="py-1 px-2 text-right">P.U. HT</th>
              <th className="py-1 px-2 text-right">TVA</th>
              <th className="py-1 pl-2 text-right">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {facture.lignes.map((l) => (
              <tr key={l.id} className="border-b border-trait align-top">
                <td className="py-1 pr-2">
                  {l.libelle}
                  {l.description && <span className="block text-attenue">{l.description}</span>}
                </td>
                <td className="py-1 px-2 text-right whitespace-nowrap">
                  {formaterQuantite(l.quantiteMilli)} {l.unite}
                </td>
                <td className="py-1 px-2 text-right whitespace-nowrap">
                  {formaterEuros(l.prixUnitaireCents)}
                </td>
                <td className="py-1 px-2 text-right whitespace-nowrap">
                  {formaterTaux(l.tauxTvaCentiemes)}
                </td>
                <td className="py-1 pl-2 text-right whitespace-nowrap">
                  {formaterEuros(Math.round((l.prixUnitaireCents * l.quantiteMilli) / 1000))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <dl className="w-72 flex flex-col gap-1">
            <L libelle="Total HT" valeur={formaterEuros(totaux.totalHtCents)} />
            {totaux.tvaParTaux.map((t) => (
              <L
                key={t.tauxTvaCentiemes}
                libelle={`TVA ${formaterTaux(t.tauxTvaCentiemes)}`}
                valeur={formaterEuros(t.montantCents)}
              />
            ))}
            <L libelle="Total TTC" valeur={formaterEuros(totaux.totalTtcCents)} fort />
            {solde.avoirsCents > 0 && (
              <>
                <L libelle="Avoirs" valeur={`− ${formaterEuros(solde.avoirsCents)}`} />
                <L libelle="Montant dû" valeur={formaterEuros(solde.duCents)} />
              </>
            )}
            {solde.paiementsCents > 0 && (
              <>
                <L libelle="Déjà réglé" valeur={formaterEuros(solde.paiementsCents)} />
                <L libelle="Reste à payer" valeur={formaterEuros(Math.max(0, solde.resteCents))} fort />
              </>
            )}
          </dl>
        </div>

        {facture.conditions && (
          <section className="mt-8 break-inside-avoid">
            <p className="font-semibold">Conditions</p>
            <p className="whitespace-pre-wrap">{facture.conditions}</p>
          </section>
        )}
      </article>
    </div>
  );
}

function L({ libelle, valeur, fort }: { libelle: string; valeur: string; fort?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${fort ? "font-bold border-t border-encre pt-1" : ""}`}>
      <dt>{libelle}</dt>
      <dd>{valeur}</dd>
    </div>
  );
}
