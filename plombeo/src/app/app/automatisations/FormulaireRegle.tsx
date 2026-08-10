"use client";

import { useActionState, useState } from "react";
import { Bouton, Carte, Champ, Message, Selection } from "@/components/ui";
import { enregistrerRegle, type EtatAutomatisation } from "./actions";

const etatInitial: EtatAutomatisation = {};

const DECLENCHEURS = [
  { valeur: "FACTURE_ECHUE", libelle: "Facture échue non payée" },
  { valeur: "DEVIS_SANS_REPONSE", libelle: "Devis sans réponse" },
  { valeur: "RENDEZ_VOUS_DEMAIN", libelle: "Rendez-vous du lendemain" },
  { valeur: "INTERVENTION_A_CLOTURER", libelle: "Intervention terminée non clôturée" },
];

export function FormulaireRegle({ emailDisponible }: { emailDisponible: boolean }) {
  const [etat, envoyer, enCours] = useActionState(enregistrerRegle, etatInitial);
  const [ouvert, setOuvert] = useState(false);
  const cle = etat.tentative ?? 0;

  if (!ouvert) {
    return (
      <>
        {etat.succes && <Message ton="succes">{etat.succes}</Message>}
        <Bouton type="button" variante="discret" onClick={() => setOuvert(true)}>
          + Ajouter une règle
        </Bouton>
      </>
    );
  }

  const actions = [
    { valeur: "NOTIFIER", libelle: "Me notifier dans Plombéo" },
    ...(emailDisponible ? [{ valeur: "ENVOYER_EMAIL", libelle: "Envoyer un e-mail au client" }] : []),
  ];

  return (
    <Carte>
      <h3 className="font-semibold mb-3">Nouvelle règle</h3>
      {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
      {etat.succes && <Message ton="succes">{etat.succes}</Message>}

      <form key={cle} action={envoyer} className="flex flex-col gap-4 mt-3" noValidate>
        <Selection
          id="declencheur"
          name="declencheur"
          libelle="Quand"
          defaultValue="FACTURE_ECHUE"
          options={DECLENCHEURS}
        />
        <Champ
          id="delaiJours"
          name="delaiJours"
          libelle="Délai en jours"
          type="number"
          min={0}
          max={365}
          defaultValue={7}
          aide="Nombre de jours après l'événement. 0 pour le jour même."
        />
        <Selection id="action" name="action" libelle="Alors" defaultValue="NOTIFIER" options={actions} />
        {!emailDisponible && (
          <p className="text-sm text-attenue">
            L&apos;envoi d&apos;e-mail n&apos;est pas proposé tant qu&apos;aucun serveur
            n&apos;est configuré.
          </p>
        )}
        <Champ id="libelle" name="libelle" libelle="Note (facultatif)" />

        <label className="flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" name="active" className="size-5" />
          Activer tout de suite
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Bouton type="submit" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </Bouton>
          <Bouton type="button" variante="discret" onClick={() => setOuvert(false)}>
            Fermer
          </Bouton>
        </div>
      </form>
    </Carte>
  );
}
