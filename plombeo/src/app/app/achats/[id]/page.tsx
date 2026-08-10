import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Bouton, Carte } from "@/components/ui";
import { lireAchat, totauxAchat } from "@/lib/achats";
import { listerFournitures } from "@/lib/devis";
import { sessionCourante } from "@/lib/dal";
import { roleAutorise } from "@/lib/permissions";
import { formaterEuros, formaterTaux } from "@/lib/calcul";
import { formaterQuantite } from "@/lib/format";
import { supprimerLigneAchat, validerAchat } from "../actions";
import { FormulaireLigneAchat } from "./FormulaireLigneAchat";

export const metadata = { title: "Achat — Plombéo" };

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export default async function PageAchat(props: PageProps<"/app/achats/[id]">) {
  const { id } = await props.params;
  const achat = await lireAchat(id);
  if (!achat) notFound();

  const [contexte, fournitures] = await Promise.all([sessionCourante(), listerFournitures()]);
  const peutModifier = contexte ? roleAutorise(contexte.role, "achat:modifier") : false;
  const modifiable = peutModifier && achat.etat === "BROUILLON";
  const totaux = totauxAchat(achat);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-sm text-attenue">
          <Link href="/app/achats" className="underline">
            Achats
          </Link>
        </p>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <h1 className="text-2xl font-bold">{achat.libelle || "Achat"}</h1>
          <Badge ton={achat.etat === "VALIDE" ? "succes" : "neutre"}>
            {achat.etat === "VALIDE" ? "Validé" : "Brouillon"}
          </Badge>
        </div>
        <p className="text-sm text-attenue mt-1">
          {achat.supplier?.nom ?? "Sans fournisseur"} · {formatDate.format(achat.dateAchat)}
          {achat.referenceFournisseur ? ` · Réf. ${achat.referenceFournisseur}` : ""}
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Lignes</h2>
        {achat.lignes.length === 0 ? (
          <p className="text-sm text-attenue">Aucune ligne pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {achat.lignes.map((l) => (
              <li key={l.id}>
                <Carte>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{l.libelle}</p>
                      <p className="text-sm text-attenue">
                        {formaterQuantite(l.quantiteMilli)} {l.unite} ×{" "}
                        {formaterEuros(l.prixUnitaireCents)} · TVA{" "}
                        {formaterTaux(l.tauxTvaCentiemes)}
                      </p>
                      {l.product && (
                        <p className="text-sm text-attenue mt-1">
                          Rattaché à « {l.product.libelle} »
                        </p>
                      )}
                    </div>
                    {modifiable && (
                      <form action={supprimerLigneAchat}>
                        <input type="hidden" name="id" value={l.id} />
                        <Bouton type="submit" variante="discret">
                          Retirer
                        </Bouton>
                      </form>
                    )}
                  </div>
                </Carte>
              </li>
            ))}
          </ul>
        )}
        {modifiable && (
          <FormulaireLigneAchat
            purchaseId={achat.id}
            fournitures={fournitures.map((f) => ({
              id: f.id,
              libelle: f.libelle,
              unite: f.unite,
              prixAchatCents: f.prixAchatCents,
            }))}
          />
        )}
      </section>

      <Carte>
        <h2 className="font-semibold mb-3">Totaux</h2>
        <dl className="text-sm flex flex-col gap-1">
          <div className="flex justify-between">
            <dt>Total HT</dt>
            <dd className="font-medium">{formaterEuros(totaux.totalHtCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>TVA</dt>
            <dd className="font-medium">{formaterEuros(totaux.totalTvaCents)}</dd>
          </div>
          <div className="flex justify-between text-base">
            <dt className="font-semibold">Total TTC</dt>
            <dd className="font-bold">{formaterEuros(totaux.totalTtcCents)}</dd>
          </div>
        </dl>
        <p className="text-sm text-attenue mt-3">
          La TVA est celle qui figure sur le document du fournisseur. Plombéo ne détermine
          pas ce qui est déductible : cela relève de votre expert-comptable.
        </p>
      </Carte>

      {modifiable && achat.lignes.length > 0 && (
        <Carte>
          <h2 className="font-semibold mb-1">Valider cet achat</h2>
          <p className="text-sm text-attenue mb-3">
            La validation fige les totaux, met à jour le dernier prix payé des références
            concernées, et entre en stock celles que vous suivez.
          </p>
          <form action={validerAchat} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={achat.id} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="totalTva" className="font-semibold text-sm">
                Montant de TVA du document
              </label>
              <p className="text-sm text-attenue">
                Laissez vide pour reprendre le total calculé sur les lignes.
              </p>
              <input
                id="totalTva"
                name="totalTva"
                inputMode="decimal"
                className="min-h-11 px-3 rounded-controle border border-trait bg-white focus:border-action"
              />
            </div>
            <Bouton type="submit">Valider l&apos;achat</Bouton>
          </form>
        </Carte>
      )}
    </div>
  );
}
