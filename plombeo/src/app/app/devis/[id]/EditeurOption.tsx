"use client";

import { useActionState, useState } from "react";
import { Badge, Bouton, Carte, Champ, Message, Selection } from "@/components/ui";
import { formaterEuros, formaterTaux, type Totaux } from "@/lib/calcul";
import { formaterQuantite } from "@/lib/format";
import {
  ajouterLigne,
  modifierOption,
  supprimerLigneDevis,
  supprimerVariante,
  type EtatDevis,
} from "../actions";

const etatInitial: EtatDevis = {};

/** Valeurs de saisie, PAS une règle d'application (voir FormulaireArticle). */
const TAUX_TVA = [
  { valeur: "2000", libelle: "20 %" },
  { valeur: "1000", libelle: "10 %" },
  { valeur: "550", libelle: "5,5 %" },
  { valeur: "0", libelle: "0 %" },
];

type LigneAffichee = {
  id: string;
  libelle: string;
  description: string;
  quantiteMilli: number;
  unite: string;
  prixUnitaireCents: number;
  tauxTvaCentiemes: number;
};

type ArticleCatalogue = {
  id: string;
  libelle: string;
  unite: string;
  prixUnitaireCents: number;
  tauxTvaCentiemes: number;
};

export function EditeurOption({
  quoteId,
  option,
  totaux,
  modifiable,
  supprimable,
  principale,
  catalogue,
}: {
  quoteId: string;
  option: {
    id: string;
    libelle: string;
    remisePourMille: number;
    acomptePourMille: number;
    lignes: LigneAffichee[];
  };
  totaux: Totaux;
  modifiable: boolean;
  supprimable: boolean;
  principale: boolean;
  catalogue: { prestations: ArticleCatalogue[]; fournitures: ArticleCatalogue[] };
}) {
  const [etat, envoyer, enCours] = useActionState(ajouterLigne, etatInitial);
  const [ouvert, setOuvert] = useState(false);
  const [prefill, setPrefill] = useState<ArticleCatalogue | null>(null);
  const v = etat.valeurs ?? {};
  const cle = `${etat.tentative ?? 0}-${prefill?.id ?? ""}`;

  const articles = [...catalogue.prestations, ...catalogue.fournitures];

  return (
    <Carte>
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="font-semibold">
          {option.libelle} {principale && <Badge>Proposition principale</Badge>}
        </h2>
        {supprimable && (
          <form action={supprimerVariante}>
            <input type="hidden" name="optionId" value={option.id} />
            <input type="hidden" name="quoteId" value={quoteId} />
            <Bouton type="submit" variante="discret">
              Retirer
            </Bouton>
          </form>
        )}
      </div>

      {option.lignes.length === 0 ? (
        <p className="text-sm text-attenue mb-3">Aucune ligne pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-trait mb-3">
          {option.lignes.map((ligne) => {
            const totalLigne = Math.round((ligne.prixUnitaireCents * ligne.quantiteMilli) / 1000);
            return (
              <li key={ligne.id} className="py-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{ligne.libelle}</p>
                    {ligne.description && (
                      <p className="text-sm text-attenue">{ligne.description}</p>
                    )}
                    <p className="text-sm text-attenue">
                      {formaterQuantite(ligne.quantiteMilli)} {ligne.unite} ×{" "}
                      {formaterEuros(ligne.prixUnitaireCents)} · TVA{" "}
                      {formaterTaux(ligne.tauxTvaCentiemes)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formaterEuros(totalLigne)}</p>
                    {modifiable && (
                      <form action={supprimerLigneDevis} className="mt-1">
                        <input type="hidden" name="id" value={ligne.id} />
                        <input type="hidden" name="quoteId" value={quoteId} />
                        <button
                          type="submit"
                          className="text-sm text-danger underline min-h-11 px-1"
                        >
                          Retirer
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Totaliseur totaux={totaux} />

      {modifiable && (
        <form action={modifierOption} className="flex flex-col gap-3 border-t border-trait pt-3 mt-3">
          <input type="hidden" name="optionId" value={option.id} />
          <Champ
            id={`libelle-${option.id}`}
            name="libelle"
            libelle="Nom de la proposition"
            defaultValue={option.libelle}
          />
          <div className="grid grid-cols-2 gap-3 items-start">
            <Champ
              id={`remise-${option.id}`}
              name="remisePourMille"
              libelle="Remise (‰)"
              aide="100 = 10 %"
              inputMode="numeric"
              defaultValue={String(option.remisePourMille)}
            />
            <Champ
              id={`acompte-${option.id}`}
              name="acomptePourMille"
              libelle="Acompte (‰)"
              aide="300 = 30 %"
              inputMode="numeric"
              defaultValue={String(option.acomptePourMille)}
            />
          </div>
          <Bouton type="submit" variante="discret">
            Appliquer remise et acompte
          </Bouton>
        </form>
      )}

      {modifiable && (
        <div className="border-t border-trait pt-3 mt-3">
          {!ouvert ? (
            <Bouton type="button" variante="discret" onClick={() => setOuvert(true)}>
              + Ajouter une ligne
            </Bouton>
          ) : (
            <form key={cle} action={envoyer} className="flex flex-col gap-3" noValidate>
              <input type="hidden" name="optionId" value={option.id} />
              <input type="hidden" name="origineType" value={prefill ? "catalogue" : ""} />
              <input type="hidden" name="origineId" value={prefill?.id ?? ""} />

              {articles.length > 0 && (
                <Selection
                  id={`catalogue-${option.id}`}
                  libelle="Depuis le catalogue"
                  value={prefill?.id ?? ""}
                  onChange={(e) =>
                    setPrefill(articles.find((a) => a.id === e.target.value) ?? null)
                  }
                  options={[
                    { valeur: "", libelle: "— Saisie libre —" },
                    ...articles.map((a) => ({ valeur: a.id, libelle: a.libelle })),
                  ]}
                />
              )}

              <Champ
                id={`ligne-libelle-${option.id}`}
                name="libelle"
                libelle="Libellé"
                defaultValue={v["libelle"] ?? prefill?.libelle ?? ""}
              />
              <div className="grid grid-cols-2 gap-3 items-start">
                <Champ
                  id={`ligne-quantite-${option.id}`}
                  name="quantite"
                  libelle="Quantité"
                  inputMode="decimal"
                  defaultValue={v["quantite"] ?? "1"}
                />
                <Champ
                  id={`ligne-unite-${option.id}`}
                  name="unite"
                  libelle="Unité"
                  defaultValue={v["unite"] ?? prefill?.unite ?? "u"}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 items-start">
                <Champ
                  id={`ligne-prix-${option.id}`}
                  name="prix"
                  libelle="Prix unitaire HT (€)"
                  inputMode="decimal"
                  defaultValue={
                    v["prix"] ??
                    (prefill ? (prefill.prixUnitaireCents / 100).toFixed(2).replace(".", ",") : "")
                  }
                />
                <Selection
                  id={`ligne-tva-${option.id}`}
                  name="tauxTva"
                  libelle="TVA"
                  defaultValue={v["tauxTva"] ?? String(prefill?.tauxTvaCentiemes ?? 2000)}
                  options={TAUX_TVA}
                />
              </div>

              {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
              {etat.succes && <Message ton="succes">{etat.succes}</Message>}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Bouton type="submit" disabled={enCours}>
                  {enCours ? "Ajout…" : "Ajouter la ligne"}
                </Bouton>
                <Bouton type="button" variante="discret" onClick={() => setOuvert(false)}>
                  Fermer
                </Bouton>
              </div>
            </form>
          )}
        </div>
      )}
    </Carte>
  );
}

function Totaliseur({ totaux }: { totaux: Totaux }) {
  return (
    <dl className="flex flex-col gap-1 text-sm border-t border-trait pt-3">
      {totaux.remiseCents > 0 && (
        <>
          <Ligne libelle="Sous-total HT" valeur={formaterEuros(totaux.baseHtCents)} />
          <Ligne libelle="Remise" valeur={`− ${formaterEuros(totaux.remiseCents)}`} />
        </>
      )}
      <Ligne libelle="Total HT" valeur={formaterEuros(totaux.totalHtCents)} />
      {totaux.tvaParTaux.map((t) => (
        <Ligne
          key={t.tauxTvaCentiemes}
          libelle={`TVA ${formaterTaux(t.tauxTvaCentiemes)}`}
          valeur={formaterEuros(t.montantCents)}
        />
      ))}
      <Ligne libelle="Total TTC" valeur={formaterEuros(totaux.totalTtcCents)} fort />
      {totaux.acompteCents > 0 && (
        <>
          <Ligne libelle="Acompte à la commande" valeur={formaterEuros(totaux.acompteCents)} />
          <Ligne libelle="Solde" valeur={formaterEuros(totaux.soldeCents)} />
        </>
      )}
    </dl>
  );
}

function Ligne({ libelle, valeur, fort }: { libelle: string; valeur: string; fort?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${fort ? "font-bold text-base" : ""}`}>
      <dt className={fort ? "" : "text-attenue"}>{libelle}</dt>
      <dd>{valeur}</dd>
    </div>
  );
}
