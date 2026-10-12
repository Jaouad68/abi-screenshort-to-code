"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";
import { journaliser } from "@/lib/audit";
import { verifierClientAccessible, verifierLogementAccessible } from "@/lib/crm";
import {
  premiereErreur,
  schemaCompteRendu,
  schemaDemande,
  schemaRendezVous,
} from "@/lib/validation";
import {
  transitionInterventionAutorisee,
  transitionLeadAutorisee,
  transitionRendezVousAutorisee,
} from "@/lib/etats";
import type {
  AppointmentStatut,
  InterventionStatut,
  LeadStatut,
} from "@/generated/prisma/enums";

export type EtatTerrain = {
  erreur?: string;
  succes?: string;
  valeurs?: Record<string, string>;
  tentative?: number;
  /**
   * Conflit de concurrence (Phase 12).
   *
   * Présent quand l'intervention a changé entre l'affichage du formulaire et
   * l'envoi. RIEN n'a été écrit : les deux versions sont retournées pour que
   * l'artisan tranche. Fusionner automatiquement produirait une phrase que
   * personne n'a écrite, sur un document remis au client.
   */
  conflit?: {
    champ: string;
    versionServeur: string;
    versionLocale: string;
    vuLe: string;
  }[];
};

const INTROUVABLE = "Cette fiche est introuvable.";

function texte(donnees: FormData, champ: string): string {
  const valeur = donnees.get(champ);
  return typeof valeur === "string" ? valeur : "";
}

function echec(
  precedent: EtatTerrain,
  erreur: string,
  donnees: FormData,
  champs: readonly string[],
): EtatTerrain {
  return {
    erreur,
    valeurs: Object.fromEntries(champs.map((c) => [c, texte(donnees, c)])),
    tentative: (precedent.tentative ?? 0) + 1,
  };
}

/* -------------------------------------------------------------------------- */
/* Demandes                                                                   */
/* -------------------------------------------------------------------------- */

const CHAMPS_DEMANDE = [
  "description",
  "urgence",
  "contactNom",
  "contactTelephone",
  "clientId",
  "propertyId",
] as const;

export async function creerDemande(
  precedent: EtatTerrain,
  donnees: FormData,
): Promise<EtatTerrain> {
  const { organizationId, userId } = await exigerPermission("intervention:modifier");

  const saisie = schemaDemande.safeParse({
    description: texte(donnees, "description"),
    urgence: texte(donnees, "urgence") || "NORMAL",
    contactNom: texte(donnees, "contactNom"),
    contactTelephone: texte(donnees, "contactTelephone"),
    clientId: texte(donnees, "clientId"),
    propertyId: texte(donnees, "propertyId"),
  });
  if (!saisie.success) {
    return echec(precedent, premiereErreur(saisie.error), donnees, CHAMPS_DEMANDE);
  }

  const { clientId, propertyId, ...reste } = saisie.data;

  // Le client rattaché est facultatif, mais s'il est fourni il doit appartenir
  // à cette organisation.
  if (clientId && !(await verifierClientAccessible(clientId))) {
    return { erreur: INTROUVABLE };
  }
  if (propertyId && !(await verifierLogementAccessible(propertyId))) {
    return { erreur: INTROUVABLE };
  }

  const demande = await prisma.lead.create({
    data: {
      ...reste,
      clientId: clientId || null,
      propertyId: propertyId || null,
      organizationId,
    },
    select: { id: true },
  });

  await journaliser({
    action: "lead.created",
    organizationId,
    actorUserId: userId,
    entityType: "Lead",
    entityId: demande.id,
    metadata: { urgence: reste.urgence },
  });

  redirect("/app/demandes");
}

/**
 * Changement d'état d'une demande.
 *
 * La transition est validée côté serveur : masquer un bouton ne protège rien,
 * une Server Action est un point d'entrée réseau.
 */
