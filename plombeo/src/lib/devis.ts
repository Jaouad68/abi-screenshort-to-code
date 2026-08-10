import "server-only";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";
import { calculerTotaux, type Totaux } from "@/lib/calcul";
import type { DevisStatut } from "@/generated/prisma/enums";

/**
 * COUCHE D'ACCÈS DEVIS ET CATALOGUE (Phase 4).
 *
 * Mêmes invariants qu'aux phases précédentes : l'organisation vient de la
 * session, tout identifiant reçu est revalidé contre elle.
 */

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                  */
/* -------------------------------------------------------------------------- */

export async function listerPrestations(inclureArchives = false) {
  const { organizationId } = await exigerPermission("catalogue:lire");
  return prisma.service.findMany({
    where: { organizationId, ...(inclureArchives ? {} : { archivedAt: null }) },
    orderBy: { libelle: "asc" },
  });
}

export async function listerFournitures(inclureArchives = false) {
  const { organizationId } = await exigerPermission("catalogue:lire");
  return prisma.product.findMany({
    where: { organizationId, ...(inclureArchives ? {} : { archivedAt: null }) },
    orderBy: { libelle: "asc" },
  });
}

/* -------------------------------------------------------------------------- */
/* Devis                                                                      */
/* -------------------------------------------------------------------------- */

export async function listerDevis(statut?: DevisStatut) {
  const { organizationId } = await exigerPermission("devis:lire");
  const devis = await prisma.quote.findMany({
    where: { organizationId, ...(statut ? { statut } : {}) },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, nomAffichage: true } },
      options: { include: { lignes: true }, orderBy: { ordre: "asc" } },
    },
    take: 200,
  });

  // Le total affiché en liste est celui de la PREMIÈRE proposition : c'est
  // l'offre de référence quand il y a des variantes.
  return devis.map((d) => ({
    ...d,
    totaux: totauxOption(d.options[0]),
  }));
}

export async function lireDevis(id: string) {
  const { organizationId } = await exigerPermission("devis:lire");
  return prisma.quote.findFirst({
    where: { id, organizationId },
    include: {
      client: true,
      property: true,
      options: {
        orderBy: { ordre: "asc" },
        include: { lignes: { orderBy: { ordre: "asc" } } },
      },
    },
  });
}

type OptionAvecLignes = {
  remisePourMille: number;
  acomptePourMille: number;
  lignes: { quantiteMilli: number; prixUnitaireCents: number; tauxTvaCentiemes: number }[];
} | undefined;

/** Totaux d'une proposition, ou totaux vides si elle n'existe pas. */
export function totauxOption(option: OptionAvecLignes): Totaux {
  if (!option) return calculerTotaux([]);
  return calculerTotaux(option.lignes, option.remisePourMille, option.acomptePourMille);
}

export async function compterDevisEnCours(): Promise<number> {
  const { organizationId } = await exigerPermission("devis:lire");
  return prisma.quote.count({
    where: { organizationId, statut: { in: ["BROUILLON", "PRET", "ENVOYE"] } },
  });
}

/* -------------------------------------------------------------------------- */
/* Numérotation                                                               */
/* -------------------------------------------------------------------------- */

/** Format du numéro : DEV-2026-001. Fonction pure, testée. */
export function formaterNumeroDevis(annee: number, sequence: number): string {
  return `DEV-${annee}-${String(sequence).padStart(3, "0")}`;
}

/**
 * Attribue le prochain numéro de devis.
 *
 * L'incrément se fait en base, dans une transaction, sur une ligne unique par
 * (organisation, année) : deux devis passés en PRET au même instant obtiennent
 * ainsi deux numéros distincts. Un compteur calculé par `count()` ou lu puis
 * réécrit en deux temps donnerait des doublons dès la moindre concurrence.
 *
 * La séquence repart à 1 chaque année.
 */
export async function attribuerNumero(organizationId: string, date = new Date()): Promise<string> {
  const annee = date.getFullYear();

  const compteur = await prisma.compteurDevis.upsert({
    where: { organizationId_annee: { organizationId, annee } },
    create: { organizationId, annee, dernier: 1 },
    // `increment` est atomique côté base : c'est ce qui rend l'opération sûre
    // sans verrou applicatif.
    update: { dernier: { increment: 1 } },
    select: { dernier: true },
  });

  return formaterNumeroDevis(annee, compteur.dernier);
}

/* -------------------------------------------------------------------------- */
/* Validité                                                                   */
/* -------------------------------------------------------------------------- */

/** Date d'expiration d'un devis. Fonction pure. */
export function dateExpiration(dateDevis: Date, validiteJours: number): Date {
  const expiration = new Date(dateDevis);
  expiration.setDate(expiration.getDate() + validiteJours);
  return expiration;
}

/**
 * Un devis est-il dépassé ?
 *
 * Purement indicatif en Phase 4 : l'état n'est pas modifié automatiquement.
 * Le passage effectif en EXPIRE relèvera du moteur d'automatisation (Phase 7),
 * qui est le seul endroit où une transition d'état doit pouvoir se déclencher
 * sans action humaine.
 */
export function estDepasse(
  devis: { dateDevis: Date; validiteJours: number; statut: DevisStatut },
  maintenant = new Date(),
): boolean {
  if (devis.statut !== "ENVOYE" && devis.statut !== "PRET") return false;
  return dateExpiration(devis.dateDevis, devis.validiteJours) < maintenant;
}
