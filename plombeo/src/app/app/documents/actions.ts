"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";
import { journaliser } from "@/lib/audit";
import { empreinteContenu, resumerIntervention } from "@/lib/documents";
import { adresseCourte } from "@/lib/libelles";
import { totalMinutes } from "@/lib/format";
import {
  ecrire,
  genererChemin,
  stockageDisponible,
  supprimer as supprimerFichier,
  validerFichier,
  STOCKAGE_NON_CONFIGURE,
} from "@/lib/stockage";
import { headers } from "next/headers";
import type { DocumentCategorie, MomentPhoto } from "@/generated/prisma/enums";

export type EtatDocument = { erreur?: string; succes?: string; tentative?: number };

function texte(donnees: FormData, champ: string): string {
  const v = donnees.get(champ);
  return typeof v === "string" ? v : "";
}

/**
 * Revalide chaque rattachement fourni contre l'organisation de la session.
 *
 * Sans ce contrôle, on pourrait verser un document au dossier d'un autre
 * artisan en devinant un identifiant.
 */
async function rattachementValide(
  donnees: FormData,
  organizationId: string,
): Promise<{ ok: true; data: Record<string, string | null> } | { ok: false }> {
  const champs = ["clientId", "propertyId", "interventionId", "quoteId", "invoiceId"] as const;
  const data: Record<string, string | null> = {};

  for (const champ of champs) {
    const valeur = texte(donnees, champ);
    data[champ] = valeur || null;
    if (!valeur) continue;

    const existe = await (async () => {
      switch (champ) {
        case "clientId":
          return prisma.client.findFirst({ where: { id: valeur, organizationId }, select: { id: true } });
        case "propertyId":
          return prisma.property.findFirst({ where: { id: valeur, organizationId }, select: { id: true } });
        case "interventionId":
          return prisma.intervention.findFirst({ where: { id: valeur, organizationId }, select: { id: true } });
        case "quoteId":
          return prisma.quote.findFirst({ where: { id: valeur, organizationId }, select: { id: true } });
        case "invoiceId":
          return prisma.invoice.findFirst({ where: { id: valeur, organizationId }, select: { id: true } });
      }
    })();

    if (!existe) return { ok: false };
  }

  return { ok: true, data };
}

const CATEGORIES: DocumentCategorie[] = [
  "PHOTO",
  "DEVIS",
  "FACTURE",
  "ATTESTATION",
  "CONTRAT",
  "NOTICE",
  "BON_INTERVENTION",
  "AUTRE",
];
const MOMENTS: MomentPhoto[] = ["AVANT", "APRES", "AUTRE"];

export async function televerserDocument(
  precedent: EtatDocument,
  donnees: FormData,
): Promise<EtatDocument> {
  const { organizationId, userId, email } = await exigerPermission("document:modifier");

  // Refus explicite plutôt que perte silencieuse : sans stockage configuré, un
  // fichier accepté serait un fichier perdu (§76).
  if (!stockageDisponible()) {
    return { erreur: STOCKAGE_NON_CONFIGURE, tentative: (precedent.tentative ?? 0) + 1 };
  }

  const rattachement = await rattachementValide(donnees, organizationId);
  if (!rattachement.ok) return { erreur: "Ce dossier est introuvable." };

  const fichier = donnees.get("fichier");
  if (!(fichier instanceof File)) return { erreur: "Choisissez un fichier." };

  const validation = await validerFichier(fichier);
  if (!validation.ok) {
    return { erreur: validation.erreur, tentative: (precedent.tentative ?? 0) + 1 };
  }

  // Chemin produit par le SERVEUR : aucune donnée client n'y entre.
  const chemin = genererChemin(organizationId, validation.mimeType);
  const ecriture = await ecrire(chemin, validation.octets);
  if (!ecriture.ok) return { erreur: ecriture.erreur };

  const categorieSaisie = texte(donnees, "categorie") as DocumentCategorie;
  const categorie = CATEGORIES.includes(categorieSaisie) ? categorieSaisie : "AUTRE";
  const momentSaisi = texte(donnees, "moment") as MomentPhoto;
  const moment = MOMENTS.includes(momentSaisi) ? momentSaisi : null;

  const tags = texte(donnees, "tags")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10);

  const document = await prisma.document.create({
    data: {
      categorie,
      moment: categorie === "PHOTO" ? (moment ?? "AUTRE") : null,
      // Le nom d'origine est conservé pour l'AFFICHAGE seulement ; il n'est
      // jamais utilisé comme chemin.
      nomFichier: fichier.name.slice(0, 200) || "document",
      mimeType: validation.mimeType,
      tailleOctets: validation.octets.byteLength,
      cheminStockage: chemin,
      legende: texte(donnees, "legende").trim().slice(0, 500),
      tags,
      versePar: email,
      organizationId,
      ...rattachement.data,
    },
    select: { id: true },
  });

  await journaliser({
    action: "document.uploaded",
    organizationId,
    actorUserId: userId,
    entityType: "Document",
    entityId: document.id,
    metadata: { categorie, mimeType: validation.mimeType, octets: validation.octets.byteLength },
  });

  revalidatePath("/app/documents");
  for (const [champ, valeur] of Object.entries(rattachement.data)) {
    if (!valeur) continue;
    if (champ === "interventionId") revalidatePath(`/app/interventions/${valeur}`);
    if (champ === "propertyId") revalidatePath(`/app/logements/${valeur}`);
    if (champ === "clientId") revalidatePath(`/app/clients/${valeur}`);
  }

  return { succes: "Document enregistré." };
}

