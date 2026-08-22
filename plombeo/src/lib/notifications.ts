import "server-only";
import { prisma } from "@/lib/prisma";
import { exigerPermission, sessionCourante } from "@/lib/dal";

/** Accès aux notifications et à la file d'envoi (Phase 7). */

export async function listerNotifications(inclureLues = false) {
  const { organizationId } = await exigerPermission("notification:lire");
  return prisma.notification.findMany({
    where: { organizationId, ...(inclureLues ? {} : { lueLe: null }) },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

/**
 * Compteur affiché dans l'en-tête.
 *
 * Ne lève jamais : l'en-tête est rendu sur toutes les pages, y compris pour un
 * rôle sans la permission. Une pastille absente vaut mieux qu'une page en
 * erreur.
 */
export async function compterNotificationsNonLues(): Promise<number> {
  const contexte = await sessionCourante();
  if (!contexte) return 0;
  return prisma.notification.count({
    where: { organizationId: contexte.organizationId, lueLe: null },
  });
}

export async function listerRegles() {
  const { organizationId } = await exigerPermission("automatisation:lire");
  return prisma.automationRule.findMany({
    where: { organizationId },
    orderBy: [{ declencheur: "asc" }, { delaiJours: "asc" }],
  });
}

export async function listerExecutions(limite = 50) {
  const { organizationId } = await exigerPermission("automatisation:lire");
  return prisma.automationExecution.findMany({
    where: { organizationId },
    orderBy: { executeeLe: "desc" },
    take: limite,
  });
}

export async function listerEmails(limite = 50) {
  const { organizationId } = await exigerPermission("automatisation:lire");
  return prisma.emailMessage.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limite,
  });
}

export async function listerModeles() {
  const { organizationId } = await exigerPermission("automatisation:lire");
  return prisma.modeleMessage.findMany({ where: { organizationId } });
}
