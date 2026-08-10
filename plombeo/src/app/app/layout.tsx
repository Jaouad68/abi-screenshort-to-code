import Link from "next/link";

/**
 * Coquille de l'espace connecté.
 *
 * Aucun contrôle d'autorisation n'est fait ici : avec le rendu partiel, un
 * layout n'est pas réexécuté à chaque navigation et ne constitue donc pas une
 * barrière fiable. Chaque page appelle le DAL (`exigerSession`), qui vérifie la
 * session au plus près de la donnée.
 */
export default function LayoutApplication({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-encre text-white no-print">
        <div className="mx-auto w-full max-w-3xl px-5 py-3 flex items-center justify-between">
          <Link href="/app" className="font-bold text-lg">
            Plombéo
          </Link>
          <nav
            aria-label="Navigation principale"
            className="flex items-center gap-1 overflow-x-auto"
          >
            <Link
              href="/app/agenda"
              className="inline-flex items-center min-h-11 px-3 rounded-controle
                         text-sm font-medium hover:bg-white/10"
            >
              Agenda
            </Link>
            <Link
              href="/app/demandes"
              className="inline-flex items-center min-h-11 px-3 rounded-controle
                         text-sm font-medium hover:bg-white/10"
            >
              Demandes
            </Link>
            <Link
              href="/app/devis"
              className="inline-flex items-center min-h-11 px-3 rounded-controle
                         text-sm font-medium hover:bg-white/10"
            >
              Devis
            </Link>
            <Link
              href="/app/factures"
              className="inline-flex items-center min-h-11 px-3 rounded-controle
                         text-sm font-medium hover:bg-white/10"
            >
              Factures
            </Link>
            <Link
              href="/app/clients"
              className="inline-flex items-center min-h-11 px-3 rounded-controle
                         text-sm font-medium hover:bg-white/10"
            >
              Clients
            </Link>
            <Link
              href="/app/documents"
              className="inline-flex items-center min-h-11 px-3 rounded-controle
                         text-sm font-medium hover:bg-white/10"
            >
              Documents
            </Link>
            <Link
              href="/app/catalogue"
              className="inline-flex items-center min-h-11 px-3 rounded-controle
                         text-sm font-medium hover:bg-white/10"
            >
              Catalogue
            </Link>
            <Link
              href="/app/entreprise"
              className="inline-flex items-center min-h-11 px-3 rounded-controle
                         text-sm font-medium hover:bg-white/10"
            >
              Entreprise
            </Link>
            <Link
              href="/app/securite"
              className="inline-flex items-center min-h-11 px-3 rounded-controle
                         text-sm font-medium hover:bg-white/10"
            >
              Sécurité
            </Link>
          </nav>
        </div>
      </header>

      <main
        id="contenu"
        className="flex-1 mx-auto w-full max-w-3xl px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        {children}
      </main>
    </div>
  );
}
