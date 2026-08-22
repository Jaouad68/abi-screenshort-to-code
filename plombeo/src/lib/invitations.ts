import "server-only";
import { prisma } from "@/lib/prisma";
import { hacherJeton } from "@/lib/session";

/**
 * INVITATIONS — résolution d'un jeton (Phase 14).
 *
 * Même principe que le portail client (Phase 10) : la base ne stocke que
 * l'empreinte du jeton, et un jeton inconnu, révoqué, expiré ou déjà utilisé
 * donne exactement la même réponse — `null`. Distinguer ces cas renseignerait
 * sur l'existence d'une invitation, donc sur celle d'une entreprise et d'une
 * adresse.
 */

export type InvitationResolue = {
  id: string;
  email: string;
  role: import("@/generated/prisma/enums").Role;
  organizationId: string;
  nomEntreprise: string;
  parEmail: string;
  /** Un compte porte-t-il déjà cette adresse ? Change l'écran, pas le rôle. */
  compteExistant: boolean;
};

export async function resoudreInvitation(jeton: string): Promise<InvitationResolue | null> {
  if (!jeton) return null;

  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hacherJeton(jeton) },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      accepteeLe: true,
      revokeeLe: true,
      parEmail: true,
      organizationId: true,
      organization: { select: { nom: true } },
    },
  });

  if (!invitation) return null;
  if (invitation.accepteeLe || invitation.revokeeLe) return null;
  if (invitation.expiresAt <= new Date()) return null;

  const compte = await prisma.user.findUnique({
    where: { email: invitation.email },
    select: { id: true },
  });

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    organizationId: invitation.organizationId,
    nomEntreprise: invitation.organization.nom,
    parEmail: invitation.parEmail,
    compteExistant: Boolean(compte),
  };
}
