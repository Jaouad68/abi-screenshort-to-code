import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hacherJeton } from "@/lib/session";
import { calculerTotaux } from "@/lib/calcul";
import { totalTtc, calculerSolde } from "@/lib/facturation";

/**
 * PORTAIL CLIENT (Phase 10).
 *
 * Première porte du projet ouverte à quelqu'un qui n'a PAS de session Plombéo.
 * Deux principes en découlent, et rien ici ne doit y déroger :
 *
 *  1. le jeton est vérifié à CHAQUE requête, et il porte à la fois
 *     l'organisation et le client ;
 *  2. rien n'est exposé qui ne soit explicitement listé. Une liste blanche est
 *     le seul mécanisme sûr — une liste noire oublie le champ ajouté demain.
 */

/** 32 octets : ne se devine pas, et n'a aucun lien avec l'identifiant du client. */
export function genererJetonPortail(): string {
  return randomBytes(32).toString("base64url");
}

export const DUREE_ACCES_JOURS = 90;

export type AccesValide = { organizationId: string; clientId: string; accessId: string };

/**
 * Résout un jeton, ou `null`.
 *
 * `null` couvre indistinctement : jeton inconnu, révoqué, expiré. L'appelant
 * doit répondre la même chose dans les trois cas — distinguer renseignerait sur
 * l'existence d'un lien.
 */
export async function resoudreJeton(jeton: string): Promise<AccesValide | null> {
  if (!jeton || jeton.length < 20) return null;

  const acces = await prisma.clientAccess.findUnique({
    where: { tokenHash: hacherJeton(jeton) },
    select: {
      id: true,
      clientId: true,
      organizationId: true,
      expiresAt: true,
      revokedAt: true,
    },
  });

  if (!acces) return null;
  if (acces.revokedAt) return null;
  if (acces.expiresAt < new Date()) return null;

  return {
    organizationId: acces.organizationId,
    clientId: acces.clientId,
    accessId: acces.id,
  };
}

/** Trace la consultation, pour que l'artisan sache si le client a ouvert. */
export async function marquerVu(accessId: string): Promise<void> {
  await prisma.clientAccess.update({
    where: { id: accessId },
    data: { vuLe: new Date() },
  });
}

/* -------------------------------------------------------------------------- */
/* Projections — liste blanche stricte                                        */
/* -------------------------------------------------------------------------- */

export type EnteteClient = {
  nomAffichage: string;
  entreprise: { nom: string; telephone: string; email: string; adresse: string; ville: string };
};

/**
 * En-tête du portail.
 *
 * `Client.notes` est une note INTERNE que le schéma décrit comme ne devant
 * jamais figurer sur un document remis au client. Le portail est le premier
 * endroit où cette règle pourrait être violée pour de bon : elle n'est donc
 * jamais sélectionnée.
 */
export async function enteteClient(acces: AccesValide): Promise<EnteteClient | null> {
  const client = await prisma.client.findFirst({
    where: { id: acces.clientId, organizationId: acces.organizationId },
    select: { nomAffichage: true },
  });
  if (!client) return null;

  const organisation = await prisma.organization.findUnique({
    where: { id: acces.organizationId },
    select: { nom: true, telephone: true, email: true, adresse: true, ville: true },
  });
  if (!organisation) return null;

  return { nomAffichage: client.nomAffichage, entreprise: organisation };
}

export type DevisPortail = {
  id: string;
  numero: string;
  objet: string;
  statut: string;
  date: Date;
  totalTtcCents: number;
};

