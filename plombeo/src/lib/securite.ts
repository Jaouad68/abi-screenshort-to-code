import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Protection anti-force brute (§46).
 *
 * Compteur en base plutôt qu'en mémoire : l'application est déployée sur un
 * hébergement sans état (plusieurs instances possibles), un compteur en mémoire
 * serait contournable en frappant une autre instance. Un cache distribué (Redis)
 * deviendra pertinent quand le volume l'exigera (Phase 15) ; à l'échelle d'un
 * artisan, la base suffit largement.
 */
export const MAX_TENTATIVES = 10;
export const FENETRE_MINUTES = 15;

export function debutFenetre(maintenant: Date = new Date()): Date {
  return new Date(maintenant.getTime() - FENETRE_MINUTES * 60 * 1000);
}

/**
 * Décide si une nouvelle tentative est autorisée.
 * Fonction pure, testable sans base de données.
 */
export function tentativeAutorisee(echecsRecents: number): boolean {
  return echecsRecents < MAX_TENTATIVES;
}

/** Nombre d'échecs de connexion pour cet identifiant sur la fenêtre glissante. */
export async function echecsRecents(identifiant: string): Promise<number> {
  return prisma.loginAttempt.count({
    where: { identifiant, reussie: false, createdAt: { gte: debutFenetre() } },
  });
}

export async function enregistrerTentative(identifiant: string, reussie: boolean): Promise<void> {
  await prisma.loginAttempt.create({ data: { identifiant, reussie } });
}

/**
 * Purge les données de sécurité devenues inutiles (minimisation RGPD §45).
 *
 * Exposée comme fonction appelable ; son branchement sur une tâche planifiée
 * interviendra en Phase 7 avec le moteur d'automatisations.
 */
export async function purgerDonneesExpirees(): Promise<{ tentatives: number; sessions: number }> {
  const limiteTentatives = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const tentatives = await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: limiteTentatives } },
  });
  const sessions = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return { tentatives: tentatives.count, sessions: sessions.count };
}

/* -------------------------------------------------------------------------- */
/* Limitation de débit globale (Phase 15)                                     */
/* -------------------------------------------------------------------------- */

/**
 * Plafond d'ÉCRITURES par fenêtre et par acteur.
 *
 * Volontairement large : il vise l'automate, pas l'artisan pressé. Une limite
 * trop basse se paierait en frustration sur chantier, précisément au moment où
 * l'application doit être la plus effacée.
 */
export const MAX_ECRITURES = 120;

/**
 * Limitation de débit adossée à la table `LoginAttempt`.
 *
 * Réutiliser une table existante évite d'introduire Redis pour un compteur. La
 * Phase 0 avait tranché que le volume mono-tenant ne le justifie pas : payer une
 * brique d'infrastructure supplémentaire, et son exploitation quotidienne, pour
 * un besoin qui n'existe pas encore serait un mauvais échange.
 *
 * La limite porte sur les ÉCRITURES seulement. Borner la consultation
 * dégraderait l'usage normal sans gêner sérieusement un attaquant.
 */
export async function ecritureAutorisee(acteur: string): Promise<boolean> {
  const cle = `w:${acteur}`;
  const recentes = await prisma.loginAttempt.count({
    where: { identifiant: cle, createdAt: { gte: debutFenetre() } },
  });

  if (recentes >= MAX_ECRITURES) return false;

  await prisma.loginAttempt.create({ data: { identifiant: cle, reussie: true } });
  return true;
}
