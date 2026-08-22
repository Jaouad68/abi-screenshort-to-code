"use client";

import { useActionState, useState } from "react";
import { Bouton, Carte, Champ, Message, Selection } from "@/components/ui";
import { televerserDocument, type EtatDocument } from "@/app/app/documents/actions";

const etatInitial: EtatDocument = {};

const CATEGORIES = [
  { valeur: "PHOTO", libelle: "Photo" },
  { valeur: "ATTESTATION", libelle: "Attestation" },
  { valeur: "CONTRAT", libelle: "Contrat" },
  { valeur: "NOTICE", libelle: "Notice" },
  { valeur: "AUTRE", libelle: "Autre" },
];

const MOMENTS = [
  { valeur: "AVANT", libelle: "Avant travaux" },
  { valeur: "APRES", libelle: "Après travaux" },
  { valeur: "AUTRE", libelle: "Autre" },
];

/**
 * Téléversement d'un document ou d'une photo.
 *
 * `capture="environment"` ouvre directement l'appareil photo arrière sur
 * mobile : sur un chantier, chercher une photo dans la galerie est une perte
 * de temps.
 */
export function Televersement({
  rattachement,
  categorieParDefaut = "AUTRE",
  photo = false,
  titre = "Ajouter un document",
}: {
  rattachement: Record<string, string>;
  categorieParDefaut?: string;
  photo?: boolean;
  titre?: string;
}) {
  const [etat, envoyer, enCours] = useActionState(televerserDocument, etatInitial);
  const [ouvert, setOuvert] = useState(false);
  const cle = etat.tentative ?? 0;

  if (!ouvert) {
    return (
      <>
        {etat.succes && <Message ton="succes">{etat.succes}</Message>}
        <Bouton type="button" variante="discret" onClick={() => setOuvert(true)}>
          {photo ? "+ Ajouter une photo" : "+ Ajouter un document"}
        </Bouton>
      </>
    );
  }

  return (
    <Carte>
      <h3 className="font-semibold mb-3">{titre}</h3>
      {/* Le retour vit hors du formulaire : celui-ci se referme après un envoi
          réussi, et le message partirait avec lui. */}
      {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
      {etat.succes && <Message ton="succes">{etat.succes}</Message>}

      <form key={cle} action={envoyer} className="flex flex-col gap-4 mt-3" noValidate>
        {Object.entries(rattachement).map(([champ, valeur]) => (
          <input key={champ} type="hidden" name={champ} value={valeur} />
        ))}
        <input type="hidden" name="categorie" value={categorieParDefaut} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="fichier" className="font-semibold text-sm">
            Fichier
          </label>
          <p className="text-sm text-attenue">
            Image (JPEG, PNG, WebP, HEIC) ou PDF, 10 Mo maximum.
          </p>
          <input
            id="fichier"
            name="fichier"
            type="file"
            accept={photo ? "image/*" : "image/*,application/pdf"}
            {...(photo ? { capture: "environment" as const } : {})}
            className="min-h-11 px-3 py-2 rounded-controle border border-trait bg-white"
          />
        </div>

        {photo && (
          <Selection id="moment" name="moment" libelle="Moment" defaultValue="AVANT" options={MOMENTS} />
        )}
        {!photo && (
          <Selection
            id="categorie-doc"
            name="categorie"
            libelle="Catégorie"
            defaultValue={categorieParDefaut}
            options={CATEGORIES}
          />
        )}

        <Champ id="legende" name="legende" libelle="Légende" />
        <Champ id="tags" name="tags" libelle="Étiquettes" aide="Séparées par des virgules." />

        <div className="flex flex-col gap-3 sm:flex-row">
          <Bouton type="submit" disabled={enCours}>
            {enCours ? "Envoi…" : "Enregistrer"}
          </Bouton>
          <Bouton type="button" variante="discret" onClick={() => setOuvert(false)}>
            Fermer
          </Bouton>
        </div>
      </form>
    </Carte>
  );
}
