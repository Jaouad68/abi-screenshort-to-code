"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Bouton, Carte, Champ, Message, Selection, ZoneTexte } from "@/components/ui";
import { creerDemande, type EtatTerrain } from "../../agenda/actions";

const etatInitial: EtatTerrain = {};

const URGENCES = [
  { valeur: "NORMAL", libelle: "Normal — à planifier" },
  { valeur: "RAPIDE", libelle: "À faire vite" },
  { valeur: "URGENT", libelle: "Urgent — sous 24 h" },
  { valeur: "CRITIQUE", libelle: "Critique — intervention immédiate" },
];

export function FormulaireDemande({ clients }: { clients: { id: string; nom: string }[] }) {
  const [etat, envoyer, enCours] = useActionState(creerDemande, etatInitial);
  const v = etat.valeurs ?? {};
  const cle = etat.tentative ?? 0;

  return (
    <Carte>
      <form key={cle} action={envoyer} className="flex flex-col gap-4" noValidate>
        <ZoneTexte
          id="description"
          name="description"
          libelle="Ce que le client décrit"
          aide="Ses mots à lui : « ça fuit sous l'évier depuis ce matin »."
          rows={4}
          defaultValue={v["description"] ?? ""}
        />
        <Selection
          id="urgence"
          name="urgence"
          libelle="Urgence"
          defaultValue={v["urgence"] ?? "NORMAL"}
          options={URGENCES}
        />

        <fieldset className="flex flex-col gap-4 border-t border-trait pt-4">
          <legend className="font-semibold text-sm">Qui appelle ?</legend>
          {/* Client existant OU coordonnées libres : une demande arrive souvent
              avant même qu'une fiche client existe. */}
          <Selection
            id="clientId"
            name="clientId"
            libelle="Client existant"
            defaultValue={v["clientId"] ?? ""}
            options={[
              { valeur: "", libelle: "— Nouveau contact —" },
              ...clients.map((c) => ({ valeur: c.id, libelle: c.nom })),
            ]}
          />
          <Champ
            id="contactNom"
            name="contactNom"
            libelle="Nom"
            aide="Si ce n'est pas encore un client enregistré."
            defaultValue={v["contactNom"] ?? ""}
          />
          <Champ
            id="contactTelephone"
            name="contactTelephone"
            libelle="Téléphone"
            type="tel"
            inputMode="tel"
            defaultValue={v["contactTelephone"] ?? ""}
          />
        </fieldset>

        {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Bouton type="submit" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer la demande"}
          </Bouton>
          <Link
            href="/app/demandes"
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
