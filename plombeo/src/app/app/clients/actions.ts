"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";
import { journaliser } from "@/lib/audit";
import { verifierClientAccessible, verifierLogementAccessible } from "@/lib/crm";
import {
  calculerNomAffichage,
  premiereErreur,
  schemaClient,
  schemaEquipement,
  schemaLogement,
  versDate,
} from "@/lib/validation";

/**
 * État renvoyé par les Server Actions de formulaire.
 *
 * `valeurs` et `tentative` existent pour un motif précis : React 19 réinitialise
 * un formulaire après l'exécution de son action. Sans réémission de la saisie,
 * une simple erreur de validation viderait tous les champs — inacceptable sur un
 * formulaire de dix champs rempli au pouce sur un chantier.
 *
 * `tentative` sert de clé de remontage côté client, pour que les nouvelles
 * valeurs par défaut soient réellement appliquées après la réinitialisation.
 */
export type EtatCrm = {
  erreur?: string;
  succes?: string;
  valeurs?: Record<string, string>;
  tentative?: number;
};

/** Rejoue la saisie brute pour la réafficher telle quelle après une erreur. */
function saisieBrute(donnees: FormData, champs: readonly string[]): Record<string, string> {
  return Object.fromEntries(champs.map((champ) => [champ, texte(donnees, champ)]));
}

function echec(
  precedent: EtatCrm,
  erreur: string,
  donnees: FormData,
  champs: readonly string[],
): EtatCrm {
  return {
    erreur,
    valeurs: saisieBrute(donnees, champs),
    tentative: (precedent.tentative ?? 0) + 1,
  };
}

/**
 * Message renvoyé lorsqu'un identifiant ne correspond à rien DANS CETTE
 * ORGANISATION — que la ressource n'existe pas ou qu'elle appartienne à un
 * autre artisan. Les deux cas sont volontairement indiscernables : un message
 * différent confirmerait l'existence d'une fiche chez quelqu'un d'autre.
 */
const INTROUVABLE = "Cette fiche est introuvable.";

function texte(donnees: FormData, champ: string): string {
  const valeur = donnees.get(champ);
  return typeof valeur === "string" ? valeur : "";
}

/* -------------------------------------------------------------------------- */
/* Clients                                                                    */
/* -------------------------------------------------------------------------- */

const CHAMPS_CLIENT = [
  "type",
  "civilite",
  "prenom",
  "nom",
  "raisonSociale",
  "siret",
  "tvaIntracommunautaire",
  "contactNom",
  "email",
  "telephone",
  "telephoneSecondaire",
  "adresse",
  "codePostal",
  "ville",
  "notes",
] as const;

function lireFormulaireClient(donnees: FormData) {
  return schemaClient.safeParse({
    type: texte(donnees, "type") || "PARTICULIER",
    civilite: texte(donnees, "civilite"),
    prenom: texte(donnees, "prenom"),
    nom: texte(donnees, "nom"),
    raisonSociale: texte(donnees, "raisonSociale"),
    siret: texte(donnees, "siret"),
    tvaIntracommunautaire: texte(donnees, "tvaIntracommunautaire"),
    contactNom: texte(donnees, "contactNom"),
    email: texte(donnees, "email"),
    telephone: texte(donnees, "telephone"),
    telephoneSecondaire: texte(donnees, "telephoneSecondaire"),
    adresse: texte(donnees, "adresse"),
    codePostal: texte(donnees, "codePostal"),
    ville: texte(donnees, "ville"),
    notes: texte(donnees, "notes"),
  });
}

export async function creerClient(_precedent: EtatCrm, donnees: FormData): Promise<EtatCrm> {
  const { organizationId, userId } = await exigerPermission("client:modifier");

  const saisie = lireFormulaireClient(donnees);
  if (!saisie.success) {
    return echec(_precedent, premiereErreur(saisie.error), donnees, CHAMPS_CLIENT);
  }

  const client = await prisma.client.create({
    data: {
      ...saisie.data,
      nomAffichage: calculerNomAffichage(saisie.data),
      organizationId,
    },
    select: { id: true },
  });

  await journaliser({
    action: "client.created",
    organizationId,
    actorUserId: userId,
    entityType: "Client",
    entityId: client.id,
  });

  redirect(`/app/clients/${client.id}`);
}

export async function mettreAJourClient(_precedent: EtatCrm, donnees: FormData): Promise<EtatCrm> {
  const { organizationId, userId } = await exigerPermission("client:modifier");
  const id = texte(donnees, "id");

  const saisie = lireFormulaireClient(donnees);
  if (!saisie.success) {
    return echec(_precedent, premiereErreur(saisie.error), donnees, CHAMPS_CLIENT);
  }

  // `updateMany` avec le filtre d'organisation : une mise à jour visant la fiche
  // d'un autre artisan touche 0 ligne au lieu d'écrire.
  const resultat = await prisma.client.updateMany({
    where: { id, organizationId },
    data: { ...saisie.data, nomAffichage: calculerNomAffichage(saisie.data) },
  });
  if (resultat.count === 0) return { erreur: INTROUVABLE };

  await journaliser({
    action: "client.updated",
    organizationId,
    actorUserId: userId,
    entityType: "Client",
    entityId: id,
  });

  redirect(`/app/clients/${id}`);
}

