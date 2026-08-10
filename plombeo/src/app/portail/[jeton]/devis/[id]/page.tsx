import Link from "next/link";
import { notFound } from "next/navigation";
import { devisDetail, enteteClient, resoudreJeton } from "@/lib/portail";
import { formaterEuros, formaterTaux } from "@/lib/calcul";
import { formaterQuantite } from "@/lib/format";
import { BoutonAccepter } from "./BoutonAccepter";

export const metadata = { title: "Votre devis — Plombéo" };

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export default async function PageDevisPortail(
  props: PageProps<"/portail/[jeton]/devis/[id]">,
) {
  const { jeton, id } = await props.params;

  const acces = await resoudreJeton(jeton);
  if (!acces) notFound();

  const [entete, devis] = await Promise.all([enteteClient(acces), devisDetail(acces, id)]);
  // `devisDetail` filtre sur le client ET l'organisation : un identifiant deviné
  // se comporte exactement comme un identifiant inexistant.
  if (!entete || !devis) notFound();

  const acceptable = devis.statut === "ENVOYE" || devis.statut === "PRET";

  return (
    <div className="min-h-dvh bg-fond">
      <header className="bg-encre text-white">
        <div className="mx-auto w-full max-w-2xl px-5 py-4">
          <p className="font-bold text-lg">{entete.entreprise.nom}</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-5 py-6 flex flex-col gap-5">
        <p className="text-sm">
          <Link href={`/portail/${jeton}`} className="underline">
            Retour à vos documents
          </Link>
        </p>

        <div>
          <h1 className="text-2xl font-bold">Devis {devis.numero}</h1>
          <p className="text-sm text-attenue mt-1">{formatDate.format(devis.date)}</p>
          {devis.objet && <p className="mt-2">{devis.objet}</p>}
        </div>

        <section className="bg-papier border border-trait rounded-carte p-5">
          <h2 className="font-semibold mb-3">Détail</h2>
          <ul className="flex flex-col gap-3">
            {devis.lignes.map((l, i) => (
              <li key={i} className="flex justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{l.libelle}</p>
                  <p className="text-attenue">
                    {formaterQuantite(l.quantiteMilli)} {l.unite} ×{" "}
                    {formaterEuros(l.prixUnitaireCents)} · TVA {formaterTaux(l.tauxTvaCentiemes)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <dl className="text-sm flex flex-col gap-1 mt-4 pt-4 border-t border-trait">
            <div className="flex justify-between">
              <dt>Total HT</dt>
              <dd className="font-medium">{formaterEuros(devis.totalHtCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>TVA</dt>
              <dd className="font-medium">{formaterEuros(devis.totalTvaCents)}</dd>
            </div>
            <div className="flex justify-between text-base">
              <dt className="font-semibold">Total TTC</dt>
              <dd className="font-bold">{formaterEuros(devis.totalTtcCents)}</dd>
            </div>
          </dl>
        </section>

        {devis.conditions && (
          <section className="bg-papier border border-trait rounded-carte p-5">
            <h2 className="font-semibold mb-2">Conditions</h2>
            <p className="text-sm whitespace-pre-wrap">{devis.conditions}</p>
          </section>
        )}

        {devis.statut === "ACCEPTE" ? (
          <p className="text-sm font-medium text-succes bg-[#e8f4ed] border border-[#bcdcc9] rounded-controle px-3 py-2">
            Vous avez accepté ce devis.
          </p>
        ) : acceptable ? (
          <BoutonAccepter jeton={jeton} devisId={devis.id} />
        ) : (
          <p className="text-sm text-attenue">
            Ce devis n&apos;est plus acceptable en ligne. Contactez {entete.entreprise.nom}.
          </p>
        )}
      </main>
    </div>
  );
}
