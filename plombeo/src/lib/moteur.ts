import "server-only";
import { prisma } from "@/lib/prisma";
import { calculerSolde, totalTtc } from "@/lib/facturation";
import { formaterEuros } from "@/lib/calcul";
import { adressePlausible } from "@/lib/email";
import {
  cleIdempotence,
  dansFenetreEnvoi,
  MODELES_PAR_DEFAUT,
  relanceAutorisee,
  remplir,
  type Variables,
} from "@/lib/automatisation";
import type { DeclencheurAutomatisation } from "@/generated/prisma/enums";

/**
 * MOTEUR D'AUTOMATISATION — balayage (Phase 7).
 *
 * Les déclencheurs sont évalués par BALAYAGE PÉRIODIQUE, jamais sur événement.
 * Un événement manqué — serveur redémarré, cron sauté — serait perdu à jamais ;
 * un balayage rattrape naturellement son retard, et la clé d'idempotence
 * empêche le doublon quand il repasse sur ce qu'il a déjà traité.
 *
 * Aucune règle n'est active à l'installation : Plombéo n'envoie rien tant que
 * l'artisan ne l'a pas décidé (§84).
 */

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export type Bilan = {
  reglesEvaluees: number;
  executions: number;
  ecartees: number;
  notifications: number;
  emailsEnFile: number;
};

const BILAN_VIDE: Bilan = {
  reglesEvaluees: 0,
  executions: 0,
  ecartees: 0,
  notifications: 0,
  emailsEnFile: 0,
};

/**
 * Enregistre une exécution si elle n'existe pas déjà.
 *
 * Retourne `false` si la clé était déjà prise — c'est-à-dire si le balayage
 * précédent a déjà traité cette occurrence. Le `catch` sur la violation de
 * contrainte est volontaire : c'est la BASE qui arbitre entre deux balayages
 * concurrents, pas une lecture préalable qui verrait tous deux « rien à faire ».
 */
