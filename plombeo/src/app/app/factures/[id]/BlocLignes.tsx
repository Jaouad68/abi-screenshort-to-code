"use client";

import { useActionState, useState } from "react";
import { Bouton, Carte, Champ, Message, Selection } from "@/components/ui";
import { formaterEuros, formaterTaux } from "@/lib/calcul";
import { formaterQuantite } from "@/lib/format";
import { ajouterLigneFacture, type EtatFacture } from "../actions";

const etatInitial: EtatFacture = {};

const TAUX_TVA = [
  { valeur: "2000", libelle: "20 %" },
  { valeur: "1000", libelle: "10 %" },
  { valeur: "550", libelle: "5,5 %" },
  { valeur: "0", libelle: "0 %" },
];

type Ligne = {
  id: string;
  libelle: string;
  quantiteMilli: number;
  unite: string;
  prixUnitaireCents: number;
  tauxTvaCentiemes: number;
};

export function BlocLignes({
  invoiceId,
  modifiable,
  lignes,
  supprimerLigne,
}: {
  invoiceId: string;
  modifiable: boolean;
  lignes: Ligne[];
  supprimerLigne: (donnees: FormData) => Promise<void>;
}) {
  const [etat, envoyer, enCours] = useActionState(ajouterLigneFacture, etatInitial);
  const [ouvert, setOuvert] = useState(false);
  const v = etat.valeurs ?? {};
  const cle = etat.tentative ?? 0;

  return (
    <Carte>
      <h2 className="font-semibold mb-3">Détail</h2>

      {lignes.length === 0 ? (
        <p className="text-sm text-attenue mb-3">Aucune ligne.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-trait mb-3">
          {lignes.map((l) => (
            <li key={l.id} className="py-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{l.libelle}</p>
                <p className="text-sm text-attenue">
                  {formaterQuantite(l.quantiteMilli)} {l.unite} ×{" "}
                  {formaterEuros(l.prixUnitaireCents)} · TVA {formaterTaux(l.tauxTvaCentiemes)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">
                  {formaterEuros(Math.round((l.prixUnitaireCents * l.quantiteMilli) / 1000))}
                </p>
                {modifiable && (
                  <form action={supprimerLigne} className="mt-1">
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="invoiceId" value={invoiceId} />
                    <button type="submit" className="text-sm text-danger underline min-h-11 px-1">
                      Retirer
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {modifiable &&
        (!ouvert ? (
          <Bouton type="button" variante="discret" onClick={() => setOuvert(true)}>
            + Ajouter une ligne
          </Bouton>
        ) : (
          <form key={cle} action={envoyer} className="flex flex-col gap-3 border-t border-trait pt-3" noValidate>
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <Champ id="fl-libelle" name="libelle" libelle="Libellé" defaultValue={v["libelle"] ?? ""} />
            <div className="grid grid-cols-2 gap-3 items-start">
              <Champ id="fl-quantite" name="quantite" libelle="Quantité" inputMode="decimal" defaultValue={v["quantite"] ?? "1"} />
              <Champ id="fl-unite" name="unite" libelle="Unité" defaultValue={v["unite"] ?? "u"} />
            </div>
            <div className="grid grid-cols-2 gap-3 items-start">
              <Champ id="fl-prix" name="prix" libelle="Prix unitaire HT (€)" inputMode="decimal" defaultValue={v["prix"] ?? ""} />
              <Selection id="fl-tva" name="tauxTva" libelle="TVA" defaultValue={v["tauxTva"] ?? "2000"} options={TAUX_TVA} />
            </div>

            {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
            {etat.succes && <Message ton="succes">{etat.succes}</Message>}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Bouton type="submit" disabled={enCours}>{enCours ? "Ajout…" : "Ajouter"}</Bouton>
              <Bouton type="button" variante="discret" onClick={() => setOuvert(false)}>Fermer</Bouton>
            </div>
          </form>
        ))}
    </Carte>
  );
}