export async function archiverClient(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("client:archiver");
  const id = texte(donnees, "id");

  const resultat = await prisma.client.updateMany({
    where: { id, organizationId, archivedAt: null },
    data: { archivedAt: new Date() },
  });
  if (resultat.count === 0) redirect("/app/clients");

  await journaliser({
    action: "client.archived",
    organizationId,
    actorUserId: userId,
    entityType: "Client",
    entityId: id,
  });
  revalidatePath("/app/clients");
  redirect(`/app/clients/${id}`);
}

export async function restaurerClient(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("client:archiver");
  const id = texte(donnees, "id");

  await prisma.client.updateMany({
    where: { id, organizationId, archivedAt: { not: null } },
    data: { archivedAt: null },
  });

  await journaliser({
    action: "client.restored",
    organizationId,
    actorUserId: userId,
    entityType: "Client",
    entityId: id,
  });
  revalidatePath("/app/clients");
  redirect(`/app/clients/${id}`);
}

/**
 * Suppression définitive.
 *
 * Réservée au propriétaire et confirmée explicitement par la saisie du nom du
 * client : une suppression en cascade (logements, équipements) ne doit pas
 * pouvoir se déclencher par un clic malheureux sur un téléphone.
 *
 * Depuis la Phase 5, elle est REFUSÉE si le client porte au moins une facture
 * émise : les pièces comptables sont soumises à des obligations de conservation
 * [À VÉRIFIER — SOURCE OFFICIELLE], et la suppression en cascade les emporterait.
 */
export async function supprimerClient(_precedent: EtatCrm, donnees: FormData): Promise<EtatCrm> {
  const { organizationId, userId } = await exigerPermission("client:supprimer");
  const id = texte(donnees, "id");
  const confirmation = texte(donnees, "confirmation").trim();

  const client = await prisma.client.findFirst({
    where: { id, organizationId },
    select: { nomAffichage: true },
  });
  if (!client) return { erreur: INTROUVABLE };

  if (confirmation.toLowerCase() !== client.nomAffichage.trim().toLowerCase()) {
    return { erreur: "Saisissez exactement le nom du client pour confirmer la suppression." };
  }

  // Garde-fou comptable : une facture émise est une pièce à conserver.
  // L'archivage reste possible, la suppression non.
  const facturesEmises = await prisma.invoice.count({
    where: { clientId: id, organizationId, statut: { not: "BROUILLON" } },
  });
  if (facturesEmises > 0) {
    return {
      erreur:
        `Ce client porte ${facturesEmises} facture(s) émise(s), qui doivent être conservées. ` +
        "Archivez-le plutôt que de le supprimer.",
    };
  }

  await prisma.client.deleteMany({ where: { id, organizationId } });

  await journaliser({
    action: "client.deleted",
    organizationId,
    actorUserId: userId,
    entityType: "Client",
    entityId: id,
    metadata: { nomAffichage: client.nomAffichage },
  });

  redirect("/app/clients");
}

/* -------------------------------------------------------------------------- */
/* Consentements                                                              */
/* -------------------------------------------------------------------------- */

export async function definirConsentement(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("client:modifier");
  const clientId = texte(donnees, "clientId");
  const type = texte(donnees, "type");
  const accorde = texte(donnees, "accorde") === "true";

  if (type !== "EMAIL_COMMERCIAL" && type !== "SMS_COMMERCIAL") return;
  if (!(await verifierClientAccessible(clientId))) return;

  await prisma.consent.upsert({
    where: { clientId_type: { clientId, type } },
    create: { clientId, type, accorde, organizationId, modifieLe: new Date() },
    update: { accorde, modifieLe: new Date() },
  });

  await journaliser({
    action: "consent.updated",
    organizationId,
    actorUserId: userId,
    entityType: "Consent",
    entityId: clientId,
    metadata: { type, accorde },
  });

  revalidatePath(`/app/clients/${clientId}`);
}

/* -------------------------------------------------------------------------- */
/* Logements                                                                  */
/* -------------------------------------------------------------------------- */

const CHAMPS_LOGEMENT = [
  "libelle", "type", "adresse", "complement", "codePostal", "ville",
  "etage", "digicode", "interphone", "instructionsAcces", "anneeConstruction", "notes",
] as const;

function lireFormulaireLogement(donnees: FormData) {
  return schemaLogement.safeParse({
    libelle: texte(donnees, "libelle"),
    type: texte(donnees, "type") || "MAISON",
    adresse: texte(donnees, "adresse"),
    complement: texte(donnees, "complement"),
    codePostal: texte(donnees, "codePostal"),
    ville: texte(donnees, "ville"),
    etage: texte(donnees, "etage"),
    digicode: texte(donnees, "digicode"),
    interphone: texte(donnees, "interphone"),
    instructionsAcces: texte(donnees, "instructionsAcces"),
    anneeConstruction: texte(donnees, "anneeConstruction"),
    notes: texte(donnees, "notes"),
  });
}

