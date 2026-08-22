"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";
import { journaliser } from "@/lib/audit";
import { verifierClientAccessible } from "@/lib/crm";
import { calculerTotaux, versCentimes, versMilliUnites } from "@/lib/calcul";
import { totauxOption } from "@/lib/devis";
import {
  attribuerNumeroFacture,
  calculerEmpreinte,
  calculerSolde,
  statutSelonPaiements,
  totalTtc,
} from "@/lib/facturation";
import { transitionFactureAutorisee } from "@/lib/etats";
import type { MoyenPaiement } from "@/generated/prisma/enums";

export type EtatFacture = {
  erreur?: string;
  succes?: string;
  valeurs?: Record<string, string>;
  tentative?: number;
};

const INTROUVABLE = "Cette facture est introuvable.";

/**
 * Message unique de refus d'écriture sur une facture émise.
 *
 * C'est la règle centrale de la phase (§14) : une facture émise ne se réécrit
 * pas, elle se rectifie par un avoir.
 */
const EMISE_FIGEE =
  "Cette facture est émise : elle ne peut plus être modifiée. Créez un avoir pour la corriger.";

function texte(donnees: FormData, champ: string): string {
  const v = donnees.get(champ);
  return typeof v === "string" ? v : "";
}

function echec(precedent: EtatFacture, erreur: string, donnees: FormData, champs: readonly string[]) {
  return {
    erreur,
    valeurs: Object.fromEntries(champs.map((c) => [c, texte(donnees, c)])),
    tentative: (precedent.tentative ?? 0) + 1,
  };
}

/**
 * Une facture n'est modifiable qu'à l'état BROUILLON.
 *
 * Vérifié côté serveur AVANT chaque écriture, sans exception : masquer un
 * bouton ne protège rien, une Server Action est un point d'entrée réseau.
 */
async function factureModifiable(id: string, organizationId: string): Promise<boolean> {
  const facture = await prisma.invoice.findFirst({
    where: { id, organizationId, statut: "BROUILLON" },
    select: { id: true },
  });
  return facture !== null;
}

/* -------------------------------------------------------------------------- */
/* Création                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Facture issue d'un devis accepté.
 *
 * Les lignes sont COPIÉES depuis la proposition retenue : la facture doit rester
 * lisible même si le devis évolue ou disparaît.
 */
export async function creerFactureDepuisDevis(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("facture:modifier");
  const quoteId = texte(donnees, "quoteId");
  const optionId = texte(donnees, "optionId");

  const devis = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId },
    include: { options: { include: { lignes: { orderBy: { ordre: "asc" } } } } },
  });
  if (!devis) redirect("/app/devis");

  const option = optionId
    ? devis.options.find((o) => o.id === optionId)
    : devis.options[0];
  if (!option) redirect(`/app/devis/${quoteId}`);

  const facture = await prisma.invoice.create({
    data: {
      clientId: devis.clientId,
      propertyId: devis.propertyId,
      quoteId: devis.id,
      objet: devis.objet,
      conditions: devis.conditions,
      organizationId,
      lignes: {
        create: option.lignes.map((l, i) => ({
          libelle: l.libelle,
          description: l.description,
          quantiteMilli: l.quantiteMilli,
          unite: l.unite,
          prixUnitaireCents: l.prixUnitaireCents,
          tauxTvaCentiemes: l.tauxTvaCentiemes,
          ordre: i,
          organizationId,
        })),
      },
    },
    select: { id: true },
  });

  await journaliser({
    action: "invoice.created",
    organizationId,
    actorUserId: userId,
    entityType: "Invoice",
    entityId: facture.id,
    metadata: { depuisDevis: devis.id },
  });

  redirect(`/app/factures/${facture.id}`);
}

/**
 * Facture d'acompte issue d'un devis.
 *
 * Une seule ligne, au montant d'acompte prévu par la proposition. Elle sera
 * déductible de la facture de solde.
 */
