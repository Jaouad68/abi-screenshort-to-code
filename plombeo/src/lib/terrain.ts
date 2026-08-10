import "server-only";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";

/**
 * COUCHE D'ACCÈS TERRAIN (Phase 3) — demandes, rendez-vous, interventions.
 *
 * Mêmes invariants qu'en Phase 2 : l'organisation vient de la session, et tout
 * identifiant reçu du client est revalidé contre elle (`findFirst` avec le
 * filtre, jamais `findUnique` sur le seul identifiant).
 */

/* -------------------------------------------------------------------------- */
/* Bornes de journée                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Début et fin d'une journée civile.
 *
 * Fonction pure et exportée pour être testable. Note assumée : le calcul se fait
 * dans le fuseau du serveur. L'application ne cible que la France métropolitaine
 * (§H2) ; un support multi-fuseaux exigerait de stocker le fuseau de
 * l'organisation, ce qui n'a pas lieu d'être ici.
 */
export function bornesDuJour(date: Date): { debut: Date; fin: Date } {
  const debut = new Date(date);
  debut.setHours(0, 0, 0, 0);
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + 1);
  return { debut, fin };
}

/* -------------------------------------------------------------------------- */
/* Demandes                                                                   */
/* -------------------------------------------------------------------------- */

export async function listerDemandes(inclureTerminees = false) {
  const { organizationId } = await exigerPermission("intervention:lire");
  return prisma.lead.findMany({
    where: {
      organizationId,
      ...(inclureTerminees ? {} : { statut: { in: ["NOUVEAU", "QUALIFIE"] } }),
    },
    // Les urgences remontent en tête : c'est ce que l'artisan doit voir d'abord.
    orderBy: [{ urgence: "desc" }, { createdAt: "desc" }],
    include: { client: { select: { id: true, nomAffichage: true } } },
    take: 200,
  });
}

export async function lireDemande(id: string) {
  const { organizationId } = await exigerPermission("intervention:lire");
  return prisma.lead.findFirst({
    where: { id, organizationId },
    include: {
      client: { select: { id: true, nomAffichage: true } },
      property: { select: { id: true, libelle: true, adresse: true, ville: true } },
    },
  });
}

export async function compterDemandesOuvertes(): Promise<number> {
  const { organizationId } = await exigerPermission("intervention:lire");
  return prisma.lead.count({
    where: { organizationId, statut: { in: ["NOUVEAU", "QUALIFIE"] } },
  });
}

/* -------------------------------------------------------------------------- */
/* Rendez-vous                                                                */
/* -------------------------------------------------------------------------- */

export async function listerRendezVousDuJour(date: Date) {
  const { organizationId } = await exigerPermission("intervention:lire");
  const { debut, fin } = bornesDuJour(date);

  return prisma.appointment.findMany({
    where: { organizationId, debut: { gte: debut, lt: fin } },
    orderBy: { debut: "asc" },
    include: {
      client: { select: { id: true, nomAffichage: true, telephone: true } },
      property: { select: { id: true, adresse: true, codePostal: true, ville: true } },
      intervention: { select: { id: true, statut: true } },
    },
  });
}

/** Prochain rendez-vous à venir — la réponse à « que dois-je faire maintenant ? » (§74). */
export async function prochainRendezVous() {
  const { organizationId } = await exigerPermission("intervention:lire");
  return prisma.appointment.findFirst({
    where: {
      organizationId,
      statut: { in: ["PLANIFIE", "CONFIRME", "EN_COURS"] },
      fin: { gte: new Date() },
    },
    orderBy: { debut: "asc" },
    include: {
      client: { select: { id: true, nomAffichage: true, telephone: true } },
      property: { select: { adresse: true, codePostal: true, ville: true } },
      intervention: { select: { id: true, statut: true } },
    },
  });
}

export async function lireRendezVous(id: string) {
  const { organizationId } = await exigerPermission("intervention:lire");
  return prisma.appointment.findFirst({
    where: { id, organizationId },
    include: {
      client: { select: { id: true, nomAffichage: true, telephone: true } },
      property: { select: { id: true, adresse: true, codePostal: true, ville: true } },
      intervention: { select: { id: true, statut: true } },
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Interventions                                                              */
/* -------------------------------------------------------------------------- */

export async function lireIntervention(id: string) {
  const { organizationId } = await exigerPermission("intervention:lire");
  return prisma.intervention.findFirst({
    where: { id, organizationId },
    include: {
      client: { select: { id: true, nomAffichage: true, telephone: true } },
      property: {
        select: {
          id: true,
          libelle: true,
          adresse: true,
          codePostal: true,
          ville: true,
          etage: true,
          digicode: true,
          instructionsAcces: true,
        },
      },
      equipment: { select: { id: true, categorie: true, marque: true, modele: true } },
      taches: { orderBy: { ordre: "asc" } },
      temps: { orderBy: { createdAt: "asc" } },
      fournitures: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function listerInterventionsEnCours() {
  const { organizationId } = await exigerPermission("intervention:lire");
  return prisma.intervention.findMany({
    where: { organizationId, statut: "EN_COURS" },
    orderBy: { demarreeLe: "asc" },
    include: { client: { select: { id: true, nomAffichage: true } } },
  });
}

// Le formatage (durées, quantités, dates) vit dans src/lib/format.ts : ce
// module-ci est `server-only`, or les mêmes formats sont nécessaires dans le
// composant de saisie de chantier, qui tourne dans le navigateur.