export async function devisDuClient(acces: AccesValide): Promise<DevisPortail[]> {
  const devis = await prisma.quote.findMany({
    // Double filtre : le client ET l'organisation. Un jeton valide ne doit
    // jamais servir de passe-partout dans l'organisation.
    where: {
      clientId: acces.clientId,
      organizationId: acces.organizationId,
      // Un brouillon n'est pas un document remis : il n'existe pas pour le client.
      statut: { in: ["PRET", "ENVOYE", "ACCEPTE", "REFUSE", "EXPIRE"] },
    },
    orderBy: { dateDevis: "desc" },
    include: { options: { include: { lignes: true }, orderBy: { ordre: "asc" } } },
    take: 100,
  });

  return devis.map((d) => ({
    id: d.id,
    numero: d.numero ?? "",
    objet: d.objet,
    statut: d.statut,
    date: d.dateDevis,
    totalTtcCents: calculerTotaux(
      d.options[0]?.lignes ?? [],
      d.options[0]?.remisePourMille ?? 0,
    ).totalTtcCents,
  }));
}

export type LignePortail = {
  libelle: string;
  quantiteMilli: number;
  unite: string;
  prixUnitaireCents: number;
  tauxTvaCentiemes: number;
};

export type DevisDetailPortail = {
  id: string;
  numero: string;
  objet: string;
  statut: string;
  date: Date;
  conditions: string;
  lignes: LignePortail[];
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
};

/**
 * Détail d'un devis, ou `null` s'il n'appartient pas à ce client.
 *
 * Un jeton valide ne donne PAS accès à un document dont l'identifiant serait
 * deviné : le filtre porte sur le client et l'organisation, jamais sur le seul
 * identifiant.
 *
 * Les champs sont énumérés un par un — `notes` du devis, marges et prix d'achat
 * n'ont aucun chemin vers cette projection.
 */
export async function devisDetail(
  acces: AccesValide,
  devisId: string,
): Promise<DevisDetailPortail | null> {
  const devis = await prisma.quote.findFirst({
    where: {
      id: devisId,
      clientId: acces.clientId,
      organizationId: acces.organizationId,
      statut: { in: ["PRET", "ENVOYE", "ACCEPTE", "REFUSE", "EXPIRE"] },
    },
    include: { options: { include: { lignes: { orderBy: { ordre: "asc" } } }, orderBy: { ordre: "asc" } } },
  });
  if (!devis) return null;

  const option = devis.options[0];
  const lignes = option?.lignes ?? [];
  const totaux = calculerTotaux(lignes, option?.remisePourMille ?? 0);

  return {
    id: devis.id,
    numero: devis.numero ?? "",
    objet: devis.objet,
    statut: devis.statut,
    date: devis.dateDevis,
    conditions: devis.conditions,
    lignes: lignes.map((l) => ({
      libelle: l.libelle,
      quantiteMilli: l.quantiteMilli,
      unite: l.unite,
      prixUnitaireCents: l.prixUnitaireCents,
      tauxTvaCentiemes: l.tauxTvaCentiemes,
    })),
    totalHtCents: totaux.totalHtCents,
    totalTvaCents: totaux.totalTvaCents,
    totalTtcCents: totaux.totalTtcCents,
  };
}

export type FacturePortail = {
  id: string;
  numero: string;
  date: Date;
  echeance: Date | null;
  totalTtcCents: number;
  resteCents: number;
  statut: string;
};

export async function facturesDuClient(acces: AccesValide): Promise<FacturePortail[]> {
  const factures = await prisma.invoice.findMany({
    where: {
      clientId: acces.clientId,
      organizationId: acces.organizationId,
      statut: { not: "BROUILLON" },
    },
    orderBy: { dateFacture: "desc" },
    include: {
      lignes: true,
      paiements: { select: { montantCents: true } },
      avoirs: { select: { montantTtcCents: true } },
    },
    take: 100,
  });

  return factures.map((f) => {
    const solde = calculerSolde(totalTtc(f), f.paiements, f.avoirs);
    return {
      id: f.id,
      numero: f.numero ?? "",
      date: f.dateFacture,
      echeance: f.dateEcheance,
      totalTtcCents: totalTtc(f),
      resteCents: solde.resteCents,
      statut: f.statut,
    };
  });
}
