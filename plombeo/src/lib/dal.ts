import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COOKIE_SESSION, hacherJeton, verifierSession } from "@/lib/session";
import { roleAutorise, type Permission } from "@/lib/permissions";
import type { Role } from "@/generated/prisma/enums";

/**
 * COUCHE D'ACCÈS AUX DONNÉES (Data Access Layer).
 *
 * Point d'entrée unique de l'authentification et du cloisonnement entre artisans.
 * Deux règles valables pour toutes les phases suivantes :
 *
 *  1. Aucune page, aucune Server Action ne lit la session ailleurs qu'ici.
 *  2. Toute requête sur une table métier est filtrée par l'`organizationId` issu
 *     du contexte retourné par ce module — jamais par un identifiant venu du
 *     client, qui serait falsifiable.
 *
 * Le contrôle est fait au plus près de la donnée, et non dans un layout : avec
 * le rendu partiel de Next.js, un layout n'est pas réexécuté à chaque navigation
 * et ne constitue donc pas une barrière d'autorisation fiable.
 */

export type ContexteTenant = {
  userId: string;
  email: string;
  nomComplet: string;
  organizationId: string;
  role: Role;
  sessionId: string;
};

/**
 * Résout la session courante, ou null.
 *
 * Mémoïsé par `cache()` sur la durée d'un rendu : plusieurs composants peuvent
 * l'appeler sans multiplier les requêtes.
 *
 * La vérification est double et les deux étapes sont nécessaires :
 *  - le jeton doit être signé et non expiré (contrôle cryptographique) ;
 *  - la session doit être active en base (contrôle de révocation).
 */
export const sessionCourante = cache(async (): Promise<ContexteTenant | null> => {
  const jeton = (await cookies()).get(COOKIE_SESSION)?.value;
  if (!jeton) return null;

  const contenu = await verifierSession(jeton);
  if (!contenu) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hacherJeton(jeton) },
    select: {
      id: true,
      userId: true,
      organizationId: true,
      expiresAt: true,
      revokedAt: true,
      user: { select: { email: true, nomComplet: true } },
    },
  });

  // Session inconnue, révoquée ou expirée : le cookie ne vaut rien.
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;

  // Le contenu du jeton doit correspondre à la session en base. Une divergence
  // signale un jeton forgé ou rejoué : on refuse.
  //
  // L'organisation est comparée elle aussi, alors même que la valeur utilisée
  // ensuite est systématiquement celle de la base : cela verrouille l'invariant
  // « le tenant ne vient jamais d'une donnée présentée par le client » au lieu
  // de le laisser reposer sur la vigilance des futurs contributeurs.
  if (
    session.id !== contenu.sid ||
    session.userId !== contenu.userId ||
    session.organizationId !== contenu.organizationId
  ) {
    return null;
  }

  // L'appartenance est revérifiée à chaque requête : un accès retiré prend effet
  // immédiatement, sans attendre l'expiration du cookie.
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.userId,
        organizationId: session.organizationId,
      },
    },
    select: { role: true },
  });
  if (!membership) return null;

  return {
    userId: session.userId,
    email: session.user.email,
    nomComplet: session.user.nomComplet,
    organizationId: session.organizationId,
    role: membership.role,
    sessionId: session.id,
  };
});

/** Contexte tenant, ou redirection vers la connexion. À utiliser dans les pages protégées. */
export async function exigerSession(): Promise<ContexteTenant> {
  const contexte = await sessionCourante();
  if (!contexte) redirect("/connexion");
  return contexte;
}

/**
 * Contexte tenant avec vérification d'une permission.
 *
 * Lève une erreur plutôt que de rediriger : une action refusée n'est pas un
 * problème d'authentification mais d'autorisation, et doit être traitée comme
 * une anomalie par l'appelant.
 */
export async function exigerPermission(permission: Permission): Promise<ContexteTenant> {
  const contexte = await exigerSession();
  if (!roleAutorise(contexte.role, permission)) {
    throw new ErreurPermission(permission);
  }
  return contexte;
}

export class ErreurPermission extends Error {
  constructor(permission: Permission) {
    super(`Permission requise : ${permission}`);
    this.name = "ErreurPermission";
  }
}

/**
 * Organisation courante.
 *
 * Ne prend délibérément aucun paramètre : l'organisation est toujours celle de
 * la session. C'est ce qui empêche structurellement qu'un identifiant fourni par
 * le client serve à lire les données d'un autre artisan.
 */
export async function organisationCourante() {
  const { organizationId } = await exigerPermission("organisation:lire");
  const organisation = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  // Incohérent : la session pointe une organisation supprimée.
  if (!organisation) redirect("/connexion");
  return organisation;
}

/** Sessions actives de l'utilisateur courant, la plus récente d'abord. */
export async function sessionsActives() {
  const { userId } = await exigerSession();
  return prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, createdAt: true, lastSeenAt: true, appareil: true },
    orderBy: { lastSeenAt: "desc" },
  });
}
