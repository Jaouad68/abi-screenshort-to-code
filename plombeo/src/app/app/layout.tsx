import Link from "next/link";
import { compterNotificationsNonLues } from "@/lib/notifications";
import { sessionCourante } from "@/lib/dal";
import { roleAutorise } from "@/lib/permissions";
import { LIENS_NAVIGATION } from "@/lib/navigation";

/**
 * Coquille de l'espace connecté.
 *
 * Aucun contrôle d'autorisation n'est fait ici : avec le rendu partiel, un
 * layout n'est pas réexécuté à chaque navigation et ne constitue donc pas une
 * barrière fiable. Chaque page appelle le DAL (`exigerSession`), qui vérifie la
 * session au plus près de la donnée.
 *
 * Le filtrage des liens ci-dessous est donc de la PRÉSENTATION, pas de la
 * sécurité : il évite de proposer à un apprenti des écrans que son rôle refuse,
 * ce qui, avant la Phase 14, ne se voyait pas — aucun second compte n'existait
 * pour l'éprouver.
 */

const CLASSE_LIEN =
  "inline-flex items-center min-h-11 px-3 rounded-controle text-sm font-medium hover:bg-white/10";

export default async function LayoutApplication({ children }: { children: React.ReactNode }) {
  // Compteur seulement : aucune donnée sensible ici, et `compterNotifications`
  // ne lève jamais — l'en-tête est rendu sur toutes les pages.
  const nonLues = await compterNotificationsNonLues();
  const contexte = await sessionCourante();

  const visibles = LIENS_NAVIGATION.filter(
    (lien) => !lien.permission || (contexte && roleAutorise(contexte.role, lien.permission)),
  );
  const voitLesAlertes = contexte
    ? roleAutorise(contexte.role, "notification:lire")
    : false;

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
            {visibles.map((lien) => (
              <Link key={lien.href} href={lien.href} className={CLASSE_LIEN}>
                {lien.libelle}
              </Link>
            ))}
            {voitLesAlertes && (
              <Link href="/app/notifications" className={`${CLASSE_LIEN} gap-1.5`}>
                Alertes
                {nonLues > 0 && (
                  <span
                    className="inline-flex items-center justify-center min-w-5 h-5 px-1.5
                               rounded-full bg-action text-white text-xs font-bold"
                    aria-label={`${nonLues} non lues`}
                  >
                    {nonLues > 99 ? "99+" : nonLues}
                  </span>
                )}
              </Link>
            )}
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
