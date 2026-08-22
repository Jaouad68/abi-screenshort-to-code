"use client";

import { useActionState, useState } from "react";
import { Bouton, Carte, Champ, Message, Selection } from "@/components/ui";
import { enregistrerMouvement, type EtatAchat } from "../../achats/actions";

const etatInitial: EtatAchat = {};

const TYPES = [
  { valeur: "SORTIE_CHANTIER", libelle: "Sortie pour un chantier" },
  { valeur: "ENTREE_ACHAT", libelle: "Entrée (achat, réappro)" },
  { valeur: "RETOUR", libelle: "Retour au stock" },
  { valeur: "PERTE", libelle: "Perte ou casse" },
];

/**
 * Le SIGNE vient du type choisi, jamais de la saisie : demander à l'artisan de
 * taper « -3 » serait une source d'erreur permanente.
 */
export function FormulaireMouvement({ productId, unite }: { productId: string; unite: string }) {
  const [etat, envoyer, enCours] = useActionState(enregistrerMouvement, etatInitial);
  const [ouvert, setOuvert] = useState(false);
  const cle = etat.tentative ?? 0;

  if (!ouvert) {
    return (
      <>
        {etat.succes && <Message ton="succes">{etat.succes}</Message>}
        <Bouton type="button" variante="discret" onClick={() => setOuvert(true)}>
          + Enregistrer un mouvement
        </Bouton>
      </>
    );
  }

  return (
    <Carte>
      <h2 className="font-semibold mb-3">Mouvement de stock</h2>
      {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
      {etat.succes && <Message ton="succes">{etat.succes}</Message>}

      <form key={cle} action={envoyer} className="flex flex-col gap-4 mt-3" noValidate>
        <input type="hidden" name="productId" value={productId} />
        <Selection id="type" name="type" libelle="Nature" defaultValue="SORTIE_CHANTIER" options={TYPES} />
        <Champ
          id="quantite"
          name="quantite"
          libelle={`Quantité (${unite})`}
          inputMode="decimal"
          aide="Toujours un nombre positif : la nature ci-dessus décide du sens."
        />
        <Champ id="motif" name="motif" libelle="Motif (facultatif)" />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Bouton type="submit" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </Bouton>
          <Bouton type="button" variante="discret" onClick={() => setOuvert(false)}>
            Fermer
          </Bouton>
        </div>
      </form>
    </Carte>
  );
}
