"use client";

import { useActionState, useState } from "react";
import { Bouton, Carte, Champ, Message } from "@/components/ui";
import { corrigerStock, type EtatAchat } from "../../achats/actions";

const etatInitial: EtatAchat = {};

export function FormulaireComptage({ productId, unite }: { productId: string; unite: string }) {
  const [etat, envoyer, enCours] = useActionState(corrigerStock, etatInitial);
  const [ouvert, setOuvert] = useState(false);
  const cle = etat.tentative ?? 0;

  if (!ouvert) {
    return (
      <>
        {etat.succes && <Message ton="succes">{etat.succes}</Message>}
        <Bouton type="button" variante="discret" onClick={() => setOuvert(true)}>
          Corriger après comptage
        </Bouton>
      </>
    );
  }

  return (
    <Carte>
      <h2 className="font-semibold mb-1">Corriger après comptage</h2>
      <p className="text-sm text-attenue mb-3">
        Indiquez ce que vous avez réellement compté. L&apos;écart est enregistré comme un
        mouvement daté : l&apos;historique n&apos;est jamais réécrit.
      </p>
      {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
      {etat.succes && <Message ton="succes">{etat.succes}</Message>}

      <form key={cle} action={envoyer} className="flex flex-col gap-4 mt-3" noValidate>
        <input type="hidden" name="productId" value={productId} />
        <Champ id="compte" name="compte" libelle={`Quantité comptée (${unite})`} inputMode="decimal" />
        <Champ id="motif-comptage" name="motif" libelle="Note (facultatif)" />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Bouton type="submit" disabled={enCours}>
            {enCours ? "Correction…" : "Corriger"}
          </Bouton>
          <Bouton type="button" variante="discret" onClick={() => setOuvert(false)}>
            Fermer
          </Bouton>
        </div>
      </form>
    </Carte>
  );
}
