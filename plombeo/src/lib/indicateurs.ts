import "server-only";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";
import { calculerSolde, totalTtc } from "@/lib/facturation";
import {
  rentabiliteChantier,
  type Periode,
  type ResultatRentabilite,
} from "@/lib/pilotage";

/**
 * INDICATEURS (Phase 9).
 *
 * Rien n'est stocké : tout se dérive des factures, paiements et achats. Un
 * module de pilotage qui tient ses propres agrégats finit par diverger de ses
 * sources, et c'est alors le tableau de bord qu'on croit plutôt que les
 * factures.
 */

export type Chiffres = {
  /** CONSTATÉ : factures émises sur la période. */
  factureCents: number;
  /** CONSTATÉ : paiements reçus sur la période. */
  encaisseCents: number;
  /** CONSTATÉ : achats validés sur la période. */
  achatsCents: number;
  nombreFactures: number;
  nombreAchats: number;
};

/**
 * Totaux d'une période.
 *
 * `factureCents` et `encaisseCents` sont DEUX MONTANTS DISTINCTS, jamais
 * fusionnés en un « chiffre d'affaires » : sa détermination dépend du régime de
 * l'entreprise et relève de l'expert-comptable [À VÉRIFIER — SOURCE OFFICIELLE].
 */
export async function chiffresPeriode(periode: Periode): Promise<Chiffres> {
  const { organizationId } = await exigerPermission("pilotage:lire");

  const [factures, paiements, achats] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        organizationId,
        statut: { not: "BROUILLON" },
        dateFacture: { gte: periode.debut, lt: periode.fin },
      },
      include: { lignes: true },
    }),
    prisma.payment.findMany({
      where: { organizationId, datePaiement: { gte: periode.debut, lt: periode.fin } },
      select: { montantCents: true },
    }),
    prisma.purchase.findMany({
      where: {
        organizationId,
        etat: "VALIDE",
        dateAchat: { gte: periode.debut, lt: periode.fin },
      },
      select: { totalHtCents: true },
    }),
  ]);

  return {
    factureCents: factures.reduce((s, f) => s + totalTtc(f), 0),
    encaisseCents: paiements.reduce((s, p) => s + p.montantCents, 0),
    achatsCents: achats.reduce((s, a) => s + a.totalHtCents, 0),
    nombreFactures: factures.length,
    nombreAchats: achats.length,
  };
}

/** Encours : ce qui est facturé et pas encore réglé, tous exercices confondus. */
export async function encours(): Promise<{ resteCents: number; nombre: number }> {
  const { organizationId } = await exigerPermission("pilotage:lire");

  const factures = await prisma.invoice.findMany({
    where: { organizationId, statut: { in: ["EMISE", "ENVOYEE", "PARTIELLEMENT_PAYEE"] } },
    include: {
      lignes: true,
      paiements: { select: { montantCents: true } },
      avoirs: { select: { montantTtcCents: true } },
    },
  });

  let resteCents = 0;
  let nombre = 0;
  for (const f of factures) {
    const solde = calculerSolde(totalTtc(f), f.paiements, f.avoirs);
    if (solde.resteCents > 0) {
      resteCents += solde.resteCents;
      nombre += 1;
    }
  }
  return { resteCents, nombre };
}

/* -------------------------------------------------------------------------- */
/* Rentabilité par chantier                                                   */
/* -------------------------------------------------------------------------- */

export type ChantierEvalue = {
  interventionId: string;
  clientNom: string;
  date: Date;
  resultat: ResultatRentabilite;
};

/**
 * Rentabilité des interventions clôturées et facturées.
 *
 * Chaque chantier porte son propre verdict : certains sont calculables, d'autres
 * non. Écarter les seconds en silence donnerait une moyenne flatteuse — ce sont
 * précisément les chantiers mal renseignés qui manquent au tableau.
 */
export async function rentabiliteChantiers(limite = 30): Promise<ChantierEvalue[]> {
  const { organizationId } = await exigerPermission("pilotage:lire");

  const organisation = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { coutHoraireCents: true },
  });
  const coutHoraireCents = organisation?.coutHoraireCents ?? 0;

  const interventions = await prisma.intervention.findMany({
    where: { organizationId, statut: "CLOTUREE" },
    orderBy: { clotureeLe: "desc" },
    include: {
      client: { select: { nomAffichage: true } },
      temps: { select: { minutes: true } },
      fournitures: { select: { libelle: true, quantiteMilli: true } },
      devis: { include: { factures: { include: { lignes: true } } } },
    },
    take: limite,
  });

  // Les prix d'achat viennent du catalogue, rapprochés par LIBELLÉ : la saisie
  // terrain (Phase 3) n'impose pas de choisir une référence, et l'alourdir pour
  // faire plaisir au module de pilotage serait un mauvais échange.
  const articles = await prisma.product.findMany({
    where: { organizationId },
    select: { libelle: true, prixAchatCents: true },
  });
  const prixParLibelle = new Map(
    articles.map((a) => [a.libelle.trim().toLowerCase(), a.prixAchatCents]),
  );

  return interventions.map((intervention) => {
    const produitCents = intervention.devis
      .flatMap((d) => d.factures)
      .filter((f) => f.statut !== "BROUILLON")
      .reduce((s, f) => s + totalTtc(f), 0);

    const minutes = intervention.temps.reduce((s, t) => s + t.minutes, 0);
    const fournitures = intervention.fournitures.map((f) => ({
      quantiteMilli: f.quantiteMilli,
      prixAchatCents: prixParLibelle.get(f.libelle.trim().toLowerCase()) ?? 0,
    }));

    return {
      interventionId: intervention.id,
      clientNom: intervention.client.nomAffichage,
      date: intervention.clotureeLe ?? intervention.createdAt,
      resultat: rentabiliteChantier({ produitCents, minutes, coutHoraireCents, fournitures }),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Exports                                                                    */
/* -------------------------------------------------------------------------- */

export async function piecesVentes(periode: Periode) {
  const { organizationId } = await exigerPermission("facture:lire");
  const [factures, avoirs] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        organizationId,
        statut: { not: "BROUILLON" },
        dateFacture: { gte: periode.debut, lt: periode.fin },
      },
      include: { client: { select: { nomAffichage: true } }, lignes: true },
      orderBy: { dateFacture: "asc" },
    }),
    prisma.creditNote.findMany({
      where: { organizationId, dateAvoir: { gte: periode.debut, lt: periode.fin } },
      include: { invoice: { select: { numero: true, client: { select: { nomAffichage: true } } } } },
      orderBy: { dateAvoir: "asc" },
    }),
  ]);
  return { factures, avoirs };
}

export async function piecesAchats(periode: Periode) {
  const { organizationId } = await exigerPermission("achat:lire");
  return prisma.purchase.findMany({
    where: {
      organizationId,
      etat: "VALIDE",
      dateAchat: { gte: periode.debut, lt: periode.fin },
    },
    include: { supplier: { select: { nom: true } } },
    orderBy: { dateAchat: "asc" },
  });
}