export async function creerFactureAcompte(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("facture:modifier");
  const quoteId = texte(donnees, "quoteId");

  const devis = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId },
    include: { options: { include: { lignes: true }, orderBy: { ordre: "asc" } } },
  });
  if (!devis) redirect("/app/devis");

  const option = devis.options[0];
  const totaux = totauxOption(option);
  if (!option || totaux.acompteCents <= 0) redirect(`/app/devis/${quoteId}`);

  /*
   * L'acompte est un montant TTC. Le porter sur une ligne HT exigerait de
   * choisir un taux de TVA, ce qui n'a pas de sens quand le devis en mélange
   * plusieurs. On facture donc l'acompte au taux 0 et l'on documente le fait :
   * la TVA sera portée par la facture de solde.
   *
   * [À VÉRIFIER — SOURCE OFFICIELLE] Le traitement correct de la TVA sur les
   * acomptes relève de la réglementation et du conseil de l'expert-comptable.
   * Cette implémentation ne doit pas être considérée comme validée fiscalement.
   */
  const facture = await prisma.invoice.create({
    data: {
      type: "ACOMPTE",
      clientId: devis.clientId,
      propertyId: devis.propertyId,
      quoteId: devis.id,
      objet: `Acompte sur ${devis.objet || devis.numero || "devis"}`,
      organizationId,
      lignes: {
        create: {
          libelle: "Acompte à la commande",
          quantiteMilli: 1000,
          prixUnitaireCents: totaux.acompteCents,
          tauxTvaCentiemes: 0,
          ordre: 0,
          organizationId,
        },
      },
    },
    select: { id: true },
  });

  await journaliser({
    action: "invoice.created",
    organizationId,
    actorUserId: userId,
    entityType: "Invoice",
    entityId: facture.id,
    metadata: { type: "ACOMPTE", depuisDevis: devis.id },
  });

  redirect(`/app/factures/${facture.id}`);
}

export async function creerFactureDirecte(
  precedent: EtatFacture,
  donnees: FormData,
): Promise<EtatFacture> {
  const { organizationId, userId } = await exigerPermission("facture:modifier");
  const clientId = texte(donnees, "clientId");

  if (!(await verifierClientAccessible(clientId))) {
    return echec(precedent, "Choisissez un client.", donnees, ["clientId", "objet"]);
  }

  const facture = await prisma.invoice.create({
    data: { clientId, objet: texte(donnees, "objet").trim(), organizationId },
    select: { id: true },
  });

  await journaliser({
    action: "invoice.created",
    organizationId,
    actorUserId: userId,
    entityType: "Invoice",
    entityId: facture.id,
  });

  redirect(`/app/factures/${facture.id}`);
}

/* -------------------------------------------------------------------------- */
/* Lignes (brouillon uniquement)                                              */
/* -------------------------------------------------------------------------- */

const CHAMPS_LIGNE = ["libelle", "quantite", "unite", "prix", "tauxTva"] as const;

export async function ajouterLigneFacture(
  precedent: EtatFacture,
  donnees: FormData,
): Promise<EtatFacture> {
  const { organizationId } = await exigerPermission("facture:modifier");
  const invoiceId = texte(donnees, "invoiceId");

  if (!(await factureModifiable(invoiceId, organizationId))) return { erreur: EMISE_FIGEE };

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

  const dernier = await prisma.invoiceLine.findFirst({
    where: { invoiceId, organizationId },
    orderBy: { ordre: "desc" },
    select: { ordre: true },
  });

  await prisma.invoiceLine.create({
    data: {
      libelle,
      quantiteMilli,
      unite: texte(donnees, "unite").trim() || "u",
      prixUnitaireCents,
      tauxTvaCentiemes,
      ordre: (dernier?.ordre ?? -1) + 1,
      invoiceId,
      organizationId,
    },
  });

  revalidatePath(`/app/factures/${invoiceId}`);
  return { succes: "Ligne ajoutée." };
}

export async function supprimerLigneFacture(donnees: FormData): Promise<void> {
  const { organizationId } = await exigerPermission("facture:modifier");
  const id = texte(donnees, "id");
  const invoiceId = texte(donnees, "invoiceId");

  if (await factureModifiable(invoiceId, organizationId)) {
    await prisma.invoiceLine.deleteMany({ where: { id, organizationId } });
  }
  revalidatePath(`/app/factures/${invoiceId}`);
}

export async function modifierEnteteFacture(
  precedent: EtatFacture,
  donnees: FormData,
): Promise<EtatFacture> {
  const { organizationId } = await exigerPermission("facture:modifier");
  const id = texte(donnees, "id");

  if (!(await factureModifiable(id, organizationId))) return { erreur: EMISE_FIGEE };

  const echeance = texte(donnees, "dateEcheance").trim();

  await prisma.invoice.updateMany({
    where: { id, organizationId, statut: "BROUILLON" },
    data: {
      objet: texte(donnees, "objet").trim(),
      conditions: texte(donnees, "conditions"),
      notes: texte(donnees, "notes"),
      dateEcheance: echeance === "" ? null : new Date(echeance),
    },
  });

  revalidatePath(`/app/factures/${id}`);
  return { succes: "Facture enregistrée." };
}

