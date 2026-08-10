import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";
import { calculerTotaux, type Totaux } from "@/lib/calcul";
import type { FactureStatut } from "@/generated/prisma/enums";

/**
 * FACTURATION (Phase 5).
 *
 * Règle centrale (§14) : une facture ÉMISE ne se modifie plus. Une erreur se
 * corrige par un avoir, jamais par réécriture.
 *
 * [À VÉRIFIER — SOURCE OFFICIELLE] Les obligations françaises exactes
 * (mentions, continuité de la numérotation, modalités de rectification, durée
 * de conservation) relèvent de sources officielles et de l'expert-comptable de
 * l'artisan. Plombéo fournit une structure conforme à la pratique courante ; il
 * ne certifie aucune conformité.
 */

/* -------------------------------------------------------------------------- */
/* Intégrité                                                                  */
/* -------------------------------------------------------------------------- */

export type ContenuFacture = {
  numero: string;
  dateFacture: Date;
  clientNom: string;
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
  lignes: {
    libelle: string;
    quantiteMilli: number;
    prixUnitaireCents: number;
    tauxTvaCentiemes: number;
  }[];
};

/**
 * Empreinte d'intégrité d'une facture.
 *
 * Mécanisme de DÉTECTION, pas de protection : il n'empêche pas une écriture
 * directe en base, il empêche qu'elle passe inaperçue. Toute divergence entre
 * l'empreinte stockée et l'empreinte recalculée est un incident, pas une
 * donnée d'affichage.
 *
 * La sérialisation est explicite et ordonnée : sérialiser un objet sans en
 * fixer l'ordre produirait des empreintes différentes pour un même contenu.
 */
export function calculerEmpreinte(contenu: ContenuFacture): string {
  const canonique = [
    contenu.numero,
    contenu.dateFacture.toISOString(),
    contenu.clientNom,
    String(contenu.totalHtCents),
    String(contenu.totalTvaCents),
    String(contenu.totalTtcCents),
    ...contenu.lignes.map((l) =>
      [l.libelle, l.quantiteMilli, l.prixUnitaireCents, l.tauxTvaCentiemes].join("|"),
    ),
  ].join("\n");

  return createHash("sha256").update(canonique, "utf8").digest("hex");
}

/* -------------------------------------------------------------------------- */
/* Soldes                                                                     */
/* -------------------------------------------------------------------------- */

export type SoldeFacture = {
  totalTtcCents: number;
  avoirsCents: number;
  /** Montant réellement dû, après avoirs. */
  duCents: number;
  paiementsCents: number;
  resteCents: number;
  /** Vrai si un paiement dépasse le montant dû — anomalie à signaler. */
  surPaye: boolean;
};

/** Calcule le solde d'une facture. Fonction pure, testée exhaustivement. */
export function calculerSolde(
  totalTtcCents: number,
  paiements: readonly { montantCents: number }[],
  avoirs: readonly { montantTtcCents: number }[] = [],
): SoldeFacture {
  const avoirsCents = avoirs.reduce((s, a) => s + a.montantTtcCents, 0);
  // Un avoir ne peut pas rendre le dû négatif : au-delà du total, il l'annule.
  const duCents = Math.max(0, totalTtcCents - avoirsCents);
  const paiementsCents = paiements.reduce((s, p) => s + p.montantCents, 0);

  return {
    totalTtcCents,
    avoirsCents,
    duCents,
    paiementsCents,
    resteCents: duCents - paiementsCents,
    surPaye: paiementsCents > duCents,
  };
}

/**
 * État dérivé des paiements.
 *
 * DÉRIVÉ, jamais saisi : un artisan ne doit pas pouvoir déclarer « payée » une
 * facture sans encaissement enregistré, sinon le suivi des impayés ne vaut rien.
 */
export function statutSelonPaiements(
  statutActuel: FactureStatut,
  solde: SoldeFacture,
): FactureStatut {
  // Un brouillon reste un brouillon : il n'a pas encore d'existence comptable.
  if (statutActuel === "BROUILLON") return "BROUILLON";

  if (solde.duCents === 0 || solde.resteCents <= 0) return "PAYEE";
  if (solde.paiementsCents > 0) return "PARTIELLEMENT_PAYEE";

  // Sans paiement, on conserve l'état d'avancement de l'envoi.
  return statutActuel === "PAYEE" || statutActuel === "PARTIELLEMENT_PAYEE"
    ? "EMISE"
    : statutActuel;
}

/** Une facture émise et échue reste-t-elle impayée ? Purement indicatif. */
export function estEnRetard(
  facture: { statut: FactureStatut; dateEcheance: Date | null },
  resteCents: number,
  maintenant = new Date(),
): boolean {
  if (facture.statut === "BROUILLON" || facture.statut === "PAYEE") return false;
  if (!facture.dateEcheance) return false;
  return resteCents > 0 && facture.dateEcheance < maintenant;
}

/* -------------------------------------------------------------------------- */
/* Numérotation                                                               */
/* -------------------------------------------------------------------------- */

export function formaterNumeroFacture(
  serie: "FACTURE" | "AVOIR",
  annee: number,
  sequence: number,
): string {
  const prefixe = serie === "AVOIR" ? "AV" : "FAC";
  return `${prefixe}-${annee}-${String(sequence).padStart(3, "0")}`;
}

