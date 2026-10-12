import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSION } from "@/lib/session";
import { ENTETES_SECURITE } from "@/lib/entetes";

/**
 * Next.js 16 : le fichier `middleware.ts` est déprécié au profit de `proxy.ts`,
 * et la fonction exportée doit s'appeler `proxy`. Le runtime est Node.js et
 * n'est pas configurable.
 *
 * Rôle ici, volontairement limité à deux choses :
 *
 *  1. Les en-têtes de sécurité, appliqués à toutes les réponses.
 *  2. Une redirection *optimiste* des routes privées vers la connexion, sur la
 *     simple présence du cookie.
 *
 * Ce contrôle optimiste n'est PAS une barrière d'autorisation : il évite un
 * aller-retour inutile à un visiteur manifestement non connecté. La vraie
 * vérification (signature du jeton, session active en base, appartenance à
 * l'organisation, permissions) est faite dans src/lib/dal.ts, au plus près de
 * la donnée. Un cookie présent mais invalide sera rejeté là.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const routePrivee = pathname === "/app" || pathname.startsWith("/app/");
  const cookiePresent = request.cookies.has(COOKIE_SESSION);

  if (routePrivee && !cookiePresent) {
    const destination = new URL("/connexion", request.url);
    return appliquerEntetes(NextResponse.redirect(destination));
  }

  return appliquerEntetes(NextResponse.next());
}

function appliquerEntetes(reponse: NextResponse): NextResponse {
  for (const [nom, valeur] of Object.entries(ENTETES_SECURITE)) {
    reponse.headers.set(nom, valeur);
  }
  return reponse;
}

export const config = {
  // Exclut les ressources statiques : inutile d'exécuter le proxy pour elles.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icones/|sw.js|manifest.webmanifest).*)"],
};
