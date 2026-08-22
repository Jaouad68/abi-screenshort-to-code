import Link from "next/link";
import { Carte } from "@/components/ui";

export default function AccueilPublic() {
  return (
    <main id="contenu" className="flex-1 flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-lg">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-action">
            Plombéo
          </p>
          <h1 className="text-3xl font-bold mt-2 leading-tight">
            Votre métier.
            <br />
            Simplement mieux géré.
          </h1>
          <p className="text-attenue mt-3">
            L&apos;assistant tout-en-un du plombier indépendant : clients, interventions,
            devis et factures, depuis le chantier comme depuis le bureau.
          </p>
        </header>

        <Carte>
          <div className="flex flex-col gap-3">
            <Link
              href="/inscription"
              className="inline-flex items-center justify-center min-h-11 px-5 rounded-controle
                         font-semibold bg-action text-white hover:bg-action-fonce"
            >
              Créer mon compte
            </Link>
            <Link
              href="/connexion"
              className="inline-flex items-center justify-center min-h-11 px-5 rounded-controle
                         font-semibold bg-white text-encre border border-trait
                         hover:bg-fond"
            >
              J&apos;ai déjà un compte
            </Link>
          </div>
        </Carte>

        <p className="text-xs text-attenue mt-6">
          Version en cours de construction. Les modules devis, factures et interventions
          seront livrés progressivement.
        </p>
      </div>
    </main>
  );
}