async function reserverExecution(entree: {
  cle: string;
  ruleId: string;
  organizationId: string;
  entiteType: string;
  entiteId: string;
  etat: "REUSSIE" | "ECARTEE";
  motif: string;
}): Promise<boolean> {
  try {
    await prisma.automationExecution.create({
      data: {
        cleIdempotence: entree.cle,
        ruleId: entree.ruleId,
        organizationId: entree.organizationId,
        entiteType: entree.entiteType,
        entiteId: entree.entiteId,
        etat: entree.etat,
        motif: entree.motif,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Une exécution écartée est TRACÉE, pas oubliée.
 *
 * Une automatisation qui ne fait rien sans dire pourquoi est indiscernable
 * d'une automatisation en panne. L'artisan doit pouvoir lire « relance non
 * envoyée : aucune adresse e-mail pour ce client ».
 *
 * Les motifs temporaires (hors plage d'envoi, délai non atteint) ne sont PAS
 * tracés : ils redeviendront vrais au prochain balayage, et les figer bloquerait
 * l'envoi pour toujours.
 */
function motifDefinitif(motif: string): boolean {
  return !motif.includes("plage d'envoi") && !motif.includes("règle à");
}

/* -------------------------------------------------------------------------- */
/* Relance des factures échues                                                */
/* -------------------------------------------------------------------------- */

async function balayerFacturesEchues(
  regle: { id: string; organizationId: string; delaiJours: number; action: string },
  maintenant: Date,
  bilan: Bilan,
): Promise<void> {
  const factures = await prisma.invoice.findMany({
    where: {
      organizationId: regle.organizationId,
      statut: { in: ["EMISE", "ENVOYEE", "PARTIELLEMENT_PAYEE"] },
      dateEcheance: { not: null, lt: maintenant },
    },
    include: {
      client: true,
      lignes: true,
      paiements: { select: { montantCents: true } },
      avoirs: { select: { montantTtcCents: true } },
    },
    take: 500,
  });

  const organisation = await prisma.organization.findUnique({
    where: { id: regle.organizationId },
  });
  if (!organisation) return;

  for (const facture of factures) {
    const solde = calculerSolde(totalTtc(facture), facture.paiements, facture.avoirs);

    // Combien de relances sont déjà parties pour cette facture, toutes règles
    // confondues : le plafond porte sur la FACTURE, pas sur la règle.
    const precedentes = await prisma.automationExecution.findMany({
      where: {
        organizationId: regle.organizationId,
        entiteType: "Invoice",
        entiteId: facture.id,
        etat: "REUSSIE",
      },
      orderBy: { executeeLe: "desc" },
      select: { executeeLe: true },
    });

    const eligibilite = relanceAutorisee(
      {
        resteCents: solde.resteCents,
        dateEcheance: facture.dateEcheance,
        clientRelancesDesactivees: facture.client.relancesDesactivees,
        clientEmail: facture.client.email,
        relancesDejaEnvoyees: precedentes.length,
        derniereRelanceLe: precedentes[0]?.executeeLe ?? null,
      },
      regle.delaiJours,
      maintenant,
    );

    const cle = cleIdempotence("FACTURE_ECHUE", facture.id, regle.delaiJours);

    if (!eligibilite.eligible) {
      if (motifDefinitif(eligibilite.motif)) {
        const reservee = await reserverExecution({
          cle,
          ruleId: regle.id,
          organizationId: regle.organizationId,
          entiteType: "Invoice",
          entiteId: facture.id,
          etat: "ECARTEE",
          motif: eligibilite.motif,
        });
        if (reservee) bilan.ecartees += 1;
      }
      continue;
    }

    // Réservation AVANT l'action : si l'envoi échoue, la relance ne repart pas
    // en boucle au balayage suivant. Un e-mail non parti se rejoue depuis la
    // file, pas depuis le moteur.
    const reservee = await reserverExecution({
      cle,
      ruleId: regle.id,
      organizationId: regle.organizationId,
      entiteType: "Invoice",
      entiteId: facture.id,
      etat: "REUSSIE",
      motif: "",
    });
    if (!reservee) continue;

    bilan.executions += 1;

    const variables: Variables = {
      client: facture.client.nomAffichage,
      entreprise: organisation.nom,
      numero: facture.numero ?? "",
      montant: formaterEuros(solde.resteCents),
      dateFacture: formatDate.format(facture.dateFacture),
      echeance: facture.dateEcheance ? formatDate.format(facture.dateEcheance) : "",
    };

    await creerNotification(regle.organizationId, {
      titre: `Relance : facture ${facture.numero}`,
      corps: `${facture.client.nomAffichage} — ${formaterEuros(solde.resteCents)} restant dû.`,
      lien: `/app/factures/${facture.id}`,
    });
    bilan.notifications += 1;

    if (regle.action === "ENVOYER_EMAIL") {
      await mettreEnFile(regle.organizationId, "relance_facture", variables, facture.client.email, {
        pieceJointe: `facture:${facture.id}`,
      });
      bilan.emailsEnFile += 1;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Autres déclencheurs                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Déclencheurs internes : ils n'écrivent jamais au client, seulement à
 * l'artisan. Aucun garde-fou de relance ne s'y applique — se notifier soi-même
 * n'abîme aucune relation.
 */
async function balayerRappelsInternes(
  regle: {
    id: string;
    organizationId: string;
    delaiJours: number;
    declencheur: DeclencheurAutomatisation;
  },
  maintenant: Date,
  bilan: Bilan,
): Promise<void> {
  const JOUR = 24 * 60 * 60 * 1000;

  if (regle.declencheur === "RENDEZ_VOUS_DEMAIN") {
    const debut = new Date(maintenant.getTime() + JOUR);
    debut.setHours(0, 0, 0, 0);
    const fin = new Date(debut.getTime() + JOUR);

    const rendezVous = await prisma.appointment.findMany({
      where: {
        organizationId: regle.organizationId,
        statut: { in: ["PLANIFIE", "CONFIRME"] },
        debut: { gte: debut, lt: fin },
      },
      include: { client: { select: { nomAffichage: true } } },
      take: 200,
    });

    for (const rdv of rendezVous) {
      // L'occurrence est le JOUR visé : le même rendez-vous rappelé deux jours
      // de suite serait deux rappels légitimes, le même jour non.
      const cle = cleIdempotence("RENDEZ_VOUS_DEMAIN", rdv.id, debut.getTime());
      const reservee = await reserverExecution({
        cle,
        ruleId: regle.id,
        organizationId: regle.organizationId,
        entiteType: "Appointment",
        entiteId: rdv.id,
        etat: "REUSSIE",
        motif: "",
      });
      if (!reservee) continue;

      bilan.executions += 1;
      await creerNotification(regle.organizationId, {
        titre: "Rendez-vous demain",
        corps: `${rdv.client.nomAffichage} — ${rdv.titre}`,
        lien: `/app/agenda`,
      });
      bilan.notifications += 1;
    }
    return;
  }

  if (regle.declencheur === "INTERVENTION_A_CLOTURER") {
    const limite = new Date(maintenant.getTime() - regle.delaiJours * JOUR);
    const interventions = await prisma.intervention.findMany({
      where: {
        organizationId: regle.organizationId,
        statut: "TERMINEE",
        termineeLe: { not: null, lt: limite },
      },
      include: { client: { select: { nomAffichage: true } } },
      take: 200,
    });

    for (const intervention of interventions) {
      const cle = cleIdempotence("INTERVENTION_A_CLOTURER", intervention.id, regle.delaiJours);
      const reservee = await reserverExecution({
        cle,
        ruleId: regle.id,
        organizationId: regle.organizationId,
        entiteType: "Intervention",
        entiteId: intervention.id,
        etat: "REUSSIE",
        motif: "",
      });
      if (!reservee) continue;

      bilan.executions += 1;
      await creerNotification(regle.organizationId, {
        titre: "Intervention à clôturer",
        corps: `${intervention.client.nomAffichage} — terminée depuis plus de ${regle.delaiJours} j.`,
        lien: `/app/interventions/${intervention.id}`,
      });
      bilan.notifications += 1;
    }
    return;
  }

  if (regle.declencheur === "DEVIS_SANS_REPONSE") {
    const limite = new Date(maintenant.getTime() - regle.delaiJours * JOUR);
    const devis = await prisma.quote.findMany({
      where: {
        organizationId: regle.organizationId,
        statut: "ENVOYE",
        envoyeLe: { not: null, lt: limite },
      },
      include: { client: { select: { nomAffichage: true } } },
      take: 200,
    });

    for (const d of devis) {
      const cle = cleIdempotence("DEVIS_SANS_REPONSE", d.id, regle.delaiJours);
      const reservee = await reserverExecution({
        cle,
        ruleId: regle.id,
        organizationId: regle.organizationId,
        entiteType: "Quote",
        entiteId: d.id,
        etat: "REUSSIE",
        motif: "",
      });
      if (!reservee) continue;

      bilan.executions += 1;
      await creerNotification(regle.organizationId, {
        titre: `Devis sans réponse : ${d.numero ?? ""}`,
        corps: `${d.client.nomAffichage} — envoyé il y a plus de ${regle.delaiJours} j.`,
        lien: `/app/devis/${d.id}`,
      });
      bilan.notifications += 1;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Notifications et file d'e-mails                                            */
/* -------------------------------------------------------------------------- */

export async function creerNotification(
  organizationId: string,
  notification: { titre: string; corps: string; lien: string },
): Promise<void> {
  await prisma.notification.create({ data: { ...notification, organizationId } });
}

/** Place un message en file. L'envoi réel est fait plus tard, par la file. */
export async function mettreEnFile(
  organizationId: string,
  cleModele: string,
  variables: Variables,
  destinataire: string,
  options: { pieceJointe?: string } = {},
): Promise<void> {
  const personnalise = await prisma.modeleMessage.findUnique({
    where: { organizationId_cle: { organizationId, cle: cleModele } },
  });
  const defaut = MODELES_PAR_DEFAUT[cleModele];
  const modele = personnalise ?? defaut;
  if (!modele) return;

  await prisma.emailMessage.create({
    data: {
      organizationId,
      destinataire,
      sujet: remplir(modele.sujet, variables),
      corps: remplir(modele.corps, variables),
      pieceJointe: options.pieceJointe ?? "",
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Balayage                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Passe les règles actives.
 *
 * Appelé par le cron, jamais par une session : c'est la seule fonction du projet
 * qui traverse les organisations, et c'est pourquoi elle n'est atteignable que
 * par un secret partagé.
 *
 * `organizationId` restreint le balayage à une seule organisation. Le cron ne
 * s'en sert pas — il passe tout le monde — mais rejouer le moteur pour un seul
 * artisan est utile au diagnostic, et rend le bilan interprétable : sans ce
 * filtre, les compteurs agrègent toutes les organisations et ne disent rien de
 * l'une d'elles.
 */
export async function balayer(
  maintenant = new Date(),
  organizationId?: string,
): Promise<Bilan> {
  const bilan: Bilan = { ...BILAN_VIDE };

  const regles = await prisma.automationRule.findMany({
    where: { active: true, ...(organizationId ? { organizationId } : {}) },
  });

  for (const regle of regles) {
    bilan.reglesEvaluees += 1;
    if (regle.declencheur === "FACTURE_ECHUE") {
      await balayerFacturesEchues(regle, maintenant, bilan);
    } else {
      await balayerRappelsInternes(regle, maintenant, bilan);
    }
  }

  return bilan;
}

/* -------------------------------------------------------------------------- */
/* Vidage de la file d'e-mails                                                */
/* -------------------------------------------------------------------------- */

export type BilanFile = { envoyes: number; echoues: number; restants: number };

/** Nombre maximal de tentatives avant abandon, comme pour la file hors-ligne. */
export const MAX_TENTATIVES_EMAIL = 5;

/**
 * Vide la file d'e-mails.
 *
 * Import paresseux de l'adaptateur et du PDF : ils tirent `nodemailer` et
 * `pdfkit`, inutiles tant qu'aucun message n'attend.
 */
export async function viderFileEmails(maintenant = new Date()): Promise<BilanFile> {
  const { envoyer, emailDisponible, EMAIL_NON_CONFIGURE } = await import("@/lib/email");

  const enAttente = await prisma.emailMessage.findMany({
    where: { etat: "EN_ATTENTE", tentatives: { lt: MAX_TENTATIVES_EMAIL } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  let envoyes = 0;
  let echoues = 0;

  for (const message of enAttente) {
    // Hors plage : on n'envoie pas, on ne compte pas d'échec. Le message
    // attendra le prochain balayage.
    if (!dansFenetreEnvoi(maintenant)) break;

    if (!emailDisponible()) {
      await prisma.emailMessage.update({
        where: { id: message.id },
        data: { etat: "ECHOUE", erreur: EMAIL_NON_CONFIGURE, tentatives: { increment: 1 } },
      });
      echoues += 1;
      continue;
    }

    if (!adressePlausible(message.destinataire)) {
      await prisma.emailMessage.update({
        where: { id: message.id },
        data: {
          etat: "ECHOUE",
          erreur: "Adresse du destinataire invalide.",
          tentatives: { increment: 1 },
        },
      });
      echoues += 1;
      continue;
    }

    const piece = await pieceJointeDe(message.pieceJointe, message.organizationId);

    const resultat = await envoyer({
      destinataire: message.destinataire,
      sujet: message.sujet,
      corps: message.corps,
      ...(piece ? { pieceJointe: piece } : {}),
    });

    if (resultat.ok) {
      await prisma.emailMessage.update({
        where: { id: message.id },
        data: { etat: "ENVOYE", envoyeLe: new Date(), tentatives: { increment: 1 }, erreur: "" },
      });
      envoyes += 1;
    } else {
      const tentatives = message.tentatives + 1;
      await prisma.emailMessage.update({
        where: { id: message.id },
        data: {
          // Au-delà du plafond, l'état devient définitif : l'artisan doit voir
          // que ce message ne partira pas, plutôt que de le croire « en cours »
          // indéfiniment.
          etat: tentatives >= MAX_TENTATIVES_EMAIL ? "ECHOUE" : "EN_ATTENTE",
          erreur: resultat.erreur,
          tentatives,
        },
      });
      echoues += 1;
    }
  }

  const restants = await prisma.emailMessage.count({ where: { etat: "EN_ATTENTE" } });
  return { envoyes, echoues, restants };
}

/**
 * Produit la pièce jointe désignée par `type:id`.
 *
 * Le PDF est généré à l'ENVOI, jamais stocké : sur une facture émise les totaux
 * sont figés, donc le document produit dans six mois sera identique — le
 * conserver n'apporterait qu'une copie à maintenir.
 */
async function pieceJointeDe(
  reference: string,
  organizationId: string,
): Promise<{ nom: string; contenu: Uint8Array; type: string } | null> {
  if (!reference) return null;

  const [type, id] = reference.split(":");
  if ((type !== "devis" && type !== "facture") || !id) return null;

  const { genererPdf } = await import("@/lib/pdf");
  const { contenuPdfPourOrganisation, nomFichierPdf } = await import("@/lib/document-pdf");

  // Variante sans session : le balayage tourne sans utilisateur connecté.
  // `organizationId` vient du message en file, écrit par le moteur — jamais
  // d'une donnée reçue d'un client.
  const contenu = await contenuPdfPourOrganisation(type, id, organizationId);
  if (!contenu) return null;

  return {
    nom: nomFichierPdf(contenu),
    contenu: await genererPdf(contenu),
    type: "application/pdf",
  };
}
