import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * NUMÉROTATION ET INTÉGRITÉ DES PIÈCES COMMERCIALES.
 *
 * Extrait de `devis.ts` et `facturation.ts`, qui restent les points d'entrée de
 * l'application et réexportent ce module.
 *
 * La raison de la séparation : ces fonctions ne dépendent que de la base, jamais
 * du DAL — donc jamais de la session, des cookies ni du routeur. Tant qu'elles
 * cohabitaient avec les lectures autorisées, le moindre outil hors requête HTTP
 * (un script d'amorçage, une reprise de données) devait embarquer tout Next.js
 * pour calculer une empreinte. Le jeu de démonstration l'a montré : il tirait
 * `next/navigation` et échouait, alors qu'il ne voulait qu'un numéro et un
 * hachage.
 *
 * Ce qui est en jeu n'est pas le confort : c'est que ces outils utilisent les
 * MÊMES fonctions que l'application. Une empreinte recalculée autrement ferait
 * signaler la facture comme altérée ; un numéro forgé à côté du compteur
 * casserait la continuité de la numérotation.
 */

/* -------------------------------------------------------------------------- */
/* Devis                                                                      */
/* -------------------------------------------------------------------------- */

/** Format du numéro : DEV-2026-001. Fonction pure, testée. */
export function formaterNumeroDevis(annee: number, sequence: number): string {
  return `DEV-${annee}-${String(sequence).padStart(3, "0")}`;
}

/**
 * Attribue le prochain numéro de devis.
 *
 * L'incrément se fait en base, sur une ligne unique par (organisation, année) :
 * deux devis passés en PRET au même instant obtiennent ainsi deux numéros
 * distincts. Un compteur calculé par `count()` ou lu puis réécrit en deux temps
 * donnerait des doublons dès la moindre concurrence.
 *
 * La séquence repart à 1 chaque année.
 */
export async function attribuerNumeroDevis(
  organizationId: string,
  date = new Date(),
): Promise<string> {
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
/* Factures                                                                   */
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
 * La continuité de la numérotation est une exigence comptable
 * [À VÉRIFIER — SOURCE OFFICIELLE], d'où l'attribution au moment de l'émission
 * seulement — numéroter des brouillons créerait des trous.
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
