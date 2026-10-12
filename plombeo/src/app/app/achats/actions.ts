"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";
import { journaliser } from "@/lib/audit";
import { calculerTotaux, versCentimes, versMilliUnites } from "@/lib/calcul";
import { ecartComptage, seuilFranchi, stockCourant } from "@/lib/stock";
import { creerNotification } from "@/lib/moteur";
import type { TypeMouvement } from "@/generated/prisma/enums";

export type EtatAchat = { erreur?: string; succes?: string; tentative?: number; valeurs?: Record<string, string> };

function texte(donnees: FormData, champ: string): string {
  const v = donnees.get(champ);
  return typeof v === "string" ? v.trim() : "";
}

/* -------------------------------------------------------------------------- */
/* Fournisseurs                                                               */
/* -------------------------------------------------------------------------- */

export async function enregistrerFournisseur(
  precedent: EtatAchat,
  donnees: FormData,
): Promise<EtatAchat> {
  const { organizationId, userId } = await exigerPermission("achat:modifier");

  const id = texte(donnees, "id");
  const nom = texte(donnees, "nom");
  // React 19 réinitialise le formulaire après l'action : les valeurs saisies
  // sont réémises pour ne pas perdre la frappe de l'artisan.
  const valeurs = Object.fromEntries(
    ["nom", "contact", "email", "telephone", "adresse", "codePostal", "ville", "numeroCompte", "notes"]
      .map((c) => [c, texte(donnees, c)]),
  );

  if (!nom) {
    return { erreur: "Le nom du fournisseur est obligatoire.", tentative: (precedent.tentative ?? 0) + 1, valeurs };
  }

  const data = {
    nom,
    contact: texte(donnees, "contact").slice(0, 120),
    email: texte(donnees, "email").slice(0, 200),
    telephone: texte(donnees, "telephone").slice(0, 40),
    adresse: texte(donnees, "adresse").slice(0, 200),
    codePostal: texte(donnees, "codePostal").slice(0, 10),
    ville: texte(donnees, "ville").slice(0, 120),
    numeroCompte: texte(donnees, "numeroCompte").slice(0, 60),
    notes: texte(donnees, "notes").slice(0, 2000),
  };

  if (id) {
    const existant = await prisma.supplier.findFirst({ where: { id, organizationId } });
    if (!existant) return { erreur: "Ce fournisseur est introuvable." };
    await prisma.supplier.updateMany({ where: { id, organizationId }, data });
    await journaliser({
      action: "supplier.updated", organizationId, actorUserId: userId,
      entityType: "Supplier", entityId: id,
    });
    revalidatePath(`/app/achats/fournisseurs/${id}`);
    return { succes: "Fournisseur enregistré." };
  }

  const cree = await prisma.supplier.create({ data: { ...data, organizationId }, select: { id: true } });
  await journaliser({
    action: "supplier.created", organizationId, actorUserId: userId,
    entityType: "Supplier", entityId: cree.id,
  });

  revalidatePath("/app/achats/fournisseurs");
  redirect(`/app/achats/fournisseurs/${cree.id}`);
}

export async function archiverFournisseur(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("achat:modifier");
  const id = texte(donnees, "id");

  await prisma.supplier.updateMany({
    where: { id, organizationId },
    data: { archivedAt: new Date() },
  });
  await journaliser({
    action: "supplier.archived", organizationId, actorUserId: userId,
    entityType: "Supplier", entityId: id,
  });
  revalidatePath("/app/achats/fournisseurs");
}

/* -------------------------------------------------------------------------- */
/* Achats                                                                     */
/* -------------------------------------------------------------------------- */

export async function creerAchat(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("achat:modifier");

  const supplierId = texte(donnees, "supplierId");
  // Un fournisseur reçu est revalidé contre l'organisation avant d'être lié.
  const fournisseur = supplierId
    ? await prisma.supplier.findFirst({ where: { id: supplierId, organizationId }, select: { id: true } })
    : null;

  const achat = await prisma.purchase.create({
    data: {
      organizationId,
      libelle: texte(donnees, "libelle").slice(0, 200),
      referenceFournisseur: texte(donnees, "referenceFournisseur").slice(0, 80),
      ...(fournisseur ? { supplierId: fournisseur.id } : {}),
    },
    select: { id: true },
  });

  await journaliser({
    action: "purchase.created", organizationId, actorUserId: userId,
    entityType: "Purchase", entityId: achat.id,
  });

  redirect(`/app/achats/${achat.id}`);
}