export async function changerEtatDemande(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("intervention:modifier");
  const id = texte(donnees, "id");
  const vers = texte(donnees, "vers") as LeadStatut;

  const demande = await prisma.lead.findFirst({
    where: { id, organizationId },
    select: { statut: true },
  });
  if (!demande) redirect("/app/demandes");

  if (!transitionLeadAutorisee(demande.statut, vers)) {
    // Transition refusée : on ne modifie rien et on ramène l'artisan à la liste,
    // plutôt que d'écrire un état incohérent.
    redirect("/app/demandes");
  }

  await prisma.lead.updateMany({ where: { id, organizationId }, data: { statut: vers } });
  await journaliser({
    action: vers === "ABANDONNE" ? "lead.abandoned" : "lead.qualified",
    organizationId,
    actorUserId: userId,
    entityType: "Lead",
    entityId: id,
    metadata: { de: demande.statut, vers },
  });

  revalidatePath("/app/demandes");
  redirect("/app/demandes");
}

/* -------------------------------------------------------------------------- */
/* Rendez-vous                                                                */
/* -------------------------------------------------------------------------- */

const CHAMPS_RDV = [
  "clientId",
  "propertyId",
  "titre",
  "debut",
  "fin",
  "trajetMin",
  "urgence",
  "notes",
  "leadId",
] as const;

export async function creerRendezVous(
  precedent: EtatTerrain,
  donnees: FormData,
): Promise<EtatTerrain> {
  const { organizationId, userId } = await exigerPermission("intervention:modifier");

  const saisie = schemaRendezVous.safeParse({
    clientId: texte(donnees, "clientId"),
    propertyId: texte(donnees, "propertyId"),
    titre: texte(donnees, "titre"),
    debut: texte(donnees, "debut"),
    fin: texte(donnees, "fin"),
    trajetMin: texte(donnees, "trajetMin"),
    urgence: texte(donnees, "urgence") || "NORMAL",
    notes: texte(donnees, "notes"),
  });
  if (!saisie.success) {
    return echec(precedent, premiereErreur(saisie.error), donnees, CHAMPS_RDV);
  }

  const { clientId, propertyId, trajetMin, debut, fin, ...reste } = saisie.data;
  if (!(await verifierClientAccessible(clientId))) return { erreur: INTROUVABLE };
  if (propertyId && !(await verifierLogementAccessible(propertyId))) {
    return { erreur: INTROUVABLE };
  }

  const leadId = texte(donnees, "leadId");

  const rendezVous = await prisma.appointment.create({
    data: {
      ...reste,
      debut: new Date(debut),
      fin: new Date(fin),
      trajetMin: trajetMin === "" ? 0 : Number(trajetMin),
      clientId,
      propertyId: propertyId || null,
      leadId: leadId || null,
      organizationId,
    },
    select: { id: true },
  });

  // Le rendez-vous créé depuis une demande la fait passer en CONVERTI :
  // c'est l'enchaînement « appel → agenda » sans ressaisie (US-5).
  if (leadId) {
    const demande = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
      select: { statut: true },
    });
    if (demande && transitionLeadAutorisee(demande.statut, "CONVERTI")) {
      await prisma.lead.updateMany({
        where: { id: leadId, organizationId },
        data: { statut: "CONVERTI" },
      });
      await journaliser({
        action: "lead.converted",
        organizationId,
        actorUserId: userId,
        entityType: "Lead",
        entityId: leadId,
      });
    }
  }

  await journaliser({
    action: "appointment.created",
    organizationId,
    actorUserId: userId,
    entityType: "Appointment",
    entityId: rendezVous.id,
  });

  redirect("/app/agenda");
}

export async function changerEtatRendezVous(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("intervention:modifier");
  const id = texte(donnees, "id");
  const vers = texte(donnees, "vers") as AppointmentStatut;

  const rdv = await prisma.appointment.findFirst({
    where: { id, organizationId },
    select: { statut: true },
  });
  if (!rdv) redirect("/app/agenda");
  if (!transitionRendezVousAutorisee(rdv.statut, vers)) redirect("/app/agenda");

  await prisma.appointment.updateMany({
    where: { id, organizationId },
    data: { statut: vers },
  });
  await journaliser({
    action: vers === "ANNULE" ? "appointment.cancelled" : "appointment.status_changed",
    organizationId,
    actorUserId: userId,
    entityType: "Appointment",
    entityId: id,
    metadata: { de: rdv.statut, vers },
  });

  revalidatePath("/app/agenda");
  redirect("/app/agenda");
}