export async function creerLogement(_precedent: EtatCrm, donnees: FormData): Promise<EtatCrm> {
  const { organizationId, userId } = await exigerPermission("client:modifier");
  const clientId = texte(donnees, "clientId");

  // Le client parent est revalidé : sans ce contrôle, on pourrait rattacher un
  // logement à la fiche d'un autre artisan en devinant son identifiant.
  if (!(await verifierClientAccessible(clientId))) return { erreur: INTROUVABLE };

  const saisie = lireFormulaireLogement(donnees);
  if (!saisie.success) {
    return echec(_precedent, premiereErreur(saisie.error), donnees, CHAMPS_LOGEMENT);
  }

  const { anneeConstruction, ...reste } = saisie.data;
  const logement = await prisma.property.create({
    data: {
      ...reste,
      anneeConstruction: anneeConstruction === "" ? null : Number(anneeConstruction),
      clientId,
      organizationId,
    },
    select: { id: true },
  });

  await journaliser({
    action: "property.created",
    organizationId,
    actorUserId: userId,
    entityType: "Property",
    entityId: logement.id,
  });

  redirect(`/app/logements/${logement.id}`);
}

export async function mettreAJourLogement(_precedent: EtatCrm, donnees: FormData): Promise<EtatCrm> {
  const { organizationId, userId } = await exigerPermission("client:modifier");
  const id = texte(donnees, "id");

  const saisie = lireFormulaireLogement(donnees);
  if (!saisie.success) {
    return echec(_precedent, premiereErreur(saisie.error), donnees, CHAMPS_LOGEMENT);
  }

  const { anneeConstruction, ...reste } = saisie.data;
  const resultat = await prisma.property.updateMany({
    where: { id, organizationId },
    data: {
      ...reste,
      anneeConstruction: anneeConstruction === "" ? null : Number(anneeConstruction),
    },
  });
  if (resultat.count === 0) return { erreur: INTROUVABLE };

  await journaliser({
    action: "property.updated",
    organizationId,
    actorUserId: userId,
    entityType: "Property",
    entityId: id,
  });

  redirect(`/app/logements/${id}`);
}

export async function archiverLogement(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("client:archiver");
  const id = texte(donnees, "id");
  const clientId = texte(donnees, "clientId");

  await prisma.property.updateMany({
    where: { id, organizationId, archivedAt: null },
    data: { archivedAt: new Date() },
  });

  await journaliser({
    action: "property.archived",
    organizationId,
    actorUserId: userId,
    entityType: "Property",
    entityId: id,
  });

  redirect(`/app/clients/${clientId}`);
}

/* -------------------------------------------------------------------------- */
/* Équipements                                                                */
/* -------------------------------------------------------------------------- */

const CHAMPS_EQUIPEMENT = [
  "categorie", "marque", "modele", "numeroSerie", "localisation",
  "datePose", "finGarantie", "prochainEntretien", "notes",
] as const;

function lireFormulaireEquipement(donnees: FormData) {
  return schemaEquipement.safeParse({
    categorie: texte(donnees, "categorie") || "AUTRE",
    marque: texte(donnees, "marque"),
    modele: texte(donnees, "modele"),
    numeroSerie: texte(donnees, "numeroSerie"),
    localisation: texte(donnees, "localisation"),
    datePose: texte(donnees, "datePose"),
    finGarantie: texte(donnees, "finGarantie"),
    prochainEntretien: texte(donnees, "prochainEntretien"),
    notes: texte(donnees, "notes"),
  });
}

export async function creerEquipement(_precedent: EtatCrm, donnees: FormData): Promise<EtatCrm> {
  const { organizationId, userId } = await exigerPermission("client:modifier");
  const propertyId = texte(donnees, "propertyId");

  if (!(await verifierLogementAccessible(propertyId))) return { erreur: INTROUVABLE };

  const saisie = lireFormulaireEquipement(donnees);
  if (!saisie.success) {
    return echec(_precedent, premiereErreur(saisie.error), donnees, CHAMPS_EQUIPEMENT);
  }

  const equipement = await prisma.equipment.create({
    data: {
      ...saisie.data,
      datePose: versDate(saisie.data.datePose),
      finGarantie: versDate(saisie.data.finGarantie),
      prochainEntretien: versDate(saisie.data.prochainEntretien),
      propertyId,
      organizationId,
    },
    select: { id: true },
  });

  await journaliser({
    action: "equipment.created",
    organizationId,
    actorUserId: userId,
    entityType: "Equipment",
    entityId: equipement.id,
  });

  revalidatePath(`/app/logements/${propertyId}`);
  return { succes: "Équipement ajouté au carnet technique." };
}

export async function supprimerEquipement(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("client:modifier");
  const id = texte(donnees, "id");
  const propertyId = texte(donnees, "propertyId");

  const resultat = await prisma.equipment.deleteMany({ where: { id, organizationId } });
  if (resultat.count > 0) {
    await journaliser({
      action: "equipment.deleted",
      organizationId,
      actorUserId: userId,
      entityType: "Equipment",
      entityId: id,
    });
  }

  revalidatePath(`/app/logements/${propertyId}`);
}
