import "server-only";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";

/**
 * ÉQUIPE — lectures (Phase 14).
 *
 * Comme partout : l'`organizationId` vient de la session, jamais d'un paramètre.
 * Une liste de membres filtrée par un identifiant fourni par le client serait un
 * annuaire ouvert sur les autres artisans.
 */

export async function listerMembres() {
  const { organizationId } = await exigerPermission("organisation:lire");
  return prisma.membership.findMany({
    where: { organizationId },
    select: {
      id: true,
      role: true,
      createdAt: true,
      userId: true,
      user: { select: { email: true, nomComplet: true, totpActifLe: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

/** Invitations encore ouvertes : ni acceptées, ni révoquées, ni périmées. */
export async function listerInvitationsEnAttente() {
  const { organizationId } = await exigerPermission("membre:inviter");
  return prisma.invitation.findMany({
    where: {
      organizationId,
      accepteeLe: null,
      revokeeLe: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, email: true, role: true, expiresAt: true, parEmail: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Abonnement de l'organisation, ou `null`.
 *
 * Aucun encaissement n'existe dans Plombéo : cette lecture porte un état, pas un
 * paiement (§76). Voir l'écran, qui le dit explicitement.
 */
export async function abonnementCourant() {
  const { organizationId } = await exigerPermission("organisation:lire");
  return prisma.subscription.findUnique({
    where: { organizationId },
    select: {
      etat: true,
      debutLe: true,
      finLe: true,
      plan: { select: { libelle: true, maxUtilisateurs: true } },
    },
  });
}
