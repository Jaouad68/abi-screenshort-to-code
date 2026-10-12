"use client";

import { useActionState, useState } from "react";
import { Bouton, Carte, Champ, Message, ZoneTexte } from "@/components/ui";
import { enregistrerModele, reinitialiserModele, type EtatAutomatisation } from "./actions";

const etatInitial: EtatAutomatisation = {};

export function FormulaireModele({
  cleModele,
  titre,
  sujet,
  corps,
  personnalise,
}: {
  cleModele: string;
  titre: string;
  sujet: string;
  corps: string;
  personnalise: boolean;
}) {
  const [etat, envoyer, enCours] = useActionState(enregistrerModele, etatInitial);
  const [ouvert, setOuvert] = useState(false);
  const cle = etat.tentative ?? 0;

  return (
    <Carte>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{titre}</h3>
        {!personnalise && <span className="text-sm text-attenue">Texte par défaut</span>}
      </div>

      {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
      {etat.succes && <Message ton="succes">{etat.succes}</Message>}

      {!ouvert ? (
        <div className="mt-3">
          <p className="text-sm font-medium">{sujet}</p>
          <pre className="text-sm whitespace-pre-wrap font-sans text-attenue mt-1">{corps}</pre>
          <div className="flex flex-wrap gap-2 mt-3">
            <Bouton type="button" variante="discret" onClick={() => setOuvert(true)}>
              Modifier
            </Bouton>
            {personnalise && (
              <form action={reinitialiserModele}>
                <input type="hidden" name="cle" value={cleModele} />
                <Bouton type="submit" variante="discret">
                  Rétablir le texte par défaut
                </Bouton>
              </form>
            )}
          </div>
        </div>
      ) : (
        <form key={cle} action={envoyer} className="flex flex-col gap-4 mt-3" noValidate>
          <input type="hidden" name="cle" value={cleModele} />
          <Champ id={`sujet-${cleModele}`} name="sujet" libelle="Sujet" defaultValue={sujet} />
          <ZoneTexte
            id={`corps-${cleModele}`}
            name="corps"
            libelle="Message"
            rows={10}
            defaultValue={corps}
            aide="Les mentions entre doubles accolades sont remplacées à l'envoi."
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Bouton type="submit" disabled={enCours}>
              {enCours ? "Enregistrement…" : "Enregistrer"}
            </Bouton>
            <Bouton type="button" variante="discret" onClick={() => setOuvert(false)}>
              Annuler
            </Bouton>
          </div>
        </form>
      )}
    </Carte>
  );
}
