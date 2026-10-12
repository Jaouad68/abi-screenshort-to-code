"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";
import { journaliser } from "@/lib/audit";
import { hacherJeton } from "@/lib/session";
import { DUREE_ACCES_JOURS, genererJetonPortail } from "@/lib/portail";

export type EtatAcces = { erreur?: string; succes?: string; lien?: string };

/**
 * Crée un lien d'accès au portail.
 *
 * Le jeton en clair n'est retourné QU'UNE FOIS, à la création : la base n'en
 * conserve que l'empreinte. C'est la contrepartie du stockage haché — et la
 * raison pour laquelle l'écran invite à le copier tout de suite.
 */
export async function creerAccesPortail(
  _precedent: EtatAcces,
  donnees: FormData,
): Promise<EtatAcces> {
  const { organizationId, userId } = await exigerPermission("portail:gerer");
  const clientId = String(donnees.get("clientId") ?? "");

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId },
    select: { id: true },
  });
  if (!client) return { erreur: "Ce client est introuvable." };

  // Un seul lien actif à la fois : deux liens vivants pour un même client
  // doubleraient la surface sans rien apporter.
  await prisma.clientAccess.updateMany({
    where: { clientId, organizationId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const jeton = genererJetonPortail();
  const expiresAt = new Date(Date.now() + DUREE_ACCES_JOURS * 24 * 3600 * 1000);

  await prisma.clientAccess.create({
    data: { tokenHash: hacherJeton(jeton), clientId, organizationId, expiresAt },
  });

  await journaliser({
    action: "portal.access_created",
    organizationId,
    actorUserId: userId,
    entityType: "Client",
    entityId: clientId,
  });

  const base = process.env["NEXT_PUBLIC_BASE_URL"] ?? "";
  revalidatePath(`/app/clients/${clientId}`);
  return { succes: "Lien créé.", lien: `${base}/portail/${jeton}` };
}

export async function revoquerAccesPortail(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("portail:gerer");
  const clientId = String(donnees.get("clientId") ?? "");

  await prisma.clientAccess.updateMany({
    where: { clientId, organizationId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await journaliser({
    action: "portal.access_revoked",
    organizationId,
    actorUserId: userId,
    entityType: "Client",
    entityId: clientId,
  });

  revalidatePath(`/app/clients/${clientId}`);
}
