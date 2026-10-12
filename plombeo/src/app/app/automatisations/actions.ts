"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";
import { journaliser } from "@/lib/audit";
import { MODELES_PAR_DEFAUT } from "@/lib/automatisation";
import { mettreEnFile } from "@/lib/moteur";
import { formaterEuros } from "@/lib/calcul";
import { calculerSolde, totalTtc } from "@/lib/facturation";
import { adressePlausible, emailDisponible, EMAIL_NON_CONFIGURE } from "@/lib/email";
import type { DeclencheurAutomatisation } from "@/generated/prisma/enums";

export type EtatAutomatisation = { erreur?: string; succes?: string; tentative?: number };

function texte(donnees: FormData, champ: string): string {
  const v = donnees.get(champ);
  return typeof v === "string" ? v : "";
}

const DECLENCHEURS: DeclencheurAutomatisation[] = [
  "FACTURE_ECHUE",
  "DEVIS_SANS_REPONSE",
  "RENDEZ_VOUS_DEMAIN",
  "INTERVENTION_A_CLOTURER",
];

/**
 * Crée ou met à jour une règle.
 *
 * L'activation est un acte explicite : rien ne part au nom de l'entreprise sans
 * que l'artisan l'ait décidé (§84).
 */
export async function enregistrerRegle(
  precedent: EtatAutomatisation,
  donnees: FormData,
): Promise<EtatAutomatisation> {
  const { organizationId, userId } = await exigerPermission("automatisation:configurer");

  const declencheurSaisi = texte(donnees, "declencheur") as DeclencheurAutomatisation;
  if (!DECLENCHEURS.includes(declencheurSaisi)) {
    return { erreur: "Déclencheur inconnu.", tentative: (precedent.tentative ?? 0) + 1 };
  }

  const delaiJours = Number.parseInt(texte(donnees, "delaiJours"), 10);
  if (!Number.isFinite(delaiJours) || delaiJours < 0 || delaiJours > 365) {
    return {
      erreur: "Le délai doit être un nombre de jours entre 0 et 365.",
      tentative: (precedent.tentative ?? 0) + 1,
    };
  }

  // Le rappel de la veille n'a pas de délai : il vise toujours le lendemain.
  // Accepter une valeur ici afficherait un réglage sans effet, ce qui est pire
  // qu'un réglage absent.
  const delaiEffectif = declencheurSaisi === "RENDEZ_VOUS_DEMAIN" ? 0 : delaiJours;

  const action = texte(donnees, "action") === "ENVOYER_EMAIL" ? "ENVOYER_EMAIL" : "NOTIFIER";
  const active = texte(donnees, "active") === "on";

  // Une règle qui écrit au client alors qu'aucun serveur n'est configuré ne
  // partira jamais : le dire ici vaut mieux que de le découvrir dans la file.
  if (active && action === "ENVOYER_EMAIL" && !emailDisponible()) {
    return { erreur: EMAIL_NON_CONFIGURE, tentative: (precedent.tentative ?? 0) + 1 };
  }

  await prisma.automationRule.upsert({
    where: {
      organizationId_declencheur_delaiJours: {
        organizationId,
        declencheur: declencheurSaisi,
        delaiJours: delaiEffectif,
      },
    },
    create: {
      organizationId,
      declencheur: declencheurSaisi,
      delaiJours: delaiEffectif,
      action,
      active,
      libelle: texte(donnees, "libelle").slice(0, 120),
    },
    update: { action, active, libelle: texte(donnees, "libelle").slice(0, 120) },
  });

  await journaliser({
    action: active ? "automation.rule_enabled" : "automation.rule_disabled",
    organizationId,
    actorUserId: userId,
    entityType: "AutomationRule",
    metadata: { declencheur: declencheurSaisi, delaiJours: delaiEffectif, action },
  });

  revalidatePath("/app/automatisations");
  return { succes: active ? "Règle activée." : "Règle enregistrée, inactive." };
}

export async function basculerRegle(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("automatisation:configurer");
  const id = texte(donnees, "id");

  const regle = await prisma.automationRule.findFirst({ where: { id, organizationId } });
  if (!regle) return;

  // Une règle d'envoi ne s'active pas sans serveur configuré.
  if (!regle.active && regle.action === "ENVOYER_EMAIL" && !emailDisponible()) return;

  await prisma.automationRule.updateMany({
    where: { id, organizationId },
    data: { active: !regle.active },
  });

  await journaliser({
    action: regle.active ? "automation.rule_disabled" : "automation.rule_enabled",
    organizationId,
    actorUserId: userId,
    entityType: "AutomationRule",
    entityId: id,
  });

  revalidatePath("/app/automatisations");
}

export async function enregistrerModele(
  precedent: EtatAutomatisation,
  donnees: FormData,
): Promise<EtatAutomatisation> {
  const { organizationId, userId } = await exigerPermission("automatisation:configurer");

  const cle = texte(donnees, "cle");
  if (!MODELES_PAR_DEFAUT[cle]) {
    return { erreur: "Modèle inconnu.", tentative: (precedent.tentative ?? 0) + 1 };
  }

  const sujet = texte(donnees, "sujet").trim().slice(0, 200);
  const corps = texte(donnees, "corps").trim().slice(0, 5000);
  if (!sujet || !corps) {
    return {
      erreur: "Le sujet et le message ne peuvent pas être vides.",
      tentative: (precedent.tentative ?? 0) + 1,
    };
  }

  await prisma.modeleMessage.upsert({
    where: { organizationId_cle: { organizationId, cle } },
    create: { organizationId, cle, sujet, corps },
    update: { sujet, corps },
  });

  await journaliser({
    action: "automation.template_updated",
    organizationId,
    actorUserId: userId,
    entityType: "ModeleMessage",
    metadata: { cle },
  });

  revalidatePath("/app/automatisations");
  return { succes: "Modèle enregistré." };
}

