"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Bouton, Carte, Champ, Message, Selection, ZoneTexte } from "@/components/ui";
import { LIBELLE_CATEGORIE_EQUIPEMENT, versOptions } from "@/lib/libelles";
import { creerEquipement, type EtatCrm } from "../../clients/actions";

const etatInitial: EtatCrm = {};

/**
 * Ajout d'un équipement, sur place plutôt que sur un écran séparé : sur
 * chantier, l'artisan en saisit souvent plusieurs d'affilée, et une navigation
 * aller-retour à chaque fois serait pénible.
 */
export function FormulaireEquipement({ propertyId }: { propertyId: string }) {
  const [etat, envoyer, enCours] = useActionState(creerEquipement, etatInitial);
  const [ouvert, setOuvert] = useState(false);
  const formulaire = useRef<HTMLFormElement>(null);

  // Après un ajout réussi, le formulaire est vidé et reste ouvert : c'est ce
  // qui permet d'enchaîner les saisies sans reclic.
  useEffect(() => {
    if (etat.succes) formulaire.current?.reset();
  }, [etat.succes]);

  // À l'inverse, après une ERREUR, la saisie doit être restituée : React 19
  // réinitialise le formulaire une fois l'action exécutée.
  const v = etat.valeurs ?? {};
  const cle = etat.tentative ?? 0;

  if (!ouvert) {
    return (
      <Bouton type="button" variante="discret" onClick={() => setOuvert(true)}>
        + Ajouter un équipement
      </Bouton>
    );
  }

  return (
    <Carte>
      <h3 className="font-semibold mb-3">Ajouter un équipement</h3>
      <form key={cle} ref={formulaire} action={envoyer} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="propertyId" value={propertyId} />

        <Selection
          id="categorie"
          name="categorie"
          libelle="Type d'équipement"
          defaultValue={v["categorie"] ?? "CHAUDIERE"}
          options={versOptions(LIBELLE_CATEGORIE_EQUIPEMENT)}
        />
        <div className="grid grid-cols-2 gap-3 items-start">
          <Champ id="marque" name="marque" libelle="Marque" defaultValue={v["marque"] ?? ""} />
          <Champ id="modele" name="modele" libelle="Modèle" defaultValue={v["modele"] ?? ""} />
        </div>
        <Champ id="numeroSerie" name="numeroSerie" libelle="N° de série" defaultValue={v["numeroSerie"] ?? ""} />
        <Champ
          id="localisation"
          name="localisation"
          libelle="Emplacement"
          aide="Cave, cuisine, gaine technique…"
          defaultValue={v["localisation"] ?? ""}
        />
        <div className="grid grid-cols-2 gap-3 items-start">
          <Champ id="datePose" name="datePose" libelle="Date de pose" type="date" defaultValue={v["datePose"] ?? ""} />
          <Champ id="finGarantie" name="finGarantie" libelle="Fin de garantie" type="date" defaultValue={v["finGarantie"] ?? ""} />
        </div>
        <Champ
          id="prochainEntretien"
          name="prochainEntretien"
          libelle="Prochain entretien"
          type="date"
          aide="Note indicative : aucun rappel automatique n'est encore envoyé."
          defaultValue={v["prochainEntretien"] ?? ""}
        />
        <ZoneTexte id="notesEquipement" name="notes" libelle="Notes" defaultValue={v["notes"] ?? ""} />

        {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
        {etat.succes && <Message ton="succes">{etat.succes}</Message>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Bouton type="submit" disabled={enCours}>
            {enCours ? "Ajout…" : "Ajouter"}
          </Bouton>
          <Bouton type="button" variante="discret" onClick={() => setOuvert(false)}>
            Fermer
          </Bouton>
        </div>
      </form>
    </Carte>
  );
}
