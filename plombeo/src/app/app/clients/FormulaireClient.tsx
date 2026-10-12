"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Bouton, Carte, Champ, Message, Selection, ZoneTexte } from "@/components/ui";
import { LIBELLE_TYPE_CLIENT, versOptions } from "@/lib/libelles";
import type { EtatCrm } from "./actions";

type ValeursClient = {
  id?: string;
  type: "PARTICULIER" | "PROFESSIONNEL";
  civilite: string;
  prenom: string;
  nom: string;
  raisonSociale: string;
  siret: string;
  tvaIntracommunautaire: string;
  contactNom: string;
  email: string;
  telephone: string;
  telephoneSecondaire: string;
  adresse: string;
  codePostal: string;
  ville: string;
  notes: string;
};

const etatInitial: EtatCrm = {};

export function FormulaireClient({
  action,
  valeurs,
  libelleBouton,
  annulerVers,
}: {
  action: (precedent: EtatCrm, donnees: FormData) => Promise<EtatCrm>;
  valeurs: ValeursClient;
  libelleBouton: string;
  annulerVers: string;
}) {
  const [etat, envoyer, enCours] = useActionState(action, etatInitial);

  /*
   * React 19 réinitialise le formulaire après l'exécution de son action. Sans
   * cette réémission, une simple erreur de validation viderait les dix champs
   * que l'artisan vient de remplir au pouce.
   *
   * L'action renvoie donc la saisie brute, et `tentative` sert de clé de
   * remontage pour que ces nouvelles valeurs par défaut soient réellement
   * appliquées après la réinitialisation.
   */
  const v = { ...valeurs, ...(etat.valeurs ?? {}) } as ValeursClient;
  const cle = etat.tentative ?? 0;

  // Le type pilote l'affichage : montrer à la fois « Prénom/Nom » et « Raison
  // sociale » obligerait l'artisan à trier lui-même des champs sans objet.
  const [type, setType] = useState(valeurs.type);
  const typeCourant = (etat.valeurs?.["type"] as ValeursClient["type"]) ?? type;

  return (
    <Carte>
      <form key={cle} action={envoyer} className="flex flex-col gap-4" noValidate>
        {v.id && <input type="hidden" name="id" value={v.id} />}

        <Selection
          id="type"
          name="type"
          libelle="Type de client"
          defaultValue={typeCourant}
          onChange={(e) => setType(e.target.value as ValeursClient["type"])}
          options={versOptions(LIBELLE_TYPE_CLIENT)}
        />

        {typeCourant === "PARTICULIER" ? (
          <>
            <Champ
              id="prenom"
              name="prenom"
              libelle="Prénom"
              defaultValue={v.prenom}
              autoComplete="given-name"
            />
            <Champ
              id="nom"
              name="nom"
              libelle="Nom"
              defaultValue={v.nom}
              autoComplete="family-name"
            />
          </>
        ) : (
          <>
            <Champ
              id="raisonSociale"
              name="raisonSociale"
              libelle="Raison sociale"
              defaultValue={v.raisonSociale}
              autoComplete="organization"
            />
            <Champ
              id="contactNom"
              name="contactNom"
              libelle="Nom du contact"
              defaultValue={v.contactNom}
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
              id="tvaIntracommunautaire"
              name="tvaIntracommunautaire"
              libelle="N° de TVA intracommunautaire"
              defaultValue={v.tvaIntracommunautaire}
            />
          </>
        )}

        {/* Les champs du type non sélectionné sont conservés en champs cachés :
            sans cela, basculer de type effacerait silencieusement les données
            déjà saisies dans l'autre. */}
        {typeCourant === "PARTICULIER" ? (
          <>
            <input type="hidden" name="raisonSociale" value={v.raisonSociale} />
            <input type="hidden" name="contactNom" value={v.contactNom} />
            <input type="hidden" name="siret" value={v.siret} />
            <input type="hidden" name="tvaIntracommunautaire" value={v.tvaIntracommunautaire} />
          </>
        ) : (
          <>
            <input type="hidden" name="prenom" value={v.prenom} />
            <input type="hidden" name="nom" value={v.nom} />
          </>
        )}
        <input type="hidden" name="civilite" value={v.civilite} />

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
          id="telephoneSecondaire"
          name="telephoneSecondaire"
          libelle="Téléphone secondaire"
          type="tel"
          inputMode="tel"
          defaultValue={v.telephoneSecondaire}
        />
        <Champ
          id="email"
          name="email"
          libelle="E-mail"
          type="email"
          inputMode="email"
          defaultValue={v.email}
        />

        <fieldset className="flex flex-col gap-4 border-t border-trait pt-4">
          <legend className="font-semibold text-sm">Adresse de facturation</legend>
          <Champ
            id="adresse"
            name="adresse"
            libelle="Adresse"
            autoComplete="street-address"
            defaultValue={v.adresse}
          />
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
        </fieldset>

        <ZoneTexte
          id="notes"
          name="notes"
          libelle="Note interne"
          aide="Visible seulement par vous. N'apparaîtra sur aucun document remis au client."
          defaultValue={v.notes}
        />

        {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Bouton type="submit" disabled={enCours}>
            {enCours ? "Enregistrement…" : libelleBouton}
          </Bouton>
          <Link
            href={annulerVers}
            className="inline-flex items-center justify-center min-h-11 px-5 rounded-controle
                       font-semibold bg-white text-encre border border-trait hover:bg-fond"
          >
            Annuler
          </Link>
        </div>
      </form>
    </Carte>
  );
}