/**
 * Attribue le prochain numéro. Factures et avoirs ont des séquences distinctes.
 *
 * Incrément atomique en base : deux émissions simultanées obtiennent deux
 * numéros différents. La continuité de la numérotation est une exigence
 * comptable [À VÉRIFIER — SOURCE OFFICIELLE], d'où l'attribution au moment de
 * l'émission seulement — numéroter des brouillons créerait des trous.
 */
export async function attribuerNumeroFacture(
  organizationId: string,
  serie: "FACTURE" | "AVOIR",
  date = new Date(),
): Promise<string> {
  const annee = date.getFullYear();

  const compteur = await prisma.compteurFacture.upsert({
    where: { organizationId_annee_serie: { organizationId, annee, serie } },
    create: { organizationId, annee, serie, dernier: 1 },
    update: { dernier: { increment: 1 } },
    select: { dernier: true },
  });

  return formaterNumeroFacture(serie, annee, compteur.dernier);
}

/* -------------------------------------------------------------------------- */
/* Accès                                                                      */
/* -------------------------------------------------------------------------- */

export async function listerFactures(statut?: FactureStatut) {
  const { organizationId } = await exigerPermission("facture:lire");
  const factures = await prisma.invoice.findMany({
    where: { organizationId, ...(statut ? { statut } : {}) },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, nomAffichage: true } },
      lignes: true,
      paiements: { select: { montantCents: true } },
      avoirs: { select: { montantTtcCents: true } },
    },
    take: 200,
  });

  return factures.map((f) => {
    const solde = calculerSolde(totalTtc(f), f.paiements, f.avoirs);
    return { ...f, solde, enRetard: estEnRetard(f, solde.resteCents) };
  });
}

export async function lireFacture(id: string) {
  const { organizationId } = await exigerPermission("facture:lire");
  return prisma.invoice.findFirst({
    where: { id, organizationId },
    include: {
      client: true,
      property: true,
      quote: { select: { id: true, numero: true } },
      lignes: { orderBy: { ordre: "asc" } },
      paiements: { orderBy: { datePaiement: "asc" } },
      avoirs: { orderBy: { dateAvoir: "asc" } },
    },
  });
}

/**
 * Total TTC d'une facture.
 *
 * Une facture ÉMISE renvoie ses totaux FIGÉS ; seul un brouillon est recalculé.
 * C'est ce qui garantit qu'une facture affiche demain exactement ce qu'elle
 * affichait le jour de son émission, même si le moteur de calcul évolue.
 */
export function totalTtc(facture: {
  statut: FactureStatut;
  totalTtcCents: number;
  lignes: readonly { quantiteMilli: number; prixUnitaireCents: number; tauxTvaCentiemes: number }[];
}): number {
  if (facture.statut !== "BROUILLON") return facture.totalTtcCents;
  return calculerTotaux(facture.lignes).totalTtcCents;
}

/** Totaux affichés : figés si émise, recalculés si brouillon. */
export function totauxFacture(facture: {
  statut: FactureStatut;
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
  detailTva: unknown;
  lignes: readonly { quantiteMilli: number; prixUnitaireCents: number; tauxTvaCentiemes: number }[];
}): Totaux {
  if (facture.statut === "BROUILLON") return calculerTotaux(facture.lignes);

  const detail = Array.isArray(facture.detailTva)
    ? (facture.detailTva as Totaux["tvaParTaux"])
    : [];

  return {
    baseHtCents: facture.totalHtCents,
    remiseCents: 0,
    totalHtCents: facture.totalHtCents,
    tvaParTaux: detail,
    totalTvaCents: facture.totalTvaCents,
    totalTtcCents: facture.totalTtcCents,
    acompteCents: 0,
    soldeCents: facture.totalTtcCents,
  };
}

export async function compterImpayees(): Promise<{ nombre: number; montantCents: number }> {
  const { organizationId } = await exigerPermission("facture:lire");
  const factures = await prisma.invoice.findMany({
    where: { organizationId, statut: { in: ["EMISE", "ENVOYEE", "PARTIELLEMENT_PAYEE"] } },
    include: {
      lignes: true,
      paiements: { select: { montantCents: true } },
      avoirs: { select: { montantTtcCents: true } },
    },
  });

  let montantCents = 0;
  let nombre = 0;
  for (const f of factures) {
    const solde = calculerSolde(totalTtc(f), f.paiements, f.avoirs);
    if (solde.resteCents > 0) {
      nombre += 1;
      montantCents += solde.resteCents;
    }
  }
  return { nombre, montantCents };
}

/**
 * Vérifie l'empreinte d'une facture émise.
 *
 * Retourne `null` si la facture n'a pas d'empreinte (brouillon), sinon vrai/faux.
 */
export function verifierIntegrite(facture: {
  numero: string | null;
  empreinte: string | null;
  dateFacture: Date;
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
  client: { nomAffichage: string };
  lignes: readonly {
    libelle: string;
    quantiteMilli: number;
    prixUnitaireCents: number;
    tauxTvaCentiemes: number;
  }[];
}): boolean | null {
  if (!facture.empreinte || !facture.numero) return null;

  const recalculee = calculerEmpreinte({
    numero: facture.numero,
    dateFacture: facture.dateFacture,
    clientNom: facture.client.nomAffichage,
    totalHtCents: facture.totalHtCents,
    totalTvaCents: facture.totalTvaCents,
    totalTtcCents: facture.totalTtcCents,
    lignes: [...facture.lignes],
  });

  return recalculee === facture.empreinte;
}
