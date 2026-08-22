/**
 * EN-TÊTES DE SÉCURITÉ (Phase 15).
 *
 * Extraits de `proxy.ts` pour être testables sur leur VALEUR plutôt que sur le
 * texte du fichier : un test qui lit le source confond la politique et les
 * commentaires qui la décrivent.
 */

/**
 * Politique de sécurité du contenu.
 *
 * `style-src` conserve l'autorisation des styles en ligne : Next.js en injecte,
 * et prétendre le contraire produirait une politique qui casse l'application au
 * premier déploiement. Limite assumée et écrite, pas un oubli.
 *
 * Aucune source DISTANTE n'est autorisée nulle part : Plombéo ne charge aucun
 * script, aucune police et aucune image tiers.
 */
export const CSP = [
  "default-src 'self'",
  // L'amorçage de Next.js exige les scripts en ligne ; l'essentiel reste
  // qu'aucune origine externe ne soit admise.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // `data:` couvre les tracés de signature (Phase 6), produits sur l'appareil.
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  // Ni greffon ni iframe : aucun usage ici.
  "object-src 'none'",
  "frame-src 'none'",
  // Empêche l'injection d'une balise <base> détournant les liens relatifs.
  "base-uri 'self'",
  // Un formulaire ne poste jamais ailleurs que chez nous.
  "form-action 'self'",
  // Remplace utilement X-Frame-Options, conservé pour les vieux moteurs.
  "frame-ancestors 'none'",
].join("; ");

/**
 * En-têtes appliqués à toutes les réponses.
 *
 * HSTS n'a d'effet qu'en HTTPS : inoffensif en développement. Volontairement
 * SANS `preload` — l'inscription sur la liste des navigateurs engage le domaine
 * entier et se retire très difficilement.
 */
export const ENTETES_SECURITE: Record<string, string> = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=(self)",
};
