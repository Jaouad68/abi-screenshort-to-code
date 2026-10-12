"use client";

import { useActionState } from "react";
import { Bouton, Carte, Champ, Message } from "@/components/ui";
import { mettreAJourOrganisation, type EtatFormulaire } from "../actions";

type Organisation = {
  nom: string;
  formeJuridique: string;
  siret: string;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  email: string;
};

const etatInitial: EtatFormulaire = {};

export function FormulaireEntreprise({ organisation }: { organisation: Organisation }) {
  const [etat, action, enCours] = useActionState(mettreAJourOrganisation, etatInitial);

  // Voir EtatFormulaire : React 19 réinitialise le formulaire après l'action.
  const v = { ...organisation, ...(etat.valeurs ?? {}) } as Organisation;
  const cle = etat.tentative ?? 0;

  return (
    <Carte>
      <form key={cle} action={action} className="flex flex-col gap-4" noValidate>
        <Champ
          id="nom"
          name="nom"
          libelle="Nom commercial"
          defaultValue={v.nom}
          required
        />
        <Champ
          id="formeJuridique"
          name="formeJuridique"
          libelle="Forme juridique"
          aide="Par exemple : entreprise individuelle, SASU, EURL."
          defaultValue={v.formeJuridique}
        />
        <Champ
          id="siret"
          name="siret"
          libelle="SIRET"
          aide="14 chiffres."
          inputMode="numeric"
          defaultValue={v.siret}
        />
        <Champ
          id="adresse"
          name="adresse"
          libelle="Adresse"
          autoComplete="street-address"
          defaultValue={v.adresse}
        />
        {/* 9rem : en dessous, « Code postal » passe sur deux lignes sur un
            écran de 390 px de large. */}
        <div className="grid grid-cols-[minmax(0,9rem)_1fr] gap-3 items-start">
          <Champ
            id="codePostal"
            name="codePostal"
            libelle="Code postal"
            inputMode="numeric"
            autoComplete="postal-code"
            defaultValue={v.codePostal}
          />
          <Champ
            id="ville"
            name="ville"
            libelle="Ville"
            autoComplete="address-level2"
            defaultValue={v.ville}
          />
        </div>
        <Champ
          id="telephone"
          name="telephone"
          libelle="Téléphone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={v.telephone}
        />
        <Champ
          id="email"
          name="email"
          libelle="E-mail de contact"
          type="email"
          inputMode="email"
          defaultValue={v.email}
        />

        {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
        {etat.succes && <Message ton="succes">{etat.succes}</Message>}

        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </Bouton>

        <p className="text-xs text-attenue">
          Les mentions légales obligatoires sur les devis et factures (TVA, assurance)
          seront ajoutées avec le module de facturation, à partir des sources officielles.
        </p>
      </form>
    </Carte>
  );
}
