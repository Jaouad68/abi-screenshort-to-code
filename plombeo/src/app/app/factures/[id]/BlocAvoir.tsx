"use client";

import { useActionState, useState } from "react";
import { Bouton, Carte, Champ, Message } from "@/components/ui";
import { formaterEuros } from "@/lib/calcul";
import { creerAvoir, type EtatFacture } from "../actions";

const etatInitial: EtatFacture = {};

/**
 * Avoir : la SEULE façon de corriger une facture émise (§14).
 *
 * Replié par défaut, comme la suppression d'un client : c'est une pièce
 * comptable qu'on émet, pas un bouton qu'on effleure.
 */
export function BlocAvoir({ invoiceId, duCents }: { invoiceId: string; duCents: number }) {
  const [etat, envoyer, enCours] = useActionState(creerAvoir, etatInitial);
  const [ouvert, setOuvert] = useState(false);
  const v = etat.valeurs ?? {};
  const cle = etat.tentative ?? 0;

  return (
    <Carte className="border-dashed">
      <h2 className="font-semibold mb-1">Corriger cette facture</h2>
      <p className="text-sm text-attenue mb-3">
        Une facture émise ne se modifie pas. Pour la corriger — totalement ou en partie —
        émettez un avoir. La facture d&apos;origine reste intacte, comme le veut la
        traçabilité comptable.
      </p>

      {!ouvert ? (
        <Bouton type="button" variante="discret" onClick={() => setOuvert(true)}>
          Émettre un avoir
        </Bouton>
      ) : (
        <form key={cle} action={envoyer} className="flex flex-col gap-3" noValidate>
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <Champ
            id="montantAvoir"
            name="montant"
            libelle="Montant de l'avoir (€ TTC)"
            aide={`Au maximum ${formaterEuros(duCents)}.`}
            inputMode="decimal"
            defaultValue={v["montant"] ?? ""}
          />
          <Champ id="motif" name="motif" libelle="Motif" defaultValue={v["motif"] ?? ""} />

          {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
          {etat.succes && <Message ton="succes">{etat.succes}</Message>}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Bouton type="submit" disabled={enCours}>{enCours ? "Émission…" : "Émettre l'avoir"}</Bouton>
            <Bouton type="button" variante="discret" onClick={() => setOuvert(false)}>Annuler</Bouton>
          </div>
        </form>
      )}
    </Carte>
  );
}
