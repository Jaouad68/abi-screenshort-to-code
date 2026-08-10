"use client";

import { useActionState } from "react";
import { Bouton, Carte, Message, ZoneTexte } from "@/components/ui";
import { enregistrerCompteRendu, type EtatTerrain } from "../../agenda/actions";

const etatInitial: EtatTerrain = {};

/**
 * Compte rendu d'intervention.
 *
 * Contrairement aux tâches, temps et fournitures, ce formulaire passe par une
 * Server Action classique : c'est un texte long, rédigé plutôt en fin
 * d'intervention, et sa saisie hors-ligne passe par la file de synchronisation
 * (mutation `compteRendu`) lorsque le réseau manque.
 */
export function FormulaireCompteRendu({
  interventionId,
  modifiable,
  valeurs,
}: {
  interventionId: string;
  modifiable: boolean;
  valeurs: { probleme: string; diagnostic: string; compteRendu: string };
}) {
  const [etat, envoyer, enCours] = useActionState(enregistrerCompteRendu, etatInitial);
  const v = { ...valeurs, ...(etat.valeurs ?? {}) };
  const cle = etat.tentative ?? 0;

  if (!modifiable) {
    return (
      <Carte>
        <h2 className="font-semibold mb-3">Compte rendu</h2>
        <dl className="flex flex-col gap-3 text-sm">
          {v.probleme && <Bloc titre="Problème signalé" texte={v.probleme} />}
          {v.diagnostic && <Bloc titre="Diagnostic" texte={v.diagnostic} />}
          {v.compteRendu && <Bloc titre="Travaux réalisés" texte={v.compteRendu} />}
          {!v.probleme && !v.diagnostic && !v.compteRendu && (
            <p className="text-attenue">Aucun compte rendu saisi.</p>
          )}
        </dl>
      </Carte>
    );
  }

  return (
    <Carte>
      <h2 className="font-semibold mb-3">Compte rendu</h2>
      <form key={cle} action={envoyer} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="id" value={interventionId} />
        <ZoneTexte
          id="probleme"
          name="probleme"
          libelle="Problème signalé"
          aide="Ce que le client a décrit."
          defaultValue={v.probleme}
        />
        <ZoneTexte
          id="diagnostic"
          name="diagnostic"
          libelle="Diagnostic"
          aide="Votre analyse professionnelle. Elle vous appartient : l'application ne la déduit jamais."
          defaultValue={v.diagnostic}
        />
        <ZoneTexte
          id="compteRendu"
          name="compteRendu"
          libelle="Travaux réalisés"
          defaultValue={v.compteRendu}
        />

        {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
        {etat.succes && <Message ton="succes">{etat.succes}</Message>}

        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer le compte rendu"}
        </Bouton>
        <p className="text-xs text-attenue">
          Ce champ nécessite le réseau. Hors connexion, saisissez vos tâches, temps et
          fournitures ci-dessus : ils sont conservés sur l&apos;appareil.
        </p>
      </form>
    </Carte>
  );
}

function Bloc({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div>
      <dt className="text-attenue">{titre}</dt>
      <dd className="font-medium whitespace-pre-wrap">{texte}</dd>
    </div>
  );
}