/* -------------------------------------------------------------------------- */
/* Interventions                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Démarre l'intervention rattachée à un rendez-vous, en la créant au besoin.
 *
 * C'est le geste « j'arrive sur place » : un seul appui doit suffire, sans
 * formulaire intermédiaire.
 */
export async function demarrerIntervention(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("intervention:modifier");
  const appointmentId = texte(donnees, "appointmentId");

  const rdv = await prisma.appointment.findFirst({
    where: { id: appointmentId, organizationId },
    select: {
      id: true,
      statut: true,
      clientId: true,
      propertyId: true,
      intervention: { select: { id: true, statut: true } },
    },
  });
  if (!rdv) redirect("/app/agenda");

  let interventionId = rdv.intervention?.id;

  if (!interventionId) {
    const creee = await prisma.intervention.create({
      data: {
        statut: "EN_COURS",
        demarreeLe: new Date(),
        appointmentId: rdv.id,
        clientId: rdv.clientId,
        propertyId: rdv.propertyId,
        organizationId,
      },
      select: { id: true },
    });
    interventionId = creee.id;
  } else if (transitionInterventionAutorisee(rdv.intervention!.statut, "EN_COURS")) {
    await prisma.intervention.updateMany({
      where: { id: interventionId, organizationId },
      data: { statut: "EN_COURS", demarreeLe: new Date() },
    });
  }

  if (transitionRendezVousAutorisee(rdv.statut, "EN_COURS")) {
    await prisma.appointment.updateMany({
      where: { id: rdv.id, organizationId },
      data: { statut: "EN_COURS" },
    });
  }

  await journaliser({
    action: "intervention.started",
    organizationId,
    actorUserId: userId,
    entityType: "Intervention",
    entityId: interventionId,
  });

  redirect(`/app/interventions/${interventionId}`);
}

export async function changerEtatIntervention(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("intervention:modifier");
  const id = texte(donnees, "id");
  const vers = texte(donnees, "vers") as InterventionStatut;

  const intervention = await prisma.intervention.findFirst({
    where: { id, organizationId },
    select: { statut: true, appointmentId: true },
  });
  if (!intervention) redirect("/app/agenda");
  if (!transitionInterventionAutorisee(intervention.statut, vers)) {
    redirect(`/app/interventions/${id}`);
  }

  const horodatage =
    vers === "TERMINEE"
      ? { termineeLe: new Date() }
      : vers === "CLOTUREE"
        ? { clotureeLe: new Date() }
        : {};

  await prisma.intervention.updateMany({
    where: { id, organizationId },
    data: { statut: vers, ...horodatage },
  });

  // Terminer l'intervention termine le rendez-vous : l'artisan ne doit pas
  // avoir à le faire deux fois.
  if (vers === "TERMINEE" && intervention.appointmentId) {
    const rdv = await prisma.appointment.findFirst({
      where: { id: intervention.appointmentId, organizationId },
      select: { statut: true },
    });
    if (rdv && transitionRendezVousAutorisee(rdv.statut, "TERMINE")) {
      await prisma.appointment.updateMany({
        where: { id: intervention.appointmentId, organizationId },
        data: { statut: "TERMINE" },
      });
    }
  }

  await journaliser({
    action: vers === "CLOTUREE" ? "intervention.closed" : "intervention.completed",
    organizationId,
    actorUserId: userId,
    entityType: "Intervention",
    entityId: id,
    metadata: { de: intervention.statut, vers },
  });

  revalidatePath(`/app/interventions/${id}`);
  redirect(`/app/interventions/${id}`);
}