/* -------------------------------------------------------------------------- */
/* Émission — l'acte irréversible                                             */
/* -------------------------------------------------------------------------- */

/**
 * Émet la facture : lui attribue son numéro, FIGE ses totaux et calcule son
 * empreinte d'intégrité.
 *
 * À partir de cet instant, aucune modification n'est plus possible. C'est
 * pourquoi l'action exige une permission distincte (`facture:emettre`) : émettre
 * engage l'entreprise.
 */
export async function emettreFacture(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("facture:emettre");
  const id = texte(donnees, "id");

  const facture = await prisma.invoice.findFirst({
    where: { id, organizationId },
    include: { client: { select: { nomAffichage: true } }, lignes: { orderBy: { ordre: "asc" } } },
  });
  if (!facture) redirect("/app/factures");
  if (!transitionFactureAutorisee(facture.statut, "EMISE")) redirect(`/app/factures/${id}`);

  // Une facture sans ligne n'a pas de sens comptable.
  if (facture.lignes.length === 0) redirect(`/app/factures/${id}`);

  const totaux = calculerTotaux(facture.lignes);
  const numero = await attribuerNumeroFacture(organizationId, "FACTURE");
  const dateFacture = new Date();

  const empreinte = calculerEmpreinte({
    numero,
    dateFacture,
    clientNom: facture.client.nomAffichage,
    totalHtCents: totaux.totalHtCents,
    totalTvaCents: totaux.totalTvaCents,
    totalTtcCents: totaux.totalTtcCents,
    lignes: facture.lignes,
  });

  await prisma.invoice.updateMany({
    where: { id, organizationId, statut: "BROUILLON" },
    data: {
      statut: "EMISE",
      numero,
      dateFacture,
      emiseLe: dateFacture,
      // Totaux FIGÉS : une facture émise doit afficher demain exactement ce
      // qu'elle affichait aujourd'hui, même si le moteur de calcul évolue.
      totalHtCents: totaux.totalHtCents,
      totalTvaCents: totaux.totalTvaCents,
      totalTtcCents: totaux.totalTtcCents,
      detailTva: totaux.tvaParTaux,
      empreinte,
    },
  });

  await journaliser({
    action: "invoice.issued",
    organizationId,
    actorUserId: userId,
    entityType: "Invoice",
    entityId: id,
    metadata: { numero, totalTtcCents: totaux.totalTtcCents },
  });

  revalidatePath(`/app/factures/${id}`);
  redirect(`/app/factures/${id}`);
}

export async function marquerFactureEnvoyee(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("facture:modifier");
  const id = texte(donnees, "id");

  const facture = await prisma.invoice.findFirst({
    where: { id, organizationId },
    select: { statut: true },
  });
  if (!facture) redirect("/app/factures");
  if (!transitionFactureAutorisee(facture.statut, "ENVOYEE")) redirect(`/app/factures/${id}`);

  await prisma.invoice.updateMany({
    where: { id, organizationId },
    data: { statut: "ENVOYEE", envoyeeLe: new Date() },
  });

  await journaliser({
    action: "invoice.sent",
    organizationId,
    actorUserId: userId,
    entityType: "Invoice",
    entityId: id,
  });

  revalidatePath(`/app/factures/${id}`);
  redirect(`/app/factures/${id}`);
}

/* -------------------------------------------------------------------------- */
/* Paiements                                                                  */
/* -------------------------------------------------------------------------- */

/** Recalcule et applique l'état dérivé des paiements. */
async function rafraichirStatut(invoiceId: string, organizationId: string): Promise<void> {
  const facture = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    include: {
      lignes: true,
      paiements: { select: { montantCents: true } },
      avoirs: { select: { montantTtcCents: true } },
    },
  });
  if (!facture) return;

  const solde = calculerSolde(totalTtc(facture), facture.paiements, facture.avoirs);
  const nouveau = statutSelonPaiements(facture.statut, solde);
  if (nouveau !== facture.statut) {
    await prisma.invoice.updateMany({
      where: { id: invoiceId, organizationId },
      data: { statut: nouveau },
    });
  }
}

const MOYENS: MoyenPaiement[] = ["VIREMENT", "CHEQUE", "ESPECES", "CARTE", "AUTRE"];

