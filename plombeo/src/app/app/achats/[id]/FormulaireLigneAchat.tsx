"use client";

import { useActionState, useState } from "react";
import { Bouton, Carte, Champ, Message, Selection } from "@/components/ui";
import { ajouterLigneAchat, type EtatAchat } from "../actions";

const etatInitial: EtatAchat = {};

const TAUX = [
  { valeur: "2000", libelle: "20 %" },
  { valeur: "1000", libelle: "10 %" },
  { valeur: "550", libelle: "5,5 %" },
  { valeur: "0", libelle: "0 %" },
];

type Fourniture = { id: string; libelle: string; unite: string; prixAchatCents: number };

export function FormulaireLigneAchat({
  purchaseId,
  fournitures,
}: {
  purchaseId: string;
  fournitures: Fourniture[];
}) {
  const [etat, envoyer, enCours] = useActionState(ajouterLigneAchat, etatInitial);
  const [ouvert, setOuvert] = useState(false);
  const [choisi, setChoisi] = useState("");
  const cle = etat.tentative ?? 0;

  const fourniture = fournitures.find((f) => f.id === choisi);

  if (!ouvert) {
    return (
      <>
        {etat.succes && <Message ton="succes">{etat.succes}</Message>}
        <Bouton type="button" variante="discret" onClick={() => setOuvert(true)}>
          + Ajouter une ligne
        </Bouton>
      </>
    );
  }

  return (
    <Carte>
      <h3 className="font-semibold mb-3">Nouvelle ligne</h3>
      {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
      {etat.succes && <Message ton="succes">{etat.succes}</Message>}

      <form key={cle} action={envoyer} className="flex flex-col gap-4 mt-3" noValidate>
        <input type="hidden" name="purchaseId" value={purchaseId} />

        {/* Le rattachement au catalogue est ce qui fait remonter le prix d'achat
            et alimente le stock. Sans lui, la ligne reste une simple dépense —
            ce qui est légitime pour un consommable, mais doit être un CHOIX. */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="productId" className="font-semibold text-sm">
            Référence du catalogue
          </label>
          <p className="text-sm text-attenue">
            En la rattachant, le prix d&apos;achat et le stock se mettent à jour tout seuls.
          </p>
          <select
            id="productId"
            name="productId"
            value={choisi}
            onChange={(e) => setChoisi(e.target.value)}
            className="min-h-11 px-3 rounded-controle border border-trait bg-white focus:border-action"
          >
            <option value="">— Ligne libre, sans référence —</option>
            {fournitures.map((f) => (
              <option key={f.id} value={f.id}>
                {f.libelle}
              </option>
            ))}
          </select>
        </div>

        <Champ
          id="ligne-libelle"
          name="libelle"
          libelle="Désignation"
          key={`libelle-${choisi}`}
          defaultValue={fourniture?.libelle ?? ""}
        />
        <Champ id="ligne-quantite" name="quantite" libelle="Quantité" inputMode="decimal" defaultValue="1" />
        <Champ
          id="ligne-unite"
          name="unite"
          libelle="Unité"
          key={`unite-${choisi}`}
          defaultValue={fourniture?.unite ?? "u"}
        />
        <Champ id="ligne-prix" name="prix" libelle="Prix unitaire HT" inputMode="decimal" />
        {/* Le taux est SAISI, jamais déduit : Plombéo ne détermine aucun taux
            applicable (§15, §54). */}
        <Selection id="ligne-tva" name="tauxTva" libelle="TVA" defaultValue="2000" options={TAUX} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Bouton type="submit" disabled={enCours}>
            {enCours ? "Ajout…" : "Ajouter la ligne"}
          </Bouton>
          <Bouton type="button" variante="discret" onClick={() => setOuvert(false)}>
            Fermer
          </Bouton>
        </div>
      </form>
    </Carte>
  );
}