export async function supprimerDocument(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("document:supprimer");
  const id = texte(donnees, "id");

  const document = await prisma.document.findFirst({
    where: { id, organizationId },
    select: { cheminStockage: true, interventionId: true, propertyId: true, clientId: true },
  });
  if (!document) return;

  await prisma.document.deleteMany({ where: { id, organizationId } });
  // Le fichier part avec l'entrée : conserver l'un sans l'autre laisserait des
  // données personnelles orphelines (§45).
  await supprimerFichier(document.cheminStockage);

  await journaliser({
    action: "document.deleted",
    organizationId,
    actorUserId: userId,
    entityType: "Document",
    entityId: id,
  });

  revalidatePath("/app/documents");
  if (document.interventionId) revalidatePath(`/app/interventions/${document.interventionId}`);
  if (document.propertyId) revalidatePath(`/app/logements/${document.propertyId}`);
  if (document.clientId) revalidatePath(`/app/clients/${document.clientId}`);
}

/**
 * Appose une signature SIMPLE sur une intervention.
 *
 * L'empreinte du contenu signé est figée : c'est elle qui permettra de
 * démontrer que le bon d'intervention n'a pas changé depuis la signature.
 *
 * Aucune prétention sur la valeur juridique : l'interface indique explicitement
 * qu'il s'agit d'une signature simple.
 */
export async function signerIntervention(
  precedent: EtatDocument,
  donnees: FormData,
): Promise<EtatDocument> {
  const { organizationId, userId } = await exigerPermission("document:signer");
  const interventionId = texte(donnees, "interventionId");
  const signataireNom = texte(donnees, "signataireNom").trim();
  const trace = texte(donnees, "trace");

  if (!signataireNom) {
    return { erreur: "Indiquez le nom du signataire.", tentative: (precedent.tentative ?? 0) + 1 };
  }
  // Une signature vide n'a aucun sens : mieux vaut refuser que d'enregistrer un
  // tracé blanc qui donnerait l'illusion d'un accord.
  if (!trace.startsWith("data:image/png;base64,") || trace.length < 200) {
    return { erreur: "Faites signer dans le cadre prévu.", tentative: (precedent.tentative ?? 0) + 1 };
  }

  const intervention = await prisma.intervention.findFirst({
    where: { id: interventionId, organizationId },
    include: {
      client: { select: { nomAffichage: true } },
      property: { select: { adresse: true, codePostal: true, ville: true } },
      temps: { select: { minutes: true } },
      fournitures: { select: { libelle: true, quantiteMilli: true, unite: true } },
    },
  });
  if (!intervention) return { erreur: "Cette intervention est introuvable." };

  // Le résumé signé est reconstruit ICI, à partir de la base — jamais repris du
  // formulaire. Une empreinte calculée sur un texte fourni par le navigateur ne
  // prouverait rien : elle attesterait de ce que le client a bien voulu envoyer,
  // pas de ce que Plombéo détient.
  const resume = resumerIntervention({
    clientNom: intervention.client.nomAffichage,
    adresse: intervention.property ? adresseCourte(intervention.property) : "",
    probleme: intervention.probleme,
    diagnostic: intervention.diagnostic,
    compteRendu: intervention.compteRendu,
    minutes: totalMinutes(intervention.temps),
    fournitures: intervention.fournitures,
  });

  const userAgent = (await headers()).get("user-agent") ?? "";

  await prisma.signature.create({
    data: {
      signataireNom,
      trace,
      empreinteContenu: empreinteContenu(resume),
      resumeContenu: resume,
      // Minimisation : user-agent tronqué, aucune adresse IP.
      appareil: userAgent.slice(0, 180),
      interventionId,
      organizationId,
    },
  });

  await journaliser({
    action: "signature.created",
    organizationId,
    actorUserId: userId,
    entityType: "Intervention",
    entityId: interventionId,
    metadata: { signataireNom },
  });

  revalidatePath(`/app/interventions/${interventionId}`);
  return { succes: "Signature enregistrée." };
}
