"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Bouton, Carte, Champ, Message, Selection, ZoneTexte } from "@/components/ui";
import { creerRendezVous, type EtatTerrain } from "../actions";

const etatInitial: EtatTerrain = {};

const URGENCES = [
  { valeur: "NORMAL", libelle: "Normal" },
  { valeur: "RAPIDE", libelle: "À faire vite" },
  { valeur: "URGENT", libelle: "Urgent" },
  { valeur: "CRITIQUE", libelle: "Critique" },
];

/** Prochaine heure ronde, au format attendu par `datetime-local`. */
function prochainCreneau(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`;
}

function ajouterHeure(valeur: string): string {
  const d = new Date(valeur);
  d.setHours(d.getHours() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function FormulaireRendezVous({
  clients,
  leadId,
  clientInitial,
  urgenceInitiale,
  titreInitial,
}: {
  clients: { id: string; nom: string }[];
  leadId: string;
  clientInitial: string;
  urgenceInitiale: string;
  titreInitial: string;
}) {
  const [etat, envoyer, enCours] = useActionState(creerRendezVous, etatInitial);
  const v = etat.valeurs ?? {};
  const cle = etat.tentative ?? 0;

  const debutDefaut = v["debut"] ?? prochainCreneau();

  if (clients.length === 0) {
    return (
      <Carte>
        <p className="font-semibold">Aucun client enregistré</p>
        <p className="text-sm text-attenue mt-2 mb-3">
          Un rendez-vous se prend pour un client. Créez d&apos;abord une fiche.
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
        {leadId && <input type="hidden" name="leadId" value={leadId} />}

        <Selection
          id="clientId"
          name="clientId"
          libelle="Client"
          defaultValue={v["clientId"] ?? clientInitial}
          options={clients.map((c) => ({ valeur: c.id, libelle: c.nom }))}
        />
        <Champ
          id="titre"
          name="titre"
          libelle="Objet"
          aide="Par exemple : fuite sous évier, entretien chaudière."
          defaultValue={v["titre"] ?? titreInitial}
        />
        <Champ
          id="debut"
          name="debut"
          libelle="Début"
          type="datetime-local"
          defaultValue={debutDefaut}
        />
        <Champ
          id="fin"
          name="fin"
          libelle="Fin"
          type="datetime-local"
          defaultValue={v["fin"] ?? ajouterHeure(debutDefaut)}
        />
        <Champ
          id="trajetMin"
          name="trajetMin"
          libelle="Trajet estimé (minutes)"
          aide="Saisi par vous : Plombéo ne calcule pas d'itinéraire."
          inputMode="numeric"
          defaultValue={v["trajetMin"] ?? "0"}
        />
        <Selection
          id="urgence"
          name="urgence"
          libelle="Priorité"
          defaultValue={v["urgence"] ?? urgenceInitiale}
          options={URGENCES}
        />
        <ZoneTexte id="notes" name="notes" libelle="Notes" defaultValue={v["notes"] ?? ""} />

        {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Bouton type="submit" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Créer le rendez-vous"}
          </Bouton>
          <Link
            href="/app/agenda"
            className="inline-flex items-center justify-center min-h-11 px-5 rounded-controle
                       font-semibold bg-white text-encre border border-trait hover:bg-fond"
          >
            Annuler
          </Link>
        </div>

        <p className="text-xs text-attenue">
          La priorité sert à trier votre planning. Aucune majoration tarifaire n&apos;en
          découle : vos prix vous appartiennent et arriveront avec le catalogue.
        </p>
      </form>
    </Carte>
  );
}
