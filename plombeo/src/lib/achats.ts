import "server-only";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";
import { calculerTotaux } from "@/lib/calcul";
import { etatStock, stockCourant } from "@/lib/stock";

/**
 * ACCÈS AUX ACHATS ET AU STOCK (Phase 8).
 *
 * Mêmes invariants que partout : l'organisation vient de la session, et tout
 * identifiant reçu est revalidé contre elle.
 */

/* -------------------------------------------------------------------------- */
/* Fournisseurs                                                               */
/* -------------------------------------------------------------------------- */

export async function listerFournisseurs(inclureArchives = false) {
  const { organizationId } = await exigerPermission("achat:lire");
  return prisma.supplier.findMany({
    where: { organizationId, ...(inclureArchives ? {} : { archivedAt: null }) },
    orderBy: { nom: "asc" },
    take: 200,
  });
}

export async function lireFournisseur(id: string) {
  const { organizationId } = await exigerPermission("achat:lire");
  return prisma.supplier.findFirst({
    where: { id, organizationId },
    include: {
      achats: { orderBy: { dateAchat: "desc" }, take: 50 },
      produits: { where: { archivedAt: null }, orderBy: { libelle: "asc" } },
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Achats                                                                     */
/* -------------------------------------------------------------------------- */

export async function listerAchats(limite = 100) {
  const { organizationId } = await exigerPermission("achat:lire");
  return prisma.purchase.findMany({
    where: { organizationId },
    orderBy: { dateAchat: "desc" },
    include: { supplier: { select: { id: true, nom: true } }, lignes: true },
    take: limite,
  });
}

export async function lireAchat(id: string) {
  const { organizationId } = await exigerPermission("achat:lire");
  return prisma.purchase.findFirst({
    where: { id, organizationId },
    include: {
      supplier: true,
      lignes: { orderBy: { ordre: "asc" }, include: { product: { select: { id: true, libelle: true } } } },
    },
  });
}

/**
 * Totaux d'un achat.
 *
 * FIGÉS une fois validé, recalculés tant qu'il est brouillon — même règle qu'en
 * Phase 5 sur les factures : un document validé doit afficher demain ce qu'il
 * affichait le jour de sa validation.
 *
 * La TVA vient de la saisie, jamais d'un calcul de Plombéo : la déductibilité
 * relève de l'expert-comptable [À VÉRIFIER — SOURCE OFFICIELLE].
 */
export function totauxAchat(achat: {
  etat: string;
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
  lignes: readonly { quantiteMilli: number; prixUnitaireCents: number; tauxTvaCentiemes: number }[];
}): { totalHtCents: number; totalTvaCents: number; totalTtcCents: number } {
  if (achat.etat !== "BROUILLON") {
    return {
      totalHtCents: achat.totalHtCents,
      totalTvaCents: achat.totalTvaCents,
      totalTtcCents: achat.totalTtcCents,
    };
  }
  const t = calculerTotaux(achat.lignes);
  return {
    totalHtCents: t.totalHtCents,
    totalTvaCents: t.totalTvaCents,
    totalTtcCents: t.totalTtcCents,
  };
}

/** Dépenses cumulées sur une période, pour préparer le rendez-vous comptable. */
export async function depensesSur(debut: Date, fin: Date) {
  const { organizationId } = await exigerPermission("achat:lire");
  const achats = await prisma.purchase.findMany({
    where: { organizationId, etat: "VALIDE", dateAchat: { gte: debut, lt: fin } },
    include: { supplier: { select: { nom: true } } },
    orderBy: { dateAchat: "desc" },
  });

  const totalHtCents = achats.reduce((s, a) => s + a.totalHtCents, 0);
  const totalTtcCents = achats.reduce((s, a) => s + a.totalTtcCents, 0);
  return { achats, totalHtCents, totalTtcCents, nombre: achats.length };
}

/* -------------------------------------------------------------------------- */
/* Stock                                                                      */
/* -------------------------------------------------------------------------- */

export type ArticleEnStock = {
  id: string;
  libelle: string;
  reference: string;
  unite: string;
  suiviStock: boolean;
  seuilAlerteMilli: number;
  prixAchatCents: number;
  prixUnitaireCents: number;
  quantiteMilli: number;
  etat: ReturnType<typeof etatStock>;
};

/**
 * État du stock des articles suivis.
 *
 * Les quantités sont DÉRIVÉES des mouvements, jamais lues dans une colonne.
 * Une agrégation par `groupBy` évite de charger tout le journal en mémoire tout
 * en gardant la même sémantique.
 */
export async function listerStock(): Promise<ArticleEnStock[]> {
  const { organizationId } = await exigerPermission("stock:lire");

  const articles = await prisma.product.findMany({
    where: { organizationId, archivedAt: null, suiviStock: true },
    orderBy: { libelle: "asc" },
  });
  if (articles.length === 0) return [];

  const sommes = await prisma.stockMovement.groupBy({
    by: ["productId"],
    where: { organizationId, productId: { in: articles.map((a) => a.id) } },
    _sum: { quantiteMilli: true },
  });
  const parArticle = new Map(sommes.map((s) => [s.productId, s._sum.quantiteMilli ?? 0]));

  return articles.map((a) => {
    const quantiteMilli = parArticle.get(a.id) ?? 0;
    return {
      id: a.id,
      libelle: a.libelle,
      reference: a.reference,
      unite: a.unite,
      suiviStock: a.suiviStock,
      seuilAlerteMilli: a.seuilAlerteMilli,
      prixAchatCents: a.prixAchatCents,
      prixUnitaireCents: a.prixUnitaireCents,
      quantiteMilli,
      etat: etatStock(a, quantiteMilli),
    };
  });
}

/** Stock d'une référence, ou `null` si elle appartient à un autre artisan. */
export async function stockArticle(productId: string): Promise<number | null> {
  const { organizationId } = await exigerPermission("stock:lire");
  const article = await prisma.product.findFirst({
    where: { id: productId, organizationId },
    select: { id: true },
  });
  if (!article) return null;

  const mouvements = await prisma.stockMovement.findMany({
    where: { productId, organizationId },
    select: { quantiteMilli: true },
  });
  return stockCourant(mouvements);
}

export async function listerMouvements(productId: string, limite = 100) {
  const { organizationId } = await exigerPermission("stock:lire");
  return prisma.stockMovement.findMany({
    where: { productId, organizationId },
    orderBy: { createdAt: "desc" },
    take: limite,
  });
}
