import "server-only";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";
import { encoreCouvert, etatEcheance, finGarantie, prochaineEcheance } from "@/lib/contrats";

/** Accès aux contrats et garanties (Phase 13). */

export async function listerContrats() {
  const { organizationId } = await exigerPermission("contrat:lire");
  const contrats = await prisma.maintenanceContract.findMany({
    where: { organizationId },
    orderBy: [{ statut: "asc" }, { debutLe: "asc" }],
    include: {
      client: { select: { id: true, nomAffichage: true } },
      property: { select: { id: true, libelle: true } },
    },
    take: 200,
  });

  const maintenant = new Date();
  return contrats.map((c) => {
    const echeance = prochaineEcheance(c);
    return { ...c, echeance, etat: etatEcheance(echeance, maintenant) };
  });
}

export async function contratsDuClient(clientId: string) {
  const { organizationId } = await exigerPermission("contrat:lire");
  const contrats = await prisma.maintenanceContract.findMany({
    where: { clientId, organizationId },
    orderBy: { debutLe: "desc" },
  });
  const maintenant = new Date();
  return contrats.map((c) => {
    const echeance = prochaineEcheance(c);
    return { ...c, echeance, etat: etatEcheance(echeance, maintenant) };
  });
}

export async function garantiesDuClient(clientId: string) {
  const { organizationId } = await exigerPermission("contrat:lire");
  const garanties = await prisma.warranty.findMany({
    where: { clientId, organizationId },
    orderBy: { debutLe: "desc" },
  });
  const maintenant = new Date();
  return garanties.map((g) => ({
    ...g,
    finLe: finGarantie(g.debutLe, g.dureeMois),
    couvert: encoreCouvert(g, maintenant),
  }));
}
