"use client";

import { useActionState, useState } from "react";
import { Bouton, Carte, Champ, Message, Selection } from "@/components/ui";
import { creerArticle, type EtatDevis } from "../devis/actions";

const etatInitial: EtatDevis = {};

/**
 * Taux de TVA proposés dans la liste.
 *
 * Ce sont des valeurs de saisie, PAS une règle d'application : Plombéo ne décide
 * jamais quel taux s'applique à quels travaux. Cette responsabilité appartient à
 * l'artisan et à son expert-comptable (§15, §54).
 */
const TAUX_TVA = [
  { valeur: "2000", libelle: "20 %" },
  { valeur: "1000", libelle: "10 %" },
  { valeur: "550", libelle: "5,5 %" },
  { valeur: "0", libelle: "0 %" },
];

export function FormulaireArticle({ type }: { type: "prestation" | "fourniture" }) {
  const [etat, envoyer, enCours] = useActionState(creerArticle, etatInitial);
  const [ouvert, setOuvert] = useState(false);
  const v = etat.valeurs ?? {};
  const cle = etat.tentative ?? 0;

  if (!ouvert) {
    return (
      <Bouton type="button" variante="discret" onClick={() => setOuvert(true)}>
        + Ajouter {type === "prestation" ? "une prestation" : "une fourniture"}
      </Bouton>
    );
  }

  return (
    <Carte>
      <form key={cle} action={envoyer} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="type" value={type} />

        <Champ
          id={`${type}-libelle`}
          name="libelle"
          libelle="Libellé"
          defaultValue={v["libelle"] ?? ""}
        />
        <Champ
          id={`${type}-description`}
          name="description"
          libelle="Description"
          defaultValue={v["description"] ?? ""}
        />
        {type === "fourniture" && (
          <Champ
            id="reference"
            name="reference"
            libelle="Référence"
            defaultValue={v["reference"] ?? ""}
          />
        )}
        <div className="grid grid-cols-2 gap-3 items-start">
          <Champ
            id={`${type}-prix`}
            name="prix"
            libelle="Prix unitaire HT (€)"
            inputMode="decimal"
            defaultValue={v["prix"] ?? ""}
          />
          <Champ
            id={`${type}-unite`}
            name="unite"
            libelle="Unité"
            aide="u, h, m, ml, kg…"
            defaultValue={v["unite"] ?? "u"}
          />
        </div>
        <Selection
          id={`${type}-tauxTva`}
          name="tauxTva"
          libelle="TVA par défaut"
          defaultValue={v["tauxTva"] ?? "2000"}
          options={TAUX_TVA}
        />
        {type === "prestation" && (
          <Champ
            id="dureeMin"
            name="dureeMin"
            libelle="Durée indicative (minutes)"
            inputMode="numeric"
            defaultValue={v["dureeMin"] ?? "0"}
          />
        )}

        {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
        {etat.succes && <Message ton="succes">{etat.succes}</Message>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Bouton type="submit" disabled={enCours}>
            {enCours ? "Ajout…" : "Ajouter au catalogue"}
          </Bouton>
          <Bouton type="button" variante="discret" onClick={() => setOuvert(false)}>
            Fermer
          </Bouton>
        </div>
      </form>
    </Carte>
  );
}
