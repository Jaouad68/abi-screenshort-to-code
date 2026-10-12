"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Bouton, Carte, Champ, Message, Selection } from "@/components/ui";
import { creerDevis, type EtatDevis } from "../actions";

const etatInitial: EtatDevis = {};

export function FormulaireDevis({ clients }: { clients: { id: string; nom: string }[] }) {
  const [etat, envoyer, enCours] = useActionState(creerDevis, etatInitial);
  const v = etat.valeurs ?? {};
  const cle = etat.tentative ?? 0;

  if (clients.length === 0) {
    return (
      <Carte>
        <p className="font-semibold">Aucun client enregistré</p>
        <p className="text-sm text-attenue mt-2 mb-3">
          Un devis s&apos;adresse à un client. Créez d&apos;abord une fiche.
        </p>
        <Link
          href="/app/clients/nouveau"
          className="inline-flex items-center justify-center min-h-11 px-5 rounded-controle
                     font-semibold bg-action text-white hover:bg-action-fonce"
        >
          Créer un client
        </Link>
      </Carte>
    );
  }

  return (
    <Carte>
      <form key={cle} action={envoyer} className="flex flex-col gap-4" noValidate>
        <Selection
          id="clientId"
          name="clientId"
          libelle="Client"
          defaultValue={v["clientId"] ?? ""}
          options={clients.map((c) => ({ valeur: c.id, libelle: c.nom }))}
        />
        <Champ
          id="objet"
          name="objet"
          libelle="Objet"
          aide="Par exemple : remplacement chauffe-eau, rénovation salle de bain."
          defaultValue={v["objet"] ?? ""}
        />
        <Champ
          id="validiteJours"
          name="validiteJours"
          libelle="Validité (jours)"
          inputMode="numeric"
          defaultValue={v["validiteJours"] ?? "30"}
        />

        {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Bouton type="submit" disabled={enCours}>
            {enCours ? "Création…" : "Créer le devis"}
          </Bouton>
          <Link
            href="/app/devis"
            className="inline-flex items-center justify-center min-h-11 px-5 rounded-controle
                       font-semibold bg-white text-encre border border-trait hover:bg-fond"
          >
            Annuler
          </Link>
        </div>

        <p className="text-xs text-attenue">
          La durée de validité que vous indiquez figurera sur le document. Les mentions
          légales obligatoires relèvent de sources officielles : Plombéo ne les rédige pas
          à votre place.
        </p>
      </form>
    </Carte>
  );
}
