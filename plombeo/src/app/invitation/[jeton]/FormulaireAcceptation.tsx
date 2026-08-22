"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Bouton, Carte, Champ, Message } from "@/components/ui";
import { LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/validation";
import { accepterInvitation, type EtatInvitation } from "./actions";

const etatInitial: EtatInvitation = {};

/**
 * Deux formulaires pour un même jeton.
 *
 * Si l'adresse a déjà un compte Plombéo, on demande le mot de passe DE CE
 * COMPTE : sans cette preuve, le porteur du lien entrerait dans un compte
 * existant sans jamais l'avoir connu.
 */
export function FormulaireAcceptation({
  jeton,
  email,
  compteExistant,
}: {
  jeton: string;
  email: string;
  compteExistant: boolean;
}) {
  const [etat, action, enCours] = useActionState(accepterInvitation, etatInitial);
  const cle = etat.tentative ?? 0;

  if (etat.succes) {
    return (
      <Carte>
        <Message ton="succes">{etat.succes}</Message>
        <p className="text-sm mt-4">
          <Link href="/connexion" className="font-semibold text-encre underline">
            Se connecter
          </Link>
        </p>
      </Carte>
    );
  }

  return (
    <Carte>
      <form key={cle} action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="jeton" value={jeton} />

        {compteExistant ? (
          <>
            <p className="text-sm">
              Un compte Plombéo existe déjà pour <strong>{email}</strong>. Saisissez son
              mot de passe pour rejoindre cette équipe.
            </p>
            <Champ
              id="motDePasse"
              name="motDePasse"
              type="password"
              libelle="Mot de passe de votre compte Plombéo"
              autoComplete="current-password"
              required
            />
          </>
        ) : (
          <>
            <Champ
              id="nomComplet"
              name="nomComplet"
              libelle="Votre nom"
              aide="Il apparaîtra dans l'équipe et sur vos interventions."
              defaultValue={etat.valeurs?.["nomComplet"] ?? ""}
              autoComplete="name"
              required
            />
            <Champ
              id="motDePasse"
              name="motDePasse"
              type="password"
              libelle="Choisissez un mot de passe"
              aide={`Au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`}
              autoComplete="new-password"
              required
            />
          </>
        )}

        {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}

        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Rejoindre l'équipe"}
        </Bouton>
      </form>
    </Carte>
  );
}