export async function ajouterLigneAchat(
  precedent: EtatAchat,
  donnees: FormData,
): Promise<EtatAchat> {
  const { organizationId } = await exigerPermission("achat:modifier");
  const purchaseId = texte(donnees, "purchaseId");
  const suite = (precedent.tentative ?? 0) + 1;

  const achat = await prisma.purchase.findFirst({
    where: { id: purchaseId, organizationId },
    include: { lignes: { select: { ordre: true } } },
  });
  if (!achat) return { erreur: "Cet achat est introuvable." };
  // Un achat validé ne se modifie plus : ses totaux sont figés.
  if (achat.etat !== "BROUILLON") return { erreur: "Cet achat est validé, il ne se modifie plus." };

  const libelle = texte(donnees, "libelle");
  if (!libelle) return { erreur: "Indiquez un libellé.", tentative: suite };

  const quantiteMilli = versMilliUnites(texte(donnees, "quantite"));
  if (quantiteMilli === null || quantiteMilli <= 0) {
    return { erreur: "La quantité doit être un nombre positif.", tentative: suite };
  }

  const prixUnitaireCents = versCentimes(texte(donnees, "prix"));
  if (prixUnitaireCents === null || prixUnitaireCents < 0) {
    return { erreur: "Le prix doit être un montant valide.", tentative: suite };
  }

  const tauxTvaCentiemes = Number.parseInt(texte(donnees, "tauxTva"), 10);
  if (!Number.isFinite(tauxTvaCentiemes) || tauxTvaCentiemes < 0 || tauxTvaCentiemes > 10000) {
    return { erreur: "Taux de TVA invalide.", tentative: suite };
  }

  const productId = texte(donnees, "productId");
  const article = productId
    ? await prisma.product.findFirst({ where: { id: productId, organizationId }, select: { id: true } })
    : null;

  await prisma.purchaseLine.create({
    data: {
      purchaseId, organizationId, libelle: libelle.slice(0, 200),
      quantiteMilli, unite: texte(donnees, "unite").slice(0, 20) || "u",
      prixUnitaireCents, tauxTvaCentiemes,
      ordre: achat.lignes.length,
      ...(article ? { productId: article.id } : {}),
    },
  });

  revalidatePath(`/app/achats/${purchaseId}`);
  return { succes: "Ligne ajoutée." };
}

export async function supprimerLigneAchat(donnees: FormData): Promise<void> {
  const { organizationId } = await exigerPermission("achat:modifier");
  const id = texte(donnees, "id");

  const ligne = await prisma.purchaseLine.findFirst({
    where: { id, organizationId },
    include: { purchase: { select: { id: true, etat: true } } },
  });
  if (!ligne || ligne.purchase.etat !== "BROUILLON") return;

  await prisma.purchaseLine.deleteMany({ where: { id, organizationId } });
  revalidatePath(`/app/achats/${ligne.purchase.id}`);
}

/**
 * Valide un achat.
 *
 * Trois effets, dans cet ordre : figer les totaux, mettre à jour le dernier prix
 * d'achat connu des références concernées, et enregistrer les entrées de stock
 * pour les seules références SUIVIES.
 *
 * Les entrées de stock ne concernent que les articles suivis : entrer en stock
 * un consommable que l'artisan ne compte pas produirait un chiffre auquel
 * personne ne se fierait.
 */
