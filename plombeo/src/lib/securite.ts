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
