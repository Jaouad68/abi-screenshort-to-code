"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Bouton, Carte, Champ, Message } from "@/components/ui";
import { connecter, verifierCode, type EtatConnexion } from "./actions";

const etatInitial: EtatConnexion = {};

/**
 * Connexion en une ou deux étapes.
 *
 * La seconde n'apparaît que si un second facteur est actif. À ce stade, aucune
 * session n'est ouverte : le mot de passe seul ne donne accès à rien.
 */
export default function PageConnexion() {
  const [etat, action, enCours] = useActionState(connecter, etatInitial);

  if (etat.etape === "code") return <EtapeCode email={etat.email ?? ""} />;

  const cle = etat.tentative ?? 0;

  return (
    <main id="contenu" className="flex-1 flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-1">Se connecter</h1>
        <p className="text-attenue mb-6">Accédez à votre espace Plombéo.</p>

        <Carte>
          <form key={cle} action={action} className="flex flex-col gap-4" noValidate>
            <Champ
              id="email"
              name="email"
              type="email"
              libelle="Adresse e-mail"
              placeholder="vous@exemple.fr"
              defaultValue={etat.email ?? ""}
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

function EtapeCode({ email }: { email: string }) {
  const [etat, action, enCours] = useActionState(verifierCode, etatInitial);
  const cle = etat.tentative ?? 0;

  return (
    <main id="contenu" className="flex-1 flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-1">Code de vérification</h1>
        <p className="text-attenue mb-6">
          Ouvrez votre application d&apos;authentification et saisissez le code affiché
          pour {email}.
        </p>

        <Carte>
          <form key={cle} action={action} className="flex flex-col gap-4" noValidate>
            <Champ
              id="code"
              name="code"
              libelle="Code à six chiffres"
              aide="Ou l'un de vos codes de récupération, si vous n'avez plus votre téléphone."
              inputMode="text"
              autoComplete="one-time-code"
              autoFocus
              required
            />

            {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}

            <Bouton type="submit" disabled={enCours}>
              {enCours ? "Vérification…" : "Vérifier"}
            </Bouton>
          </form>
        </Carte>

        <p className="text-sm text-attenue mt-4">
          {/* Lien plein, pas <Link> : on est déjà sur /connexion, et seule une
              vraie navigation remet l'état du formulaire à zéro. */}
          <a href="/connexion" className="font-semibold text-encre underline">
            Recommencer la connexion
          </a>
        </p>
      </div>
    </main>
  );
}
