"use client";

import { useActionState } from "react";
import { Bouton, Message } from "@/components/ui";
import {
  envoyerDocumentParEmail,
  type EtatAutomatisation,
} from "@/app/app/automatisations/actions";

const etatInitial: EtatAutomatisation = {};

/**
 * Met un document en file d'envoi.
 *
 * Le libellé dit « Envoyer par e-mail », le retour dit « mis en file ». Cette
 * nuance est volontaire : annoncer un envoi effectué alors que le message
 * attend son traitement serait une affirmation fausse (§76).
 */
export function EnvoiEmail({
  type,
  id,
  emailClient,
}: {
  type: "devis" | "facture";
  id: string;
  emailClient: string;
}) {
  const [etat, envoyer, enCours] = useActionState(envoyerDocumentParEmail, etatInitial);

  return (
    <div className="flex flex-col gap-2">
      {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
      {etat.succes && <Message ton="succes">{etat.succes}</Message>}

      <form action={envoyer} className="flex flex-col gap-2">
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="id" value={id} />
        <Bouton type="submit" variante="discret" disabled={enCours}>
          {enCours ? "Mise en file…" : "Envoyer par e-mail"}
        </Bouton>
      </form>

      <p className="text-sm text-attenue">
        {emailClient
          ? `Destinataire : ${emailClient}`
          : "Ce client n'a pas d'adresse e-mail sur sa fiche."}
      </p>
    </div>
  );
}
