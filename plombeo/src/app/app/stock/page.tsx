import Link from "next/link";
import { Badge, Carte, ListeVide } from "@/components/ui";
import { listerStock } from "@/lib/achats";
import { formaterQuantite } from "@/lib/format";
import { formaterEuros } from "@/lib/calcul";

export const metadata = { title: "Stock — Plombéo" };

const TON_ETAT = {
  NEGATIF: "danger",
  SOUS_SEUIL: "alerte",
  NORMAL: "succes",
  NON_SUIVI: "neutre",
} as const;

const LIBELLE_ETAT = {
  NEGATIF: "Négatif",
  SOUS_SEUIL: "À racheter",
  NORMAL: "En stock",
  NON_SUIVI: "Non suivi",
} as const;

export default async function PageStock() {
  const articles = await listerStock();
  const aCorriger = articles.filter((a) => a.etat === "NEGATIF").length;
  const aRacheter = articles.filter((a) => a.etat === "SOUS_SEUIL").length;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Stock</h1>
        <p className="text-sm text-attenue mt-1">
          Seules les références que vous avez choisi de suivre apparaissent ici.
        </p>
      </header>

      {aRacheter > 0 && (
        <Carte>
          <p className="font-semibold">
            {aRacheter} référence{aRacheter > 1 ? "s" : ""} à racheter
          </p>
        </Carte>
      )}

      {aCorriger > 0 && (
        <Carte className="border-dashed">
          <h2 className="font-semibold mb-1">
            {aCorriger} stock{aCorriger > 1 ? "s" : ""} négatif{aCorriger > 1 ? "s" : ""}
          </h2>
          <p className="text-sm text-attenue">
            Une sortie a été enregistrée sans l&apos;entrée correspondante. Ce n&apos;est pas
            bloquant : comptez ce qu&apos;il vous reste et corrigez.
          </p>
        </Carte>
      )}

      {articles.length === 0 ? (
        <ListeVide titre="Aucune référence suivie">
          Le suivi se choisit article par article, depuis le catalogue. Suivre trois
          références utiles vaut mieux qu&apos;un inventaire complet que personne ne tient.
        </ListeVide>
      ) : (
        <ul className="flex flex-col gap-2">
          {articles.map((a) => (
            <li key={a.id}>
              <Link href={`/app/stock/${a.id}`} className="block">
                <Carte>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{a.libelle}</p>
                      {a.reference && (
                        <p className="text-sm text-attenue">Réf. {a.reference}</p>
                      )}
                      <p className="text-sm mt-1">
                        {formaterQuantite(a.quantiteMilli)} {a.unite}
                        {a.seuilAlerteMilli > 0 && (
                          <span className="text-attenue">
                            {" "}· seuil {formaterQuantite(a.seuilAlerteMilli)} {a.unite}
                          </span>
                        )}
                      </p>
                      {/* Un prix d'achat inconnu n'est jamais affiché comme un
                          zéro : ce serait annoncer un article gratuit. */}
                      {a.prixAchatCents > 0 && (
                        <p className="text-sm text-attenue mt-1">
                          Dernier prix payé : {formaterEuros(a.prixAchatCents)}
                        </p>
                      )}
                    </div>
                    <Badge ton={TON_ETAT[a.etat]}>{LIBELLE_ETAT[a.etat]}</Badge>
                  </div>
                </Carte>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