export async function enregistrerCompteRendu(
  precedent: EtatTerrain,
  donnees: FormData,
): Promise<EtatTerrain> {
  const { organizationId, userId } = await exigerPermission("intervention:modifier");
  const id = texte(donnees, "id");

  const saisie = schemaCompteRendu.safeParse({
    probleme: texte(donnees, "probleme"),
    diagnostic: texte(donnees, "diagnostic"),
    compteRendu: texte(donnees, "compteRendu"),
  });
  if (!saisie.success) {
    return echec(precedent, premiereErreur(saisie.error), donnees, [
      "probleme",
      "diagnostic",
      "compteRendu",
    ]);
  }

  // Jeton de version (Phase 12). Son absence est REFUSÉE plutôt que tolérée :
  // accepter un appel sans jeton rouvrirait la faille du « dernier écrit
  // gagne » au premier formulaire qui l'oublie.
  const vuLe = texte(donnees, "vuLe");
  if (!vuLe) {
    return { erreur: "Rechargez la page avant d'enregistrer." };
  }

  const actuelle = await prisma.intervention.findFirst({
    where: { id, organizationId },
    select: { updatedAt: true, probleme: true, diagnostic: true, compteRendu: true },
  });
  if (!actuelle) return { erreur: "Cette intervention est introuvable." };

  // Concurrence optimiste : l'écriture n'est appliquée que si l'intervention
  // n'a pas bougé depuis l'affichage du formulaire.
  if (actuelle.updatedAt.toISOString() !== vuLe) {
    const champs = ["probleme", "diagnostic", "compteRendu"] as const;
    const conflit = champs
      .filter((champ) => actuelle[champ] !== saisie.data[champ])
      .map((champ) => ({
        champ,
        versionServeur: actuelle[champ],
        versionLocale: saisie.data[champ],
        vuLe: actuelle.updatedAt.toISOString(),
      }));

    // Modifiée entre-temps, mais sans divergence sur ces champs : rien à
    // arbitrer, on laisse passer avec le jeton rafraîchi.
    if (conflit.length > 0) {
      return {
        erreur:
          "Cette intervention a été modifiée ailleurs entre-temps. " +
          "Rien n'a été écrasé : choisissez la version à conserver.",
        conflit,
        valeurs: saisie.data,
      };
    }
  }

  const resultat = await prisma.intervention.updateMany({
    where: {
      id,
      organizationId,
      statut: { notIn: ["CLOTUREE", "ANNULEE"] },
      // Le jeton est REVÉRIFIÉ dans la clause d'écriture : entre la lecture
      // ci-dessus et cette mise à jour, une autre écriture a pu passer. C'est
      // la base qui arbitre, pas la lecture applicative.
      updatedAt: actuelle.updatedAt,
    },
    data: saisie.data,
  });
  if (resultat.count === 0) {
    const encore = await prisma.intervention.findFirst({
      where: { id, organizationId },
      select: { statut: true },
    });
    if (encore && (encore.statut === "CLOTUREE" || encore.statut === "ANNULEE")) {
      return {
        erreur: "Cette intervention est clôturée : son compte rendu ne peut plus être modifié.",
      };
    }
    return { erreur: "Une autre modification est arrivée pendant l'envoi. Rechargez la page." };
  }

  await journaliser({
    action: "intervention.updated",
    organizationId,
    actorUserId: userId,
    entityType: "Intervention",
    entityId: id,
  });

  revalidatePath(`/app/interventions/${id}`);
  return { succes: "Compte rendu enregistré." };
}

/** Suppression d'une ligne de contenu (tâche, temps, fourniture). */
export async function supprimerLigne(donnees: FormData): Promise<void> {
  const { organizationId } = await exigerPermission("intervention:modifier");
  const type = texte(donnees, "typeLigne");
  const id = texte(donnees, "id");
  const interventionId = texte(donnees, "interventionId");

  if (type === "tache") {
    await prisma.interventionTask.deleteMany({ where: { id, organizationId } });
  } else if (type === "temps") {
    await prisma.timeEntry.deleteMany({ where: { id, organizationId } });
  } else if (type === "fourniture") {
    await prisma.interventionSupply.deleteMany({ where: { id, organizationId } });
  }

  revalidatePath(`/app/interventions/${interventionId}`);
}

/** Coche ou décoche une tâche. */
export async function basculerTache(donnees: FormData): Promise<void> {
  const { organizationId } = await exigerPermission("intervention:modifier");
  const id = texte(donnees, "id");
  const interventionId = texte(donnees, "interventionId");

  const tache = await prisma.interventionTask.findFirst({
    where: { id, organizationId },
    select: { faite: true },
  });
  if (tache) {
    await prisma.interventionTask.updateMany({
      where: { id, organizationId },
      data: { faite: !tache.faite },
    });
  }

  revalidatePath(`/app/interventions/${interventionId}`);
}
