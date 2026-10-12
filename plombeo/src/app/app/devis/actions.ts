"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";
import { journaliser } from "@/lib/audit";
import { verifierClientAccessible } from "@/lib/crm";
import { attribuerNumero } from "@/lib/devis";
import { transitionDevisAutorisee } from "@/lib/etats";
import { versCentimes, versMilliUnites } from "@/lib/calcul";
import { formaterDuree } from "@/lib/format";
import type { DevisStatut } from "@/generated/prisma/enums";

export type EtatDevis = {
  erreur?: string;
  succes?: string;
  valeurs?: Record<string, string>;
  tentative?: number;
};

const INTROUVABLE = "Ce devis est introuvable.";
const FIGE = "Ce devis n'est plus modifiable.";

function texte(donnees: FormData, champ: string): string {
  const v = donnees.get(champ);
  return typeof v === "string" ? v : "";
}

function echec(precedent: EtatDevis, erreur: string, donnees: FormData, champs: readonly string[]) {
  return {
    erreur,
    valeurs: Object.fromEntries(champs.map((c) => [c, texte(donnees, c)])),
    tentative: (precedent.tentative ?? 0) + 1,
  };
}

/**
 * Un devis n'est modifiable qu'à l'état BROUILLON.
 *
 * Vérifié à chaque écriture de ligne : passer en PRET fige le contenu, et une
 * modification après coup rendrait le numéro attribué mensonger.
 */
async function devisModifiable(id: string, organizationId: string): Promise<boolean> {
  const devis = await prisma.quote.findFirst({
    where: { id, organizationId, statut: "BROUILLON" },
    select: { id: true },
  });
  return devis !== null;
}

/** Retrouve le devis auquel appartient une proposition, en restant dans l'organisation. */
async function devisDeLOption(optionId: string, organizationId: string) {
  const option = await prisma.quoteOption.findFirst({
    where: { id: optionId, organizationId },
    select: { id: true, quoteId: true },
  });
  return option;
}

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                  */
/* -------------------------------------------------------------------------- */

const CHAMPS_ARTICLE = [
  "libelle",
  "description",
  "reference",
  "unite",
  "prix",
  "tauxTva",
  "dureeMin",
] as const;

export async function creerArticle(precedent: EtatDevis, donnees: FormData): Promise<EtatDevis> {
  const { organizationId, userId } = await exigerPermission("catalogue:modifier");

  const type = texte(donnees, "type");
  const libelle = texte(donnees, "libelle").trim();
  if (!libelle) return echec(precedent, "Indiquez un libellé.", donnees, CHAMPS_ARTICLE);

  const prixUnitaireCents = versCentimes(texte(donnees, "prix"));
  if (prixUnitaireCents === null || prixUnitaireCents < 0) {
    return echec(precedent, "Le prix n'est pas valide (exemple : 45,50).", donnees, CHAMPS_ARTICLE);
  }

  const tauxTvaCentiemes = Number(texte(donnees, "tauxTva"));
  if (!Number.isInteger(tauxTvaCentiemes) || tauxTvaCentiemes < 0 || tauxTvaCentiemes > 10000) {
    return echec(precedent, "Le taux de TVA n'est pas valide.", donnees, CHAMPS_ARTICLE);
  }

  const commun = {
    libelle,
    description: texte(donnees, "description").trim(),
    unite: texte(donnees, "unite").trim() || "u",
    prixUnitaireCents,
    tauxTvaCentiemes,
    organizationId,
  };

  if (type === "fourniture") {
    const article = await prisma.product.create({
      data: { ...commun, reference: texte(donnees, "reference").trim() },
      select: { id: true },
    });
    await journaliser({
      action: "product.created",
      organizationId,
      actorUserId: userId,
      entityType: "Product",
      entityId: article.id,
    });
  } else {
    const duree = Number(texte(donnees, "dureeMin") || "0");
    const article = await prisma.service.create({
      data: { ...commun, dureeMin: Number.isInteger(duree) && duree >= 0 ? duree : 0 },
      select: { id: true },
    });
    await journaliser({
      action: "service.created",
      organizationId,
      actorUserId: userId,
      entityType: "Service",
      entityId: article.id,
    });
  }

  revalidatePath("/app/catalogue");
  return { succes: "Article ajouté au catalogue." };
}

