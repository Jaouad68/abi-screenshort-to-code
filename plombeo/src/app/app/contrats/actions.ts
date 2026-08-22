"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";
import { journaliser } from "@/lib/audit";
import { versCentimes } from "@/lib/calcul";
import type { PeriodiciteContrat, StatutContrat } from "@/generated/prisma/enums";

export type EtatContrat = { erreur?: string; succes?: string; tentative?: number };

function texte(donnees: FormData, champ: string): string {
  const v = donnees.get(champ);
  return typeof v === "string" ? v.trim() : "";
}

const PERIODICITES: PeriodiciteContrat[] = [
  "MENSUELLE",
  "TRIMESTRIELLE",
  "SEMESTRIELLE",
  "ANNUELLE",
  "BIENNALE",
];
const STATUTS: StatutContrat[] = ["ACTIF", "SUSPENDU", "RESILIE"];

export async function creerContrat(
  precedent: EtatContrat,
  donnees: FormData,
): Promise<EtatContrat> {
  const { organizationId, userId } = await exigerPermission("contrat:modifier");
  const suite = (precedent.tentative ?? 0) + 1;

  const libelle = texte(donnees, "libelle");
  if (!libelle) return { erreur: "Donnez un intitulé au contrat.", tentative: suite };

  const clientId = texte(donnees, "clientId");
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId },
    select: { id: true },
  });
  if (!client) return { erreur: "Choisissez un client.", tentative: suite };

  const periodiciteSaisie = texte(donnees, "periodicite") as PeriodiciteContrat;
  const periodicite = PERIODICITES.includes(periodiciteSaisie) ? periodiciteSaisie : "ANNUELLE";

  const debutSaisi = texte(donnees, "debutLe");
  const debutLe = debutSaisi ? new Date(debutSaisi) : new Date();
  if (Number.isNaN(debutLe.getTime())) {
    return { erreur: "Date de début invalide.", tentative: suite };
  }

  // Le montant est SAISI. Plombéo ne facture pas tout seul : l'échéance produit
  // une notification, jamais une facture (Phase 5, §14).
  const montant = versCentimes(texte(donnees, "montant"));

  const contrat = await prisma.maintenanceContract.create({
    data: {
      libelle: libelle.slice(0, 200),
      periodicite,
      debutLe,
      montantTtcCents: montant !== null && montant >= 0 ? montant : 0,
      notes: texte(donnees, "notes").slice(0, 2000),
      clientId: client.id,
      organizationId,
    },
    select: { id: true },
  });

  await journaliser({
    action: "contract.created",
    organizationId,
    actorUserId: userId,
    entityType: "MaintenanceContract",
    entityId: contrat.id,
  });

  revalidatePath("/app/contrats");
  revalidatePath(`/app/clients/${client.id}`);
  return { succes: "Contrat enregistré." };
}

export async function changerStatutContrat(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("contrat:modifier");
  const id = texte(donnees, "id");
  const versSaisi = texte(donnees, "vers") as StatutContrat;
  if (!STATUTS.includes(versSaisi)) return;

  await prisma.maintenanceContract.updateMany({
    where: { id, organizationId },
    data: { statut: versSaisi, ...(versSaisi === "RESILIE" ? { finLe: new Date() } : {}) },
  });

  await journaliser({
    action: "contract.updated",
    organizationId,
    actorUserId: userId,
    entityType: "MaintenanceContract",
    entityId: id,
    metadata: { statut: versSaisi },
  });

  revalidatePath("/app/contrats");
}

/**
 * Enregistre une visite RÉELLEMENT effectuée.
 *
 * C'est le seul geste qui fait avancer l'échéance. Plombéo ne coche jamais une
 * visite de lui-même : un contrat « à jour » sans qu'aucun technicien ne soit
 * passé serait pire qu'un contrat en retard.
 */
export async function enregistrerVisite(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("contrat:modifier");
  const id = texte(donnees, "id");

  const dateSaisie = texte(donnees, "date");
  const date = dateSaisie ? new Date(dateSaisie) : new Date();
  if (Number.isNaN(date.getTime())) return;

  await prisma.maintenanceContract.updateMany({
    where: { id, organizationId, statut: "ACTIF" },
    data: { derniereVisiteLe: date },
  });

  await journaliser({
    action: "contract.visit_recorded",
    organizationId,
    actorUserId: userId,
    entityType: "MaintenanceContract",
    entityId: id,
  });

  revalidatePath("/app/contrats");
}

export async function creerGarantie(
  precedent: EtatContrat,
  donnees: FormData,
): Promise<EtatContrat> {
  const { organizationId, userId } = await exigerPermission("contrat:modifier");
  const suite = (precedent.tentative ?? 0) + 1;

  const libelle = texte(donnees, "libelle");
  if (!libelle) return { erreur: "Donnez un intitulé à la garantie.", tentative: suite };

  const clientId = texte(donnees, "clientId");
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId },
    select: { id: true },
  });
  if (!client) return { erreur: "Client introuvable.", tentative: suite };

  const debutSaisi = texte(donnees, "debutLe");
  const debutLe = debutSaisi ? new Date(debutSaisi) : new Date();
  if (Number.isNaN(debutLe.getTime())) return { erreur: "Date de début invalide.", tentative: suite };

  // AUCUNE durée par défaut : suggérer « 2 ans » ou « 10 ans » serait déjà un
  // conseil juridique. L'artisan saisit ce que son contrat prévoit.
  const dureeMois = Number.parseInt(texte(donnees, "dureeMois"), 10);
  if (!Number.isFinite(dureeMois) || dureeMois <= 0 || dureeMois > 600) {
    return { erreur: "Indiquez la durée en mois, telle que votre contrat la prévoit.", tentative: suite };
  }

  await prisma.warranty.create({
    data: {
      libelle: libelle.slice(0, 200),
      debutLe,
      dureeMois,
      precisions: texte(donnees, "precisions").slice(0, 2000),
      clientId: client.id,
      organizationId,
    },
  });

  await journaliser({
    action: "warranty.created",
    organizationId,
    actorUserId: userId,
    entityType: "Warranty",
    entityId: client.id,
  });

  revalidatePath(`/app/clients/${client.id}`);
  return { succes: "Garantie enregistrée." };
}
