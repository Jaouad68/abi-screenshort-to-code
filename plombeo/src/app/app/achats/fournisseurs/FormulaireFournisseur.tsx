"use client";

import { useActionState } from "react";
import { Bouton, Carte, Champ, Message, ZoneTexte } from "@/components/ui";
import { enregistrerFournisseur, type EtatAchat } from "../actions";

const etatInitial: EtatAchat = {};

export function FormulaireFournisseur({
  fournisseur,
}: {
  fournisseur?: {
    id: string;
    nom: string;
    contact: string;
    email: string;
    telephone: string;
    adresse: string;
    codePostal: string;
    ville: string;
    numeroCompte: string;
    notes: string;
  };
}) {
  const [etat, envoyer, enCours] = useActionState(enregistrerFournisseur, etatInitial);
  // React 19 vide le formulaire après l'action : sans réémission des valeurs,
  // une erreur de validation effacerait toute la saisie.
  const v = etat.valeurs ?? {};
  const cle = etat.tentative ?? 0;

  const defaut = (champ: keyof NonNullable<typeof fournisseur>) =>
    v[champ] ?? fournisseur?.[champ] ?? "";

  return (
    <Carte>
      {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
      {etat.succes && <Message ton="succes">{etat.succes}</Message>}

      <form key={cle} action={envoyer} className="flex flex-col gap-4 mt-3" noValidate>
        {fournisseur && <input type="hidden" name="id" value={fournisseur.id} />}
        <Champ id="nom" name="nom" libelle="Nom" defaultValue={defaut("nom")} />
        <Champ id="contact" name="contact" libelle="Contact" defaultValue={defaut("contact")} />
        <Champ id="telephone" name="telephone" libelle="Téléphone" defaultValue={defaut("telephone")} />
        <Champ id="email" name="email" libelle="E-mail" defaultValue={defaut("email")} />
        <Champ id="numeroCompte" name="numeroCompte" libelle="Numéro de compte" defaultValue={defaut("numeroCompte")} />
        <Champ id="adresse" name="adresse" libelle="Adresse" defaultValue={defaut("adresse")} />
        <Champ id="codePostal" name="codePostal" libelle="Code postal" defaultValue={defaut("codePostal")} />
        <Champ id="ville" name="ville" libelle="Ville" defaultValue={defaut("ville")} />
        <ZoneTexte id="notes" name="notes" libelle="Notes" defaultValue={defaut("notes")} />
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </Bouton>
      </form>
    </Carte>
  );
}
