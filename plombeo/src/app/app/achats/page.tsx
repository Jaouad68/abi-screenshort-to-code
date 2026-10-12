import Link from "next/link";
import { Badge, Bouton, Carte, ListeVide } from "@/components/ui";
import { listerAchats, listerFournisseurs, totauxAchat } from "@/lib/achats";
import { formaterEuros } from "@/lib/calcul";
import { sessionCourante } from "@/lib/dal";
import { roleAutorise } from "@/lib/permissions";
import { creerAchat } from "./actions";

export const metadata = { title: "Achats — Plombéo" };

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" });

export default async function PageAchats() {
  const [achats, fournisseurs, contexte] = await Promise.all([
    listerAchats(),
    listerFournisseurs(),
    sessionCourante(),
  ]);
  const peutModifier = contexte ? roleAutorise(contexte.role, "achat:modifier") : false;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Achats</h1>
          <p className="text-sm text-attenue mt-1">
            Vos factures fournisseurs, et ce qu&apos;elles vous coûtent réellement.
          </p>
        </div>
        <Link
          href="/app/achats/fournisseurs"
          className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                     font-semibold bg-white text-encre border border-trait hover:bg-fond"
        >
          Fournisseurs
        </Link>
      </header>

      {peutModifier && (
        <Carte>
          <h2 className="font-semibold mb-3">Saisir un achat</h2>
          <form action={creerAchat} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="supplierId" className="font-semibold text-sm">
                Fournisseur
              </label>
              <select
                id="supplierId"
                name="supplierId"
                className="min-h-11 px-3 rounded-controle border border-trait bg-white focus:border-action"
              >
                <option value="">— Sans fournisseur —</option>
                {fournisseurs.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="libelle" className="font-semibold text-sm">
                Libellé
              </label>
              <input
                id="libelle"
                name="libelle"
                className="min-h-11 px-3 rounded-controle border border-trait bg-white focus:border-action"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="referenceFournisseur" className="font-semibold text-sm">
                Référence de la facture
              </label>
              {/* Référence DU FOURNISSEUR : Plombéo ne numérote pas un document
                  qu'il n'a pas émis. */}
              <p className="text-sm text-attenue">
                Le numéro qui figure sur le document reçu.
              </p>
              <input
                id="referenceFournisseur"
                name="referenceFournisseur"
                className="min-h-11 px-3 rounded-controle border border-trait bg-white focus:border-action"
              />
            </div>
            <Bouton type="submit">Créer l&apos;achat</Bouton>
          </form>
        </Carte>
      )}

      {achats.length === 0 ? (
        <ListeVide titre="Aucun achat enregistré">
          Saisir vos factures fournisseurs permet de connaître votre marge réelle.
        </ListeVide>
      ) : (
        <ul className="flex flex-col gap-2">
          {achats.map((a) => {
            const totaux = totauxAchat(a);
            return (
              <li key={a.id}>
                <Link href={`/app/achats/${a.id}`} className="block">
                  <Carte>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {a.libelle || a.referenceFournisseur || "Achat"}
                        </p>
                        <p className="text-sm text-attenue">
                          {a.supplier?.nom ?? "Sans fournisseur"} ·{" "}
                          {formatDate.format(a.dateAchat)}
                        </p>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="font-semibold">{formaterEuros(totaux.totalTtcCents)}</p>
                        <Badge ton={a.etat === "VALIDE" ? "succes" : "neutre"}>
                          {a.etat === "VALIDE" ? "Validé" : "Brouillon"}
                        </Badge>
                      </div>
                    </div>
                  </Carte>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