export async function archiverArticle(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("catalogue:modifier");
  const id = texte(donnees, "id");
  const type = texte(donnees, "type");

  if (type === "fourniture") {
    await prisma.product.updateMany({
      where: { id, organizationId },
      data: { archivedAt: new Date() },
    });
    await journaliser({
      action: "product.archived",
      organizationId,
      actorUserId: userId,
      entityType: "Product",
      entityId: id,
    });
  } else {
    await prisma.service.updateMany({
      where: { id, organizationId },
      data: { archivedAt: new Date() },
    });
    await journaliser({
      action: "service.archived",
      organizationId,
      actorUserId: userId,
      entityType: "Service",
      entityId: id,
    });
  }

  revalidatePath("/app/catalogue");
}

/* -------------------------------------------------------------------------- */
/* Devis                                                                      */
/* -------------------------------------------------------------------------- */

export async function creerDevis(precedent: EtatDevis, donnees: FormData): Promise<EtatDevis> {
  const { organizationId, userId } = await exigerPermission("devis:modifier");
  const clientId = texte(donnees, "clientId");
  const objet = texte(donnees, "objet").trim();

  if (!(await verifierClientAccessible(clientId))) {
    return echec(precedent, "Choisissez un client.", donnees, ["clientId", "objet"]);
  }

  const validite = Number(texte(donnees, "validiteJours") || "30");

  const devis = await prisma.quote.create({
    data: {
      clientId,
      objet,
      validiteJours: Number.isInteger(validite) && validite > 0 ? validite : 30,
      organizationId,
      // Un devis naît avec une proposition : un devis simple est un devis à une
      // seule variante, ce qui évite d'exposer la notion à qui n'en veut pas.
      options: { create: { libelle: "Proposition", ordre: 0, organizationId } },
    },
    select: { id: true },
  });

  await journaliser({
    action: "quote.created",
    organizationId,
    actorUserId: userId,
    entityType: "Quote",
    entityId: devis.id,
  });

  redirect(`/app/devis/${devis.id}`);
}

/**
 * Crée un devis à partir d'une intervention, en reprenant le temps passé et les
 * fournitures relevées sur place (US-5).
 *
 * Le temps devient une ligne au taux horaire de l'organisation, les fournitures
 * autant de lignes. Les prix restent à ajuster : Plombéo propose un point de
 * départ, il ne fixe pas les prix de l'artisan.
 */
export async function creerDevisDepuisIntervention(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("devis:modifier");
  const interventionId = texte(donnees, "interventionId");

  const intervention = await prisma.intervention.findFirst({
    where: { id: interventionId, organizationId },
    include: { temps: true, fournitures: true },
  });
  if (!intervention) redirect("/app/devis");

  const minutes = intervention.temps.reduce((s, t) => s + t.minutes, 0);

  const lignes: {
    libelle: string;
    quantiteMilli: number;
    unite: string;
    prixUnitaireCents: number;
    tauxTvaCentiemes: number;
    ordre: number;
    organizationId: string;
  }[] = [];

  if (minutes > 0) {
    lignes.push({
      libelle: `Main-d'œuvre (${formaterDuree(minutes)})`,
      // Heures en milli-unités : 75 min = 1,25 h = 1250.
      quantiteMilli: Math.round((minutes / 60) * 1000),
      unite: "h",
      // Prix laissé à 0 : l'artisan saisit son taux horaire. Inventer un prix
      // serait pire que de le laisser vide.
      prixUnitaireCents: 0,
      tauxTvaCentiemes: 2000,
      ordre: 0,
      organizationId,
    });
  }

  intervention.fournitures.forEach((f, i) => {
    lignes.push({
      libelle: f.libelle,
      quantiteMilli: f.quantiteMilli,
      unite: f.unite,
      prixUnitaireCents: 0,
      tauxTvaCentiemes: 2000,
      ordre: i + 1,
      organizationId,
    });
  });

  const devis = await prisma.quote.create({
    data: {
      clientId: intervention.clientId,
      propertyId: intervention.propertyId,
      interventionId: intervention.id,
      objet: intervention.probleme.slice(0, 160),
      organizationId,
      options: {
        create: {
          libelle: "Proposition",
          ordre: 0,
          organizationId,
          lignes: { create: lignes },
        },
      },
    },
    select: { id: true },
  });

  await journaliser({
    action: "quote.created",
    organizationId,
    actorUserId: userId,
    entityType: "Quote",
    entityId: devis.id,
    metadata: { depuisIntervention: intervention.id, lignes: lignes.length },
  });

  redirect(`/app/devis/${devis.id}`);
}

