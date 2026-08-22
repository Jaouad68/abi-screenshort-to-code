"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Bouton, Carte, Champ, Message, Selection, ZoneTexte } from "@/components/ui";
import { LIBELLE_TYPE_LOGEMENT, versOptions } from "@/lib/libelles";
import type { EtatCrm } from "./actions";

export type ValeursLogement = {
  id?: string;
  clientId?: string;
  libelle: string;
  type: "MAISON" | "APPARTEMENT" | "LOCAL_COMMERCIAL" | "IMMEUBLE" | "AUTRE";
  adresse: string;
  complement: string;
  codePostal: string;
  ville: string;
  etage: string;
  digicode: string;
  interphone: string;
  instructionsAcces: string;
  anneeConstruction: string;
  notes: string;
};

const etatInitial: EtatCrm = {};

export function FormulaireLogement({
  action,
  valeurs,
  libelleBouton,
  annulerVers,
}: {
  action: (precedent: EtatCrm, donnees: FormData) => Promise<EtatCrm>;
  valeurs: ValeursLogement;
  libelleBouton: string;
  annulerVers: string;
}) {
  const [etat, envoyer, enCours] = useActionState(action, etatInitial);

  // React 19 réinitialise le formulaire après l'action : sans réémission de la
  // saisie, une erreur de validation viderait tout (voir FormulaireClient).
  const v = { ...valeurs, ...(etat.valeurs ?? {}) } as ValeursLogement;
  const cle = etat.tentative ?? 0;

  return (
    <Carte>
      <form key={cle} action={envoyer} className="flex flex-col gap-4" noValidate>
        {v.id && <input type="hidden" name="id" value={v.id} />}
        {v.clientId && <input type="hidden" name="clientId" value={v.clientId} />}

        <Champ
          id="libelle"
          name="libelle"
          libelle="Nom du logement"
          aide="Facultatif. Par exemple : « Maison principale », « Appartement locatif »."
          defaultValue={v.libelle}
        />
        <Selection
          id="type"
          name="type"
          libelle="Type"
          defaultValue={v.type}
          options={versOptions(LIBELLE_TYPE_LOGEMENT)}
        />

        <fieldset className="flex flex-col gap-4 border-t border-trait pt-4">
          <legend className="font-semibold text-sm">Adresse</legend>
          <Champ
            id="adresse"
            name="adresse"
            libelle="Adresse"
            autoComplete="street-address"
            defaultValue={v.adresse}
          />
          <Champ
            id="complement"
            name="complement"
            libelle="Complément"
            aide="Bâtiment, résidence, lieu-dit…"
            defaultValue={v.complement}
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

        {/* Ces champs valent de l'or sur le terrain : ils évitent de rester
            bloqué devant une porte, un interphone muet ou un parking fermé. */}
        <fieldset className="flex flex-col gap-4 border-t border-trait pt-4">
          <legend className="font-semibold text-sm">Accès</legend>
          <div className="grid grid-cols-2 gap-3 items-start">
            <Champ id="etage" name="etage" libelle="Étage" defaultValue={v.etage} />
            <Champ id="digicode" name="digicode" libelle="Digicode" defaultValue={v.digicode} />
          </div>
          <Champ
            id="interphone"
            name="interphone"
            libelle="Interphone"
            aide="Nom à appeler s'il diffère de celui du client."
            defaultValue={v.interphone}
          />
          <ZoneTexte
            id="instructionsAcces"
            name="instructionsAcces"
            libelle="Instructions d'accès"
            aide="Stationnement, accès à la cave, chien, horaires du gardien…"
            defaultValue={v.instructionsAcces}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4 border-t border-trait pt-4">
          <legend className="font-semibold text-sm">Informations techniques</legend>
          <Champ
            id="anneeConstruction"
            name="anneeConstruction"
            libelle="Année de construction"
            inputMode="numeric"
            defaultValue={v.anneeConstruction}
          />
          <ZoneTexte
            id="notes"
            name="notes"
            libelle="Notes"
            aide="Nature de l'installation, particularités, points de vigilance…"
            defaultValue={v.notes}
          />
        </fieldset>

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
