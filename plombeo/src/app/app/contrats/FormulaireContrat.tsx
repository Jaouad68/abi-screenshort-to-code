"use client";

import { useActionState, useState } from "react";
import { Bouton, Carte, Champ, Message, Selection, ZoneTexte } from "@/components/ui";
import { creerContrat, type EtatContrat } from "./actions";

const etatInitial: EtatContrat = {};

const PERIODICITES = [
  { valeur: "ANNUELLE", libelle: "Tous les ans" },
  { valeur: "SEMESTRIELLE", libelle: "Tous les six mois" },
  { valeur: "TRIMESTRIELLE", libelle: "Tous les trimestres" },
  { valeur: "MENSUELLE", libelle: "Tous les mois" },
  { valeur: "BIENNALE", libelle: "Tous les deux ans" },
];

export function FormulaireContrat({ clients }: { clients: { id: string; nom: string }[] }) {
  const [etat, envoyer, enCours] = useActionState(creerContrat, etatInitial);
  const [ouvert, setOuvert] = useState(false);
  const cle = etat.tentative ?? 0;

  if (!ouvert) {
    return (
      <>
        {etat.succes && <Message ton="succes">{etat.succes}</Message>}
        <Bouton type="button" variante="discret" onClick={() => setOuvert(true)}>
          + Nouveau contrat
        </Bouton>
      </>
    );
  }

  return (
    <Carte>
      <h2 className="font-semibold mb-3">Nouveau contrat</h2>
      {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
      {etat.succes && <Message ton="succes">{etat.succes}</Message>}

      <form key={cle} action={envoyer} className="flex flex-col gap-4 mt-3" noValidate>
        <Champ id="libelle" name="libelle" libelle="Intitulé" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="clientId" className="font-semibold text-sm">
            Client
          </label>
          <select
            id="clientId"
            name="clientId"
            className="min-h-11 px-3 rounded-controle border border-trait bg-white focus:border-action"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>
        <Selection
          id="periodicite"
          name="periodicite"
          libelle="Périodicité"
          defaultValue="ANNUELLE"
          options={PERIODICITES}
        />
        <Champ id="debutLe" name="debutLe" libelle="Début du contrat" type="date" />
        <Champ
          id="montant"
          name="montant"
          libelle="Montant TTC par visite"
          inputMode="decimal"
          aide="Informatif : Plombéo ne facture jamais tout seul."
        />
        <ZoneTexte id="notes" name="notes" libelle="Notes" />
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