export async function enregistrerPaiement(
  precedent: EtatFacture,
  donnees: FormData,
): Promise<EtatFacture> {
  const { organizationId, userId } = await exigerPermission("facture:encaisser");
  const invoiceId = texte(donnees, "invoiceId");

  const facture = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    select: { statut: true },
  });
  if (!facture) return { erreur: INTROUVABLE };
  // Un brouillon n'a pas d'existence comptable : on n'encaisse pas dessus.
  if (facture.statut === "BROUILLON") {
    return { erreur: "Émettez la facture avant d'enregistrer un paiement." };
  }

  const montantCents = versCentimes(texte(donnees, "montant"));
  if (montantCents === null || montantCents <= 0) {
    return echec(precedent, "Le montant n'est pas valide.", donnees, ["montant", "reference"]);
  }

  const moyenSaisi = texte(donnees, "moyen") as MoyenPaiement;
  const moyen = MOYENS.includes(moyenSaisi) ? moyenSaisi : "AUTRE";
  const date = texte(donnees, "datePaiement").trim();

  await prisma.payment.create({
    data: {
      montantCents,
      moyen,
      datePaiement: date === "" ? new Date() : new Date(date),
      reference: texte(donnees, "reference").trim(),
      invoiceId,
      organizationId,
    },
  });

  await journaliser({
    action: "payment.recorded",
    organizationId,
    actorUserId: userId,
    entityType: "Invoice",
    entityId: invoiceId,
    metadata: { montantCents, moyen },
  });

  await rafraichirStatut(invoiceId, organizationId);
  revalidatePath(`/app/factures/${invoiceId}`);
  return { succes: "Paiement enregistré." };
}

export async function supprimerPaiement(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("facture:encaisser");
  const id = texte(donnees, "id");
  const invoiceId = texte(donnees, "invoiceId");

  const resultat = await prisma.payment.deleteMany({ where: { id, organizationId } });
  if (resultat.count > 0) {
    await journaliser({
      action: "payment.removed",
      organizationId,
      actorUserId: userId,
      entityType: "Invoice",
      entityId: invoiceId,
    });
  }

  await rafraichirStatut(invoiceId, organizationId);
  revalidatePath(`/app/factures/${invoiceId}`);
}

/* -------------------------------------------------------------------------- */
/* Avoirs — la seule façon de corriger une facture émise                      */
/* -------------------------------------------------------------------------- */

export async function creerAvoir(precedent: EtatFacture, donnees: FormData): Promise<EtatFacture> {
  const { organizationId, userId } = await exigerPermission("facture:emettre");
  const invoiceId = texte(donnees, "invoiceId");

  const facture = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    include: {
      lignes: true,
      paiements: { select: { montantCents: true } },
      avoirs: { select: { montantTtcCents: true } },
    },
  });
  if (!facture) return { erreur: INTROUVABLE };
  if (facture.statut === "BROUILLON") {
    return { erreur: "Un brouillon se modifie directement : l'avoir ne concerne que les factures émises." };
  }

  const montantTtcCents = versCentimes(texte(donnees, "montant"));
  if (montantTtcCents === null || montantTtcCents <= 0) {
    return echec(precedent, "Le montant de l'avoir n'est pas valide.", donnees, ["montant", "motif"]);
  }

  const solde = calculerSolde(totalTtc(facture), facture.paiements, facture.avoirs);
  if (montantTtcCents > solde.duCents) {
    return echec(
      precedent,
      `L'avoir ne peut pas dépasser le montant restant dû (${(solde.duCents / 100).toFixed(2)} €).`,
      donnees,
      ["montant", "motif"],
    );
  }

  const numero = await attribuerNumeroFacture(organizationId, "AVOIR");
  const dateAvoir = new Date();

  await prisma.creditNote.create({
    data: {
      numero,
      motif: texte(donnees, "motif").trim(),
      montantTtcCents,
      dateAvoir,
      empreinte: calculerEmpreinte({
        numero,
        dateFacture: dateAvoir,
        clientNom: facture.clientId,
        totalHtCents: 0,
        totalTvaCents: 0,
        totalTtcCents: montantTtcCents,
        lignes: [],
      }),
      invoiceId,
      organizationId,
    },
  });

  await journaliser({
    action: "credit_note.issued",
    organizationId,
    actorUserId: userId,
    entityType: "Invoice",
    entityId: invoiceId,
    metadata: { numero, montantTtcCents },
  });

  await rafraichirStatut(invoiceId, organizationId);
  revalidatePath(`/app/factures/${invoiceId}`);
  return { succes: `Avoir ${numero} créé.` };
}
