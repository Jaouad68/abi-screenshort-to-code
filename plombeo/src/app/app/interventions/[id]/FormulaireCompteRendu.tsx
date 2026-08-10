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
const LIBELLE_CHAMP: Record<string, string> = {
  probleme: "Problème signalé",
  diagnostic: "Diagnostic",
  compteRendu: "Travaux réalisés",
};

export function FormulaireCompteRendu({
  interventionId,
  modifiable,
  valeurs,
  vuLe,
}: {
  interventionId: string;
  modifiable: boolean;
  valeurs: { probleme: string; diagnostic: string; compteRendu: string };
  /**
   * Jeton de version (Phase 12) : date de dernière modification lue au moment
   * du rendu. Il permet au serveur de refuser d'écraser une modification
   * arrivée entre-temps.
   */
  vuLe: string;
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
        {/* Sans ce jeton, le serveur REFUSE l'écriture : c'est ce qui empêche le
            « dernier écrit gagne » silencieux. */}
        <input type="hidden" name="vuLe" value={etat.conflit?.[0]?.vuLe ?? vuLe} />
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

        {/* Conflit : les DEUX versions sont montrées. Fusionner
            automatiquement produirait une phrase que personne n'a écrite, sur
            un document qui peut être remis au client. */}
        {etat.conflit?.map((c) => (
          <div key={c.champ} className="border border-trait rounded-controle p-3 bg-fond">
            <p className="font-semibold text-sm">{LIBELLE_CHAMP[c.champ] ?? c.champ}</p>
            <p className="text-sm text-attenue mt-2">Version enregistrée ailleurs :</p>
            <pre className="text-sm whitespace-pre-wrap font-sans bg-white border border-trait rounded-controle p-2 mt-1">
              {c.versionServeur || "(vide)"}
            </pre>
            <p className="text-sm text-attenue mt-2">La vôtre, conservée dans le champ :</p>
            <pre className="text-sm whitespace-pre-wrap font-sans bg-white border border-trait rounded-controle p-2 mt-1">
              {c.versionLocale || "(vide)"}
            </pre>
            <p className="text-sm text-attenue mt-2">
              Rien n&apos;a été écrasé. Modifiez le champ ci-dessus si besoin, puis
              enregistrez à nouveau : c&apos;est votre version qui sera conservée.
            </p>
          </div>
        ))}

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
