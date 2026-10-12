"use client";

import { useActionState } from "react";
import { Bouton, Carte, Champ, Message, ZoneTexte } from "@/components/ui";
import { modifierEnteteDevis, type EtatDevis } from "../actions";

const etatInitial: EtatDevis = {};

export function EnteteDevis({
  devisId,
  modifiable,
  valeurs,
}: {
  devisId: string;
  modifiable: boolean;
  valeurs: { objet: string; conditions: string; notes: string; validiteJours: string };
}) {
  const [etat, envoyer, enCours] = useActionState(modifierEnteteDevis, etatInitial);
  const v = { ...valeurs, ...(etat.valeurs ?? {}) };
  const cle = etat.tentative ?? 0;

  if (!modifiable) {
    if (!v.objet && !v.conditions) return null;
    return (
      <Carte>
        {v.objet && (
          <>
            <h2 className="font-semibold mb-1">Objet</h2>
            <p className="text-sm mb-3">{v.objet}</p>
          </>
        )}
        {v.conditions && (
          <>
            <h2 className="font-semibold mb-1">Conditions</h2>
            <p className="text-sm whitespace-pre-wrap">{v.conditions}</p>
          </>
        )}
      </Carte>
    );
  }

  return (
    <Carte>
      <form key={cle} action={envoyer} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="id" value={devisId} />
        <Champ id="objet" name="objet" libelle="Objet" defaultValue={v.objet} />
        <Champ
          id="validiteJours"
          name="validiteJours"
          libelle="Validité (jours)"
          inputMode="numeric"
          defaultValue={v.validiteJours}
        />
        <ZoneTexte
          id="conditions"
          name="conditions"
          libelle="Conditions"
          aide="Vos conditions et mentions, telles que vous les rédigez. Plombéo n'en propose aucune : elles relèvent de sources officielles et de votre conseil."
          rows={4}
          defaultValue={v.conditions}
        />
        <ZoneTexte
          id="notesDevis"
          name="notes"
          libelle="Note interne"
          aide="N'apparaît pas sur le document remis au client."
          defaultValue={v.notes}
        />

        {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
        {etat.succes && <Message ton="succes">{etat.succes}</Message>}

        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </Bouton>
      </form>
    </Carte>
  );
}
