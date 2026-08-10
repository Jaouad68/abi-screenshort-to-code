import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";

/**
 * ACCÈS AUX DOCUMENTS ET SIGNATURES (Phase 6).
 *
 * Mêmes invariants que partout : l'organisation vient de la session, tout
 * identifiant reçu est revalidé contre elle.
 */

export type Rattachement = {
  clientId?: string | null;
  propertyId?: string | null;
  interventionId?: string | null;
  quoteId?: string | null;
  invoiceId?: string | null;
};

export async function listerDocuments(rattachement: Rattachement = {}, recherche = "") {
  const { organizationId } = await exigerPermission("document:lire");
  const q = recherche.trim();

  return prisma.document.findMany({
    where: {
      organizationId,
      archivedAt: null,
      ...(rattachement.clientId ? { clientId: rattachement.clientId } : {}),
      ...(rattachement.propertyId ? { propertyId: rattachement.propertyId } : {}),
      ...(rattachement.interventionId ? { interventionId: rattachement.interventionId } : {}),
      ...(rattachement.quoteId ? { quoteId: rattachement.quoteId } : {}),
      ...(rattachement.invoiceId ? { invoiceId: rattachement.invoiceId } : {}),
      ...(q
        ? {
            OR: [
              { nomFichier: { contains: q, mode: "insensitive" as const } },
              { legende: { contains: q, mode: "insensitive" as const } },
              { tags: { has: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

/** Document accessible, ou null s'il appartient à un autre artisan. */
export async function lireDocument(id: string) {
  const { organizationId } = await exigerPermission("document:lire");
  return prisma.document.findFirst({ where: { id, organizationId } });
}

export async function listerSignatures(interventionId: string) {
  const { organizationId } = await exigerPermission("document:lire");
  return prisma.signature.findMany({
    where: { interventionId, organizationId },
    orderBy: { signeLe: "asc" },
  });
}

/**
 * Empreinte du contenu signé.
 *
 * C'est elle qui permet de démontrer, plus tard, que le document n'a pas changé
 * depuis la signature. Le résumé signé est également conservé en clair, pour
 * rester lisible sans dépendre de l'application.
 */
export function empreinteContenu(resume: string): string {
  return createHash("sha256").update(resume, "utf8").digest("hex");
}

/** Résumé lisible de ce qui est signé sur un bon d'intervention. */
export function resumerIntervention(intervention: {
  clientNom: string;
  adresse: string;
  probleme: string;
  diagnostic: string;
  compteRendu: string;
  minutes: number;
  fournitures: readonly { libelle: string; quantiteMilli: number; unite: string }[];
}): string {
  // Les rubriques non renseignées sont OMISES plutôt qu'affichées vides : le
  // client signe un texte, pas un formulaire à trous. Le temps et les
  // fournitures restent toujours présents — leur valeur nulle est une
  // information, pas une absence.
  const lignes: [string, string][] = [
    ["Client", intervention.clientNom],
    ["Adresse", intervention.adresse],
    ["Problème signalé", intervention.probleme],
    ["Diagnostic", intervention.diagnostic],
    ["Travaux réalisés", intervention.compteRendu],
  ];

  return [
    ...lignes.filter(([, v]) => v.trim()).map(([c, v]) => `${c} : ${v.trim()}`),
    `Temps passé : ${intervention.minutes} minutes`,
    `Fournitures : ${
      intervention.fournitures
        .map((f) => `${f.libelle} (${f.quantiteMilli / 1000} ${f.unite})`)
        .join(", ") || "aucune"
    }`,
  ].join("\n");
}
