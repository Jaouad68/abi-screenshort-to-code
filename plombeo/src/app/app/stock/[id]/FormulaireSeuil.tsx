"use client";

import { useActionState } from "react";
import { Bouton, Carte, Champ, Message } from "@/components/ui";
import { definirSeuil, type EtatAchat } from "../../achats/actions";
import { formaterQuantite } from "@/lib/format";

const etatInitial: EtatAchat = {};

export function FormulaireSeuil({
  productId,
  unite,
  seuilMilli,
}: {
  productId: string;
  unite: string;
  seuilMilli: number;
}) {
  const [etat, envoyer, enCours] = useActionState(definirSeuil, etatInitial);

  return (
    <Carte>
      <h2 className="font-semibold mb-1">Seuil d&apos;alerte</h2>
      <p className="text-sm text-attenue mb-3">
        Vous serez prévenu au moment où le stock passe sous ce seuil. Zéro désactive
        l&apos;alerte.
      </p>
      {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
      {etat.succes && <Message ton="succes">{etat.succes}</Message>}

      <form action={envoyer} className="flex flex-col gap-4 mt-3" noValidate>
        <input type="hidden" name="id" value={productId} />
        <Champ
          id="seuil"
          name="seuil"
          libelle={`Seuil (${unite})`}
          inputMode="decimal"
          defaultValue={formaterQuantite(seuilMilli)}
        />
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer le seuil"}
        </Bouton>
      </form>
    </Carte>
  );
}