/** Rétablit le texte livré par défaut. */
export async function reinitialiserModele(donnees: FormData): Promise<void> {
  const { organizationId } = await exigerPermission("automatisation:configurer");
  const cle = texte(donnees, "cle");
  if (!MODELES_PAR_DEFAUT[cle]) return;

  await prisma.modeleMessage.deleteMany({ where: { organizationId, cle } });
  revalidatePath("/app/automatisations");
}

/**
 * Met un devis ou une facture en file d'envoi.
 *
 * Ne l'envoie PAS : la file découple l'action de la disponibilité du serveur
 * SMTP. Émettre une facture ne doit pas échouer parce qu'un serveur d'e-mail
 * est lent.
 */
export async function envoyerDocumentParEmail(
  precedent: EtatAutomatisation,
  donnees: FormData,
): Promise<EtatAutomatisation> {
  const type = texte(donnees, "type");
  const id = texte(donnees, "id");
  const suite = (precedent.tentative ?? 0) + 1;

  if (type !== "devis" && type !== "facture") return { erreur: "Type inconnu." };

  const { organizationId, userId } = await exigerPermission(
    type === "devis" ? "devis:lire" : "facture:lire",
  );

  if (!emailDisponible()) return { erreur: EMAIL_NON_CONFIGURE, tentative: suite };

  const organisation = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organisation) return { erreur: "Organisation introuvable." };

  const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });
  let destinataire: string;
  let variables: Record<string, string>;
  let cleModele: string;

  if (type === "devis") {
    const devis = await prisma.quote.findFirst({
      where: { id, organizationId },
      include: {
        client: true,
        options: { include: { lignes: true }, orderBy: { ordre: "asc" } },
      },
    });
    if (!devis) return { erreur: "Ce devis est introuvable." };

    const { totauxOption } = await import("@/lib/devis");
    destinataire = devis.client.email;
    cleModele = "envoi_devis";
    variables = {
      client: devis.client.nomAffichage,
      entreprise: organisation.nom,
      numero: devis.numero ?? "",
      montant: formaterEuros(totauxOption(devis.options[0]).totalTtcCents),
    };
  } else {
    const facture = await prisma.invoice.findFirst({
      where: { id, organizationId },
      include: {
        client: true,
        lignes: true,
        paiements: { select: { montantCents: true } },
        avoirs: { select: { montantTtcCents: true } },
      },
    });
    if (!facture) return { erreur: "Cette facture est introuvable." };
    if (facture.statut === "BROUILLON") {
      return { erreur: "Émettez la facture avant de l'envoyer.", tentative: suite };
    }

    const solde = calculerSolde(totalTtc(facture), facture.paiements, facture.avoirs);
    destinataire = facture.client.email;
    cleModele = "envoi_facture";
    variables = {
      client: facture.client.nomAffichage,
      entreprise: organisation.nom,
      numero: facture.numero ?? "",
      montant: formaterEuros(solde.duCents),
      echeance: facture.dateEcheance ? formatDate.format(facture.dateEcheance) : "",
    };
  }

  if (!adressePlausible(destinataire)) {
    return {
      erreur: "Ce client n'a pas d'adresse e-mail valide. Renseignez-la sur sa fiche.",
      tentative: suite,
    };
  }

  await mettreEnFile(organizationId, cleModele, variables, destinataire, {
    pieceJointe: `${type}:${id}`,
  });

  await journaliser({
    action: "email.queued",
    organizationId,
    actorUserId: userId,
    entityType: type === "devis" ? "Quote" : "Invoice",
    entityId: id,
    metadata: { destinataire },
  });

  revalidatePath(`/app/${type === "devis" ? "devis" : "factures"}/${id}`);
  // Formulation exacte : le message est EN FILE, il n'est pas encore parti.
  // Annoncer un envoi effectué serait une affirmation fausse (§76).
  return { succes: "Message mis en file d'envoi. Il partira au prochain traitement." };
}

export async function basculerRelancesClient(donnees: FormData): Promise<void> {
  const { organizationId } = await exigerPermission("client:modifier");
  const id = texte(donnees, "id");

  const client = await prisma.client.findFirst({ where: { id, organizationId } });
  if (!client) return;

  await prisma.client.updateMany({
    where: { id, organizationId },
    data: { relancesDesactivees: !client.relancesDesactivees },
  });

  revalidatePath(`/app/clients/${id}`);
}

export async function marquerNotificationLue(donnees: FormData): Promise<void> {
  const { organizationId } = await exigerPermission("notification:lire");
  await prisma.notification.updateMany({
    where: { id: texte(donnees, "id"), organizationId, lueLe: null },
    data: { lueLe: new Date() },
  });
  revalidatePath("/app/notifications");
}

export async function toutMarquerLu(): Promise<void> {
  const { organizationId } = await exigerPermission("notification:lire");
  await prisma.notification.updateMany({
    where: { organizationId, lueLe: null },
    data: { lueLe: new Date() },
  });
  revalidatePath("/app/notifications");
}