export async function modifierEnteteDevis(
  precedent: EtatDevis,
  donnees: FormData,
): Promise<EtatDevis> {
  const { organizationId, userId } = await exigerPermission("devis:modifier");
  const id = texte(donnees, "id");

  if (!(await devisModifiable(id, organizationId))) return { erreur: FIGE };

  const validite = Number(texte(donnees, "validiteJours") || "30");

  await prisma.quote.updateMany({
    where: { id, organizationId, statut: "BROUILLON" },
    data: {
      objet: texte(donnees, "objet").trim(),
      conditions: texte(donnees, "conditions"),
      notes: texte(donnees, "notes"),
      validiteJours: Number.isInteger(validite) && validite > 0 ? validite : 30,
    },
  });

  await journaliser({
    action: "quote.updated",
    organizationId,
    actorUserId: userId,
    entityType: "Quote",
    entityId: id,
  });

  revalidatePath(`/app/devis/${id}`);
  return { succes: "Devis enregistré." };
}

/* -------------------------------------------------------------------------- */
/* Lignes et variantes                                                        */
/* -------------------------------------------------------------------------- */

const CHAMPS_LIGNE = ["libelle", "quantite", "unite", "prix", "tauxTva"] as const;

export async function ajouterLigne(precedent: EtatDevis, donnees: FormData): Promise<EtatDevis> {
  const { organizationId, userId } = await exigerPermission("devis:modifier");
  const optionId = texte(donnees, "optionId");

  const option = await devisDeLOption(optionId, organizationId);
  if (!option) return { erreur: INTROUVABLE };
  if (!(await devisModifiable(option.quoteId, organizationId))) return { erreur: FIGE };

  const libelle = texte(donnees, "libelle").trim();
  if (!libelle) return echec(precedent, "Indiquez un libellé.", donnees, CHAMPS_LIGNE);

  const quantiteMilli = versMilliUnites(texte(donnees, "quantite") || "1");
  if (quantiteMilli === null || quantiteMilli <= 0) {
    return echec(precedent, "La quantité n'est pas valide.", donnees, CHAMPS_LIGNE);
  }

  const prixUnitaireCents = versCentimes(texte(donnees, "prix"));
  if (prixUnitaireCents === null) {
    return echec(precedent, "Le prix n'est pas valide (exemple : 45,50).", donnees, CHAMPS_LIGNE);
  }

  const tauxTvaCentiemes = Number(texte(donnees, "tauxTva"));
  if (!Number.isInteger(tauxTvaCentiemes) || tauxTvaCentiemes < 0 || tauxTvaCentiemes > 10000) {
    return echec(precedent, "Le taux de TVA n'est pas valide.", donnees, CHAMPS_LIGNE);
  }

  const dernier = await prisma.quoteLine.findFirst({
    where: { optionId, organizationId },
    orderBy: { ordre: "desc" },
    select: { ordre: true },
  });

  await prisma.quoteLine.create({
    data: {
      libelle,
      description: texte(donnees, "description").trim(),
      quantiteMilli,
      unite: texte(donnees, "unite").trim() || "u",
      prixUnitaireCents,
      tauxTvaCentiemes,
      ordre: (dernier?.ordre ?? -1) + 1,
      // Origine informative : volontairement sans clé étrangère, pour que
      // supprimer un article du catalogue ne touche pas aux devis émis.
      origineType: texte(donnees, "origineType"),
      origineId: texte(donnees, "origineId"),
      optionId,
      organizationId,
    },
  });

  await journaliser({
    action: "quote.updated",
    organizationId,
    actorUserId: userId,
    entityType: "Quote",
    entityId: option.quoteId,
  });

  revalidatePath(`/app/devis/${option.quoteId}`);
  return { succes: "Ligne ajoutée." };
}

export async function supprimerLigneDevis(donnees: FormData): Promise<void> {
  const { organizationId } = await exigerPermission("devis:modifier");
  const id = texte(donnees, "id");
  const quoteId = texte(donnees, "quoteId");

  if (await devisModifiable(quoteId, organizationId)) {
    await prisma.quoteLine.deleteMany({ where: { id, organizationId } });
  }
  revalidatePath(`/app/devis/${quoteId}`);
}

