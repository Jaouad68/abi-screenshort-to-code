"use client";

import { useActionState } from "react";
import { Bouton, Message } from "@/components/ui";
import { retirerMembre, type EtatEquipe } from "./actions";

const etatInitial: EtatEquipe = {};

/**
 * Retrait d'un membre.
 *
 * Le refus du dernier propriétaire est affiché, jamais avalé : un bouton qui ne
 * fait rien sans rien dire laisse croire à une panne.
 */
export function BoutonRetrait({ membershipId, nom }: { membershipId: string; nom: string }) {
  const [etat, action] = useActionState(retirerMembre, etatInitial);

  return (
    <div className="mt-2">
      <form action={action}>
        <input type="hidden" name="id" value={membershipId} />
        <Bouton type="submit" variante="discret">
          Retirer {nom} de l&apos;équipe
        </Bouton>
      </form>
      {etat.erreur && (
        <div className="mt-2">
          <Message ton="erreur">{etat.erreur}</Message>
        </div>
      )}
    </div>
  );
}
