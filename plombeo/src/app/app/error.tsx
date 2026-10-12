"use client";

import Link from "next/link";
import { Carte } from "@/components/ui";

/**
 * Frontière d'erreur de l'espace connecté.
 *
 * Ce qu'elle remplace : une page blanche « A server error occurred », qui
 * n'apprend rien. Le cas de loin le plus fréquent depuis la Phase 14 est un rôle
 * qui n'a pas accès à l'écran demandé — un apprenti sur les devis, par exemple.
 *
 * Le message ne PRÉTEND PAS savoir lequel des deux cas s'est produit : en
 * production, seul un identifiant opaque (`digest`) traverse la frontière, par
 * construction. Affirmer « vous n'avez pas les droits » sur une panne réelle
 * enverrait l'artisan chercher un problème de rôle inexistant.
 */
export default function ErreurEspaceApplicatif({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Cette page ne s&apos;affiche pas</h1>
      </header>

      <Carte>
        <p className="text-sm">
          Deux explications possibles : <strong>votre rôle ne donne pas accès</strong> à
          cet écran, ou une erreur technique s&apos;est produite.
        </p>
        <p className="text-sm text-attenue mt-2">
          Si vous pensez devoir y accéder, demandez à la personne qui administre votre
          entreprise de vérifier votre rôle depuis l&apos;écran Équipe.
        </p>

        <div className="flex flex-wrap gap-3 mt-4">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                       font-semibold bg-encre text-white hover:bg-encre-clair"
          >
            Réessayer
          </button>
          <Link
            href="/app"
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                       font-semibold bg-white text-encre border border-trait hover:bg-fond"
          >
            Revenir à l&apos;accueil
          </Link>
        </div>

        {error.digest && (
          <p className="text-sm text-attenue mt-4">
            Référence à communiquer au support : <code>{error.digest}</code>
          </p>
        )}
      </Carte>
    </div>
  );
}