export async function validerAchat(donnees: FormData): Promise<void> {
  const { organizationId, userId, email } = await exigerPermission("achat:modifier");
  const id = texte(donnees, "id");

  const achat = await prisma.purchase.findFirst({
    where: { id, organizationId },
    include: { lignes: { include: { product: true } } },
  });
  if (!achat || achat.etat !== "BROUILLON") return;
  if (achat.lignes.length === 0) return;

  const totaux = calculerTotaux(achat.lignes);

  // La TVA saisie prime si elle a été renseignée : c'est celle du document du
  // fournisseur qui fait foi, pas notre recalcul.
  //
  // Un champ VIDE signifie « non renseignée », jamais « zéro » — l'écran promet
  // explicitement que le vide reprend le total des lignes. Sans ce test sur la
  // chaîne brute, `versCentimes("")` rend 0 et l'achat serait validé sans TVA.
  const tvaBrute = texte(donnees, "totalTva");
  const tvaSaisie = tvaBrute ? versCentimes(tvaBrute) : null;
  const totalTvaCents = tvaSaisie !== null && tvaSaisie >= 0 ? tvaSaisie : totaux.totalTvaCents;

  await prisma.purchase.updateMany({
    where: { id, organizationId, etat: "BROUILLON" },
    data: {
      etat: "VALIDE",
      valideLe: new Date(),
      totalHtCents: totaux.totalHtCents,
      totalTvaCents,
      totalTtcCents: totaux.totalHtCents + totalTvaCents,
    },
  });

  for (const ligne of achat.lignes) {
    if (!ligne.product) continue;

    await prisma.product.updateMany({
      where: { id: ligne.product.id, organizationId },
      data: { prixAchatCents: ligne.prixUnitaireCents },
    });

    if (!ligne.product.suiviStock) continue;

    await prisma.stockMovement.create({
      data: {
        type: "ENTREE_ACHAT",
        quantiteMilli: ligne.quantiteMilli,
        prixUnitaireCents: ligne.prixUnitaireCents,
        productId: ligne.product.id,
        purchaseId: id,
        organizationId,
        parEmail: email,
        motif: `Achat ${achat.referenceFournisseur || ""}`.trim(),
      },
    });
  }

  await journaliser({
    action: "purchase.validated", organizationId, actorUserId: userId,
    entityType: "Purchase", entityId: id,
    metadata: { totalHtCents: totaux.totalHtCents, lignes: achat.lignes.length },
  });

  revalidatePath(`/app/achats/${id}`);
  revalidatePath("/app/achats");
  revalidatePath("/app/stock");
}

/* -------------------------------------------------------------------------- */
/* Stock                                                                      */
/* -------------------------------------------------------------------------- */

const TYPES_MOUVEMENT: TypeMouvement[] = [
  "ENTREE_ACHAT",
  "SORTIE_CHANTIER",
  "CORRECTION_COMPTAGE",
  "RETOUR",
  "PERTE",
];

/**
 * Enregistre un mouvement de stock.
 *
 * La sortie est TOUJOURS acceptée, même si elle rend le stock négatif : refuser
 * de sortir une pièce que l'artisan a physiquement dans les mains le pousserait
 * à mentir au logiciel. Le négatif est signalé à l'écran, il ne bloque rien.
 */
export async function enregistrerMouvement(
  precedent: EtatAchat,
  donnees: FormData,
): Promise<EtatAchat> {
  const { organizationId, userId, email } = await exigerPermission("stock:modifier");
  const suite = (precedent.tentative ?? 0) + 1;

  const productId = texte(donnees, "productId");
  const article = await prisma.product.findFirst({ where: { id: productId, organizationId } });
  if (!article) return { erreur: "Cette référence est introuvable." };

  const saisie = versMilliUnites(texte(donnees, "quantite"));
  if (saisie === null || saisie <= 0) {
    return { erreur: "La quantité doit être un nombre positif.", tentative: suite };
  }

  const typeSaisi = texte(donnees, "type") as TypeMouvement;
  const type = TYPES_MOUVEMENT.includes(typeSaisi) ? typeSaisi : "SORTIE_CHANTIER";
  // Le signe vient du TYPE, jamais de la saisie : demander à l'artisan de
  // taper « -3 » serait une source d'erreur permanente.
  const sortie = type === "SORTIE_CHANTIER" || type === "PERTE";
  const quantiteMilli = sortie ? -saisie : saisie;

  const avant = stockCourant(
    await prisma.stockMovement.findMany({
      where: { productId, organizationId },
      select: { quantiteMilli: true },
    }),
  );

  await prisma.stockMovement.create({
    data: {
      type, quantiteMilli, productId, organizationId, parEmail: email,
      prixUnitaireCents: article.prixAchatCents,
      motif: texte(donnees, "motif").slice(0, 200),
    },
  });

  await journaliser({
    action: "stock.movement_recorded", organizationId, actorUserId: userId,
    entityType: "Product", entityId: productId,
    metadata: { type, quantiteMilli },
  });

  await alerterSiSeuilFranchi(article, avant, avant + quantiteMilli, organizationId);

  revalidatePath("/app/stock");
  revalidatePath(`/app/stock/${productId}`);
  return { succes: "Mouvement enregistré." };
}