export async function modifierOption(donnees: FormData): Promise<void> {
  const { organizationId } = await exigerPermission("devis:modifier");
  const optionId = texte(donnees, "optionId");

  const option = await devisDeLOption(optionId, organizationId);
  if (!option) return;
  if (!(await devisModifiable(option.quoteId, organizationId))) return;

  const remise = Number(texte(donnees, "remisePourMille") || "0");
  const acompte = Number(texte(donnees, "acomptePourMille") || "0");
  const libelle = texte(donnees, "libelle").trim();

  await prisma.quoteOption.updateMany({
    where: { id: optionId, organizationId },
    data: {
      ...(libelle ? { libelle } : {}),
      remisePourMille: Number.isInteger(remise) && remise >= 0 && remise <= 1000 ? remise : 0,
      acomptePourMille: Number.isInteger(acompte) && acompte >= 0 && acompte <= 1000 ? acompte : 0,
    },
  });

  revalidatePath(`/app/devis/${option.quoteId}`);
}

export async function ajouterVariante(donnees: FormData): Promise<void> {
  const { organizationId } = await exigerPermission("devis:modifier");
  const quoteId = texte(donnees, "quoteId");

  if (!(await devisModifiable(quoteId, organizationId))) return;

  const dernier = await prisma.quoteOption.findFirst({
    where: { quoteId, organizationId },
    orderBy: { ordre: "desc" },
    select: { ordre: true },
  });
  const ordre = (dernier?.ordre ?? -1) + 1;
  // Noms d'usage du cahier des charges (§13), pré-remplis mais renommables.
  const noms = ["Essentiel", "Confort", "Premium"];

  await prisma.quoteOption.create({
    data: {
      libelle: noms[ordre] ?? `Proposition ${ordre + 1}`,
      ordre,
      quoteId,
      organizationId,
    },
  });

  revalidatePath(`/app/devis/${quoteId}`);
}

export async function supprimerVariante(donnees: FormData): Promise<void> {
  const { organizationId } = await exigerPermission("devis:modifier");
  const optionId = texte(donnees, "optionId");
  const quoteId = texte(donnees, "quoteId");

  if (!(await devisModifiable(quoteId, organizationId))) return;

  // Un devis garde toujours au moins une proposition : sans elle, il n'aurait
  // plus de contenu ni de total.
  const nombre = await prisma.quoteOption.count({ where: { quoteId, organizationId } });
  if (nombre <= 1) return;

  await prisma.quoteOption.deleteMany({ where: { id: optionId, organizationId } });
  revalidatePath(`/app/devis/${quoteId}`);
}

/* -------------------------------------------------------------------------- */
/* États                                                                      */
/* -------------------------------------------------------------------------- */

export async function changerEtatDevis(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("devis:modifier");
  const id = texte(donnees, "id");
  const vers = texte(donnees, "vers") as DevisStatut;

  const devis = await prisma.quote.findFirst({
    where: { id, organizationId },
    select: { statut: true, numero: true },
  });
  if (!devis) redirect("/app/devis");
  if (!transitionDevisAutorisee(devis.statut, vers)) redirect(`/app/devis/${id}`);

  // Le numéro est attribué au passage en PRET, et une seule fois : un retour en
  // brouillon puis un nouveau passage en PRET ne doit pas en consommer un autre.
  const numero =
    vers === "PRET" && !devis.numero ? await attribuerNumero(organizationId) : devis.numero;

  const horodatage =
    vers === "PRET"
      ? { pretLe: new Date() }
      : vers === "ENVOYE"
        ? { envoyeLe: new Date() }
        : vers === "ACCEPTE"
          ? { accepteLe: new Date() }
          : {};

  await prisma.quote.updateMany({
    where: { id, organizationId },
    data: { statut: vers, numero, ...horodatage },
  });

  const evenements: Partial<Record<DevisStatut, Parameters<typeof journaliser>[0]["action"]>> = {
    PRET: "quote.ready",
    ENVOYE: "quote.sent",
    ACCEPTE: "quote.accepted",
    REFUSE: "quote.declined",
    EXPIRE: "quote.expired",
    ANNULE: "quote.cancelled",
  };
  const action = evenements[vers];
  if (action) {
    await journaliser({
      action,
      organizationId,
      actorUserId: userId,
      entityType: "Quote",
      entityId: id,
      metadata: { de: devis.statut, vers, ...(numero ? { numero } : {}) },
    });
  }

  revalidatePath(`/app/devis/${id}`);
  redirect(`/app/devis/${id}`);
}
