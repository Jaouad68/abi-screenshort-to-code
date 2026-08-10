"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Bouton, Carte, Champ, Message } from "@/components/ui";
import { connecter, type EtatConnexion } from "./actions";

const etatInitial: EtatConnexion = {};

export default function PageConnexion() {
  const [etat, action, enCours] = useActionState(connecter, etatInitial);

  return (
    <main id="contenu" className="flex-1 flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-1">Se connecter</h1>
        <p className="text-attenue mb-6">Accédez à votre espace Plombéo.</p>

        <Carte>
          <form action={action} className="flex flex-col gap-4" noValidate>
            <Champ
              id="email"
              name="email"
              type="email"
              libelle="Adresse e-mail"
              placeholder="vous@exemple.fr"
              autoComplete="email"
              inputMode="email"
              required
            />
            <Champ
              id="motDePasse"
              name="motDePasse"
              type="password"
              libelle="Mot de passe"
              autoComplete="current-password"
              required
            />

            {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}

            <Bouton type="submit" disabled={enCours}>
              {enCours ? "Connexion en cours…" : "Se connecter"}
            </Bouton>
          </form>
        </Carte>

        <p className="text-sm text-attenue mt-4">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-semibold text-encre underline">
            Créer mon compte
          </Link>
        </p>
      </div>
    </main>
  );
}