/**
 * Corrige le stock après un comptage physique.
 *
 * Écrit un mouvement d'ÉCART, jamais une réécriture de l'historique : on doit
 * pouvoir lire plus tard « il manquait 3 unités le 12 mars », et non découvrir
 * un passé silencieusement modifié (§57).
 */
export async function corrigerStock(
  precedent: EtatAchat,
  donnees: FormData,
): Promise<EtatAchat> {
  const { organizationId, userId, email } = await exigerPermission("stock:modifier");
  const suite = (precedent.tentative ?? 0) + 1;

  const productId = texte(donnees, "productId");
  const article = await prisma.product.findFirst({ where: { id: productId, organizationId } });
  if (!article) return { erreur: "Cette référence est introuvable." };

  const compte = versMilliUnites(texte(donnees, "compte"));
  if (compte === null || compte < 0) {
    return { erreur: "Indiquez la quantité réellement comptée.", tentative: suite };
  }

  const actuel = stockCourant(
    await prisma.stockMovement.findMany({
      where: { productId, organizationId },
      select: { quantiteMilli: true },
    }),
  );

  const ecart = ecartComptage(actuel, compte);
  if (ecart === 0) return { succes: "Le comptage confirme le stock : rien à corriger." };

  await prisma.stockMovement.create({
    data: {
      type: "CORRECTION_COMPTAGE",
      quantiteMilli: ecart,
      productId, organizationId, parEmail: email,
      prixUnitaireCents: article.prixAchatCents,
      motif: texte(donnees, "motif").slice(0, 200) || "Comptage",
    },
  });

  await journaliser({
    action: "stock.corrected", organizationId, actorUserId: userId,
    entityType: "Product", entityId: productId,
    metadata: { avant: actuel, compte, ecart },
  });

  await alerterSiSeuilFranchi(article, actuel, compte, organizationId);

  revalidatePath("/app/stock");
  revalidatePath(`/app/stock/${productId}`);
  return { succes: "Stock corrigé, l'écart est enregistré." };
}

/**
 * Notifie au FRANCHISSEMENT du seuil, pas à l'état sous seuil.
 *
 * Un article durablement en rupture produirait sinon une alerte à chaque
 * mouvement, et l'artisan cesserait de les lire.
 */
async function alerterSiSeuilFranchi(
  article: { id: string; libelle: string; suiviStock: boolean; seuilAlerteMilli: number },
  avantMilli: number,
  apresMilli: number,
  organizationId: string,
): Promise<void> {
  if (!seuilFranchi(article, avantMilli, apresMilli)) return;

  await creerNotification(organizationId, {
    titre: `Stock bas : ${article.libelle}`,
    corps: "Cette référence est passée sous votre seuil d'alerte.",
    lien: `/app/stock/${article.id}`,
  });
}

/** Active ou coupe le suivi de stock d'une référence. */
export async function basculerSuiviStock(donnees: FormData): Promise<void> {
  const { organizationId } = await exigerPermission("stock:modifier");
  const id = texte(donnees, "id");

  const article = await prisma.product.findFirst({ where: { id, organizationId } });
  if (!article) return;

  await prisma.product.updateMany({
    where: { id, organizationId },
    data: { suiviStock: !article.suiviStock },
  });

  revalidatePath("/app/stock");
  revalidatePath("/app/catalogue");
}

export async function definirSeuil(precedent: EtatAchat, donnees: FormData): Promise<EtatAchat> {
  const { organizationId } = await exigerPermission("stock:modifier");
  const id = texte(donnees, "id");

  const seuil = versMilliUnites(texte(donnees, "seuil"));
  if (seuil === null || seuil < 0) {
    return { erreur: "Le seuil doit être un nombre positif ou zéro.", tentative: (precedent.tentative ?? 0) + 1 };
  }

  await prisma.product.updateMany({
    where: { id, organizationId },
    data: { seuilAlerteMilli: seuil },
  });

  revalidatePath(`/app/stock/${id}`);
  return { succes: seuil === 0 ? "Alerte désactivée." : "Seuil enregistré." };
}
