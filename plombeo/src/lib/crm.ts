import "server-only";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";
import type { Prisma } from "@/generated/prisma/client";

/**
 * COUCHE D'ACCÈS CRM (Phase 2).
 *
 * Prolonge src/lib/dal.ts pour les clients, logements et équipements. Deux
 * invariants, hérités de la Phase 1 et valables sans exception :
 *
 *  1. L'organisation vient TOUJOURS de la session, jamais d'un paramètre.
 *  2. Tout identifiant reçu du client (clientId, propertyId...) est revalidé
 *     contre cette organisation. Un identifiant valide chez un autre artisan
 *     doit se comporter exactement comme un identifiant inexistant — d'où les
 *     `findFirst({ where: { id, organizationId } })` plutôt que `findUnique`.
 *
 * Le point 2 est la raison pour laquelle ces fonctions existent : sans elles,
 * chaque écran devrait penser à filtrer, et un oubli suffirait à ouvrir une
 * fuite entre artisans.
 */

/* -------------------------------------------------------------------------- */
/* Recherche                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Construit la clause de recherche d'un client.
 *
 * Fonction pure et exportée pour être testable sans base de données.
 * Une recherche vide ne filtre rien (retourne `undefined`) plutôt que de
 * produire une clause qui ne correspondrait à rien.
 */
export function clauseRecherche(terme: string): Prisma.ClientWhereInput | undefined {
  const q = terme.trim();
  if (!q) return undefined;

  const contient = { contains: q, mode: "insensitive" as const };
  return {
    OR: [
      { nomAffichage: contient },
      { raisonSociale: contient },
      { prenom: contient },
      { nom: contient },
      { email: contient },
      { telephone: contient },
      { ville: contient },
      // Un artisan cherche aussi bien « Martin » que « rue des Lilas ».
      { properties: { some: { OR: [{ adresse: contient }, { ville: contient }, { libelle: contient }] } } },
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* Clients                                                                    */
/* -------------------------------------------------------------------------- */

export async function listerClients(options: { recherche?: string; inclureArchives?: boolean } = {}) {
  const { organizationId } = await exigerPermission("client:lire");

  const where: Prisma.ClientWhereInput = {
    organizationId,
    ...(options.inclureArchives ? {} : { archivedAt: null }),
    ...(clauseRecherche(options.recherche ?? "") ?? {}),
  };

  return prisma.client.findMany({
    where,
    orderBy: { nomAffichage: "asc" },
    select: {
      id: true,
      type: true,
      nomAffichage: true,
      telephone: true,
      email: true,
      ville: true,
      archivedAt: true,
      _count: { select: { properties: true } },
    },
    take: 200,
  });
}

export async function compterClients(): Promise<number> {
  const { organizationId } = await exigerPermission("client:lire");
  return prisma.client.count({ where: { organizationId, archivedAt: null } });
}

/** Fiche client complète, ou null si elle n'existe pas dans cette organisation. */
export async function lireClient(id: string) {
  const { organizationId } = await exigerPermission("client:lire");
  return prisma.client.findFirst({
    where: { id, organizationId },
    include: {
      properties: {
        where: { archivedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          libelle: true,
          type: true,
          adresse: true,
          codePostal: true,
          ville: true,
          _count: { select: { equipments: true } },
        },
      },
      consents: true,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Logements                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Vérifie qu'un client appartient bien à l'organisation courante.
 * À appeler avant toute écriture rattachée à un client.
 */
export async function verifierClientAccessible(clientId: string): Promise<boolean> {
  const { organizationId } = await exigerPermission("client:lire");
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId },
    select: { id: true },
  });
  return client !== null;
}

export async function lireLogement(id: string) {
  const { organizationId } = await exigerPermission("client:lire");
  return prisma.property.findFirst({
    where: { id, organizationId },
    include: {
      client: { select: { id: true, nomAffichage: true } },
      equipments: { orderBy: [{ categorie: "asc" }, { createdAt: "asc" }] },
    },
  });
}

export async function verifierLogementAccessible(propertyId: string): Promise<boolean> {
  const { organizationId } = await exigerPermission("client:lire");
  const logement = await prisma.property.findFirst({
    where: { id: propertyId, organizationId },
    select: { id: true },
  });
  return logement !== null;
}

/* -------------------------------------------------------------------------- */
/* Équipements                                                                */
/* -------------------------------------------------------------------------- */

export async function lireEquipement(id: string) {
  const { organizationId } = await exigerPermission("client:lire");
  return prisma.equipment.findFirst({ where: { id, organizationId } });
}

/* -------------------------------------------------------------------------- */
/* Export                                                                     */
/* -------------------------------------------------------------------------- */

/** Données brutes de l'export client (§79 portabilité, et droit d'accès RGPD). */
export async function donneesExportClients() {
  const { organizationId } = await exigerPermission("client:exporter");
  return prisma.client.findMany({
    where: { organizationId },
    orderBy: { nomAffichage: "asc" },
    include: {
      properties: { select: { libelle: true, adresse: true, codePostal: true, ville: true } },
      consents: { select: { type: true, accorde: true } },
    },
  });
}
