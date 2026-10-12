"use client";

import { useActionState } from "react";
import { Bouton, Carte, Champ, Message } from "@/components/ui";
import { definirCoutHoraire, type EtatPilotage } from "./actions";
import { formaterEuros } from "@/lib/calcul";

const etatInitial: EtatPilotage = {};

/**
 * Le coût horaire est SAISI, jamais déduit.
 *
 * Il intègre charges, congés, temps non facturable et amortissements — dont
 * Plombéo ne sait rien. Une valeur par défaut produirait une rentabilité
 * crédible et fausse.
 */
export function FormulaireCoutHoraire({ coutHoraireCents }: { coutHoraireCents: number }) {
  const [etat, envoyer, enCours] = useActionState(definirCoutHoraire, etatInitial);
  const renseigne = coutHoraireCents > 0;

  return (
    <Carte className={renseigne ? "" : "border-dashed"}>
      <h2 className="font-semibold mb-1">Votre coût horaire</h2>
      <p className="text-sm text-attenue mb-3">
        {renseigne
          ? `Actuellement ${formaterEuros(coutHoraireCents)} de l'heure.`
          : "Sans lui, la rentabilité de vos chantiers n'est pas calculée : elle n'aurait aucun sens."}
      </p>
      <p className="text-sm text-attenue mb-3">
        Ce montant vous appartient : il dépend de vos charges, de vos congés et de votre
        temps non facturable. Plombéo ne le devine pas.
      </p>

      {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
      {etat.succes && <Message ton="succes">{etat.succes}</Message>}

      <form action={envoyer} className="flex flex-col gap-4 mt-3" noValidate>
        <Champ
          id="coutHoraire"
          name="coutHoraire"
          libelle="Coût horaire"
          inputMode="decimal"
          defaultValue={renseigne ? (coutHoraireCents / 100).toFixed(2).replace(".", ",") : ""}
        />
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </Bouton>
      </form>
    </Carte>
  );
}
