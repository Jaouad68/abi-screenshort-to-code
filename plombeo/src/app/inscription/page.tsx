"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Bouton, Carte, Champ, Message } from "@/components/ui";
import { inscrire, type EtatInscription } from "./actions";

const etatInitial: EtatInscription = {};

export default function PageInscription() {
  const [etat, action, enCours] = useActionState(inscrire, etatInitial);
  const v = etat.valeurs ?? {};
  const cle = etat.tentative ?? 0;

  return (
    <main id="contenu" className="flex-1 flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-1">Créer mon compte</h1>
        <p className="text-attenue mb-6">
          Quelques informations suffisent pour démarrer.
        </p>

        <Carte>
          <form key={cle} action={action} className="flex flex-col gap-4" noValidate>
            <Champ
              id="nomEntreprise"
              name="nomEntreprise"
              libelle="Nom de votre entreprise"
              placeholder="Plomberie Martin"
              defaultValue={v["nomEntreprise"] ?? ""}
              autoComplete="organization"
              required
            />
            <Champ
              id="email"
              name="email"
              type="email"
              libelle="Adresse e-mail"
              placeholder="vous@exemple.fr"
              defaultValue={v["email"] ?? ""}
              autoComplete="email"
              inputMode="email"
              required
            />
            <Champ
              id="motDePasse"
              name="motDePasse"
              type="password"
              libelle="Mot de passe"
              aide="Au moins 12 caractères."
              autoComplete="new-password"
              required
            />

            {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}

            <Bouton type="submit" disabled={enCours}>
              {enCours ? "Création en cours…" : "Créer mon compte"}
            </Bouton>
          </form>
        </Carte>

        <p className="text-sm text-attenue mt-4">
          Vous avez déjà un compte ?{" "}
          <Link href="/connexion" className="font-semibold text-encre underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
