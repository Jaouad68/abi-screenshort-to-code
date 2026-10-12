import { notFound } from "next/navigation";
import { lireDevis, dateExpiration, totauxOption } from "@/lib/devis";
import { organisationCourante } from "@/lib/dal";
import { formaterEuros, formaterTaux } from "@/lib/calcul";
import { formaterQuantite } from "@/lib/format";
import { adresseCourte } from "@/lib/libelles";
import { BoutonImprimer } from "./BoutonImprimer";

export const metadata = { title: "Devis à imprimer — Plombéo" };

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

/**
 * Document imprimable.
 *
 * Le PDF est produit par le moteur d'impression du navigateur : aucun service
 * externe, aucune dépendance. Un rendu serveur deviendra nécessaire quand il
 * faudra joindre le document à un e-mail automatique — c'est-à-dire en Phase 6,
 * avec l'adaptateur e-mail. L'anticiper ici ajouterait une dépendance sans usage.
 */
export default async function PageImprimerDevis(
  props: PageProps<"/app/devis/[id]/imprimer">,
) {
  const { id } = await props.params;
  const devis = await lireDevis(id);
  if (!devis) notFound();

  const organisation = await organisationCourante();
  const expiration = dateExpiration(devis.dateDevis, devis.validiteJours);

  return (
    <div className="bg-white text-encre">
      {/* Barre d'action, masquée à l'impression. */}
      <div className="no-print flex flex-wrap gap-2 mb-6">
        <BoutonImprimer />
        <a
          href={`/app/devis/${devis.id}`}
          className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                     font-semibold bg-white text-encre border border-trait hover:bg-fond"
        >
          Retour au devis
        </a>
      </div>

      <article className="max-w-[210mm] mx-auto text-sm">
        <header className="flex justify-between gap-8 mb-8">
          <div>
            <p className="text-lg font-bold">{organisation.nom}</p>
            {organisation.formeJuridique && <p>{organisation.formeJuridique}</p>}
            <p className="whitespace-pre-line">
              {[organisation.adresse, adresseCourte({ codePostal: organisation.codePostal, ville: organisation.ville })]
                .filter(Boolean)
                .join("\n")}
            </p>
            {organisation.telephone && <p>Tél. {organisation.telephone}</p>}
            {organisation.email && <p>{organisation.email}</p>}
            {organisation.siret && <p>SIRET {organisation.siret}</p>}
            {organisation.tvaIntracommunautaire && (
              <p>TVA {organisation.tvaIntracommunautaire}</p>
            )}
            {organisation.assuranceDecennale && <p>{organisation.assuranceDecennale}</p>}
          </div>

          <div className="text-right">
            <h1 className="text-xl font-bold">DEVIS</h1>
            <p className="font-semibold">{devis.numero ?? "(non numéroté)"}</p>
            <p>Le {formatDate.format(devis.dateDevis)}</p>
            <p>Valable jusqu&apos;au {formatDate.format(expiration)}</p>
          </div>
        </header>

        <section className="mb-8">
          <p className="font-semibold">Client</p>
          <p>{devis.client.nomAffichage}</p>
          {adresseCourte(devis.client) && <p>{adresseCourte(devis.client)}</p>}
          {devis.property && (
            <p className="mt-2">
              <span className="font-semibold">Lieu d&apos;intervention : </span>
              {adresseCourte(devis.property)}
            </p>
          )}
        </section>

        {devis.objet && (
          <p className="mb-6">
            <span className="font-semibold">Objet : </span>
            {devis.objet}
          </p>
        )}

        {devis.options.map((option) => {
          const totaux = totauxOption(option);
          return (
            <section key={option.id} className="mb-8 break-inside-avoid">
              {devis.options.length > 1 && (
                <h2 className="font-bold text-base mb-2">{option.libelle}</h2>
              )}

              <table className="w-full border-collapse">
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
                  {option.lignes.map((ligne) => (
                    <tr key={ligne.id} className="border-b border-trait align-top">
                      <td className="py-1 pr-2">
                        {ligne.libelle}
                        {ligne.description && (
                          <span className="block text-attenue">{ligne.description}</span>
                        )}
                      </td>
                      <td className="py-1 px-2 text-right whitespace-nowrap">
                        {formaterQuantite(ligne.quantiteMilli)} {ligne.unite}
                      </td>
                      <td className="py-1 px-2 text-right whitespace-nowrap">
                        {formaterEuros(ligne.prixUnitaireCents)}
                      </td>
                      <td className="py-1 px-2 text-right whitespace-nowrap">
                        {formaterTaux(ligne.tauxTvaCentiemes)}
                      </td>
                      <td className="py-1 pl-2 text-right whitespace-nowrap">
                        {formaterEuros(
                          Math.round((ligne.prixUnitaireCents * ligne.quantiteMilli) / 1000),
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end mt-3">
                <dl className="w-64 flex flex-col gap-1">
                  {totaux.remiseCents > 0 && (
                    <>
                      <LigneTotal libelle="Sous-total HT" valeur={formaterEuros(totaux.baseHtCents)} />
                      <LigneTotal libelle="Remise" valeur={`− ${formaterEuros(totaux.remiseCents)}`} />
                    </>
                  )}
                  <LigneTotal libelle="Total HT" valeur={formaterEuros(totaux.totalHtCents)} />
                  {totaux.tvaParTaux.map((t) => (
                    <LigneTotal
                      key={t.tauxTvaCentiemes}
                      libelle={`TVA ${formaterTaux(t.tauxTvaCentiemes)}`}
                      valeur={formaterEuros(t.montantCents)}
                    />
                  ))}
                  <LigneTotal
                    libelle="Total TTC"
                    valeur={formaterEuros(totaux.totalTtcCents)}
                    fort
                  />
                  {totaux.acompteCents > 0 && (
                    <>
                      <LigneTotal
                        libelle="Acompte à la commande"
                        valeur={formaterEuros(totaux.acompteCents)}
                      />
                      <LigneTotal libelle="Solde" valeur={formaterEuros(totaux.soldeCents)} />
                    </>
                  )}
                </dl>
              </div>
            </section>
          );
        })}

        {devis.conditions && (
          <section className="mb-8 break-inside-avoid">
            <p className="font-semibold">Conditions</p>
            <p className="whitespace-pre-wrap">{devis.conditions}</p>
          </section>
        )}

        <section className="mt-12 break-inside-avoid">
          <p className="font-semibold">Bon pour accord</p>
          <p className="text-attenue">Date et signature du client</p>
          <div className="mt-2 h-24 border border-trait w-72" />
        </section>
      </article>
    </div>
  );
}

function LigneTotal({
  libelle,
  valeur,
  fort,
}: {
  libelle: string;
  valeur: string;
  fort?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-3 ${fort ? "font-bold border-t border-encre pt-1" : ""}`}>
      <dt>{libelle}</dt>
      <dd>{valeur}</dd>
    </div>
  );
}
