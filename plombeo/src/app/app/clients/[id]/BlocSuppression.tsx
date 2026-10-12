"use client";

import { useActionState, useState } from "react";
import { Bouton, Carte, Champ, Message } from "@/components/ui";
import { supprimerClient, type EtatCrm } from "../actions";

const etatInitial: EtatCrm = {};

/**
 * Suppression définitive.
 *
 * Volontairement pénible : repliée derrière un dépliant, puis confirmée par la
 * saisie exacte du nom du client. La suppression emporte les logements et les
 * équipements en cascade — sur un téléphone, un bouton direct serait à un pouce
 * malheureux de la catastrophe.
 */
export function BlocSuppression({
  clientId,
  nomAffichage,
}: {
  clientId: string;
  nomAffichage: string;
}) {
  const [etat, envoyer, enCours] = useActionState(supprimerClient, etatInitial);
  const [ouvert, setOuvert] = useState(false);

  return (
    <Carte className="border-[#f2c9c6]">
      <h2 className="font-semibold mb-1 text-danger">Supprimer définitivement</h2>
      <p className="text-sm text-attenue mb-3">
        Supprime la fiche, ses logements et son carnet technique. Cette action est
        irréversible. Préférez l&apos;archivage dans presque tous les cas.
      </p>

      {!ouvert ? (
        <Bouton type="button" variante="discret" onClick={() => setOuvert(true)}>
          Je veux supprimer ce client
        </Bouton>
      ) : (
        <form action={envoyer} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={clientId} />
          <Champ
            id="confirmation"
            name="confirmation"
            libelle="Confirmation"
            aide={`Saisissez « ${nomAffichage} » pour confirmer.`}
            autoComplete="off"
          />
          {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Bouton type="submit" disabled={enCours}>
              {enCours ? "Suppression…" : "Supprimer définitivement"}
            </Bouton>
            <Bouton type="button" variante="discret" onClick={() => setOuvert(false)}>
              Annuler
            </Bouton>
          </div>
        </form>
      )}
    </Carte>
  );
}
