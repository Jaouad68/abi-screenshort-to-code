import "server-only";
import { prisma } from "@/lib/prisma";
// Réexportées depuis `numerotation.ts` : ce module reste le point d'entrée de
// la facturation, mais les fonctions qui ne dépendent que de la base y vivent
// désormais séparément, pour rester utilisables hors requête HTTP.
import { calculerEmpreinte } from "@/lib/numerotation";
export {
  attribuerNumeroFacture,
  calculerEmpreinte,
  formaterNumeroFacture,
  type ContenuFacture,
} from "@/lib/numerotation";
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
