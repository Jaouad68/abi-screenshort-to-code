import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";
import { journaliser } from "@/lib/audit";
import { schemaFileMutations, type Mutation } from "@/lib/validation";

/**
 * RÉCEPTION DE LA FILE DE SYNCHRONISATION HORS-LIGNE (Phase 3).
 *
 * Contrat : **idempotent**. Chaque mutation porte un `clientMutationId` généré
 * sur l'appareil au moment de la saisie. Rejouer la même mutation — parce que
 * la réponse s'est perdue, parce que le réseau a coupé au mauvais moment, parce
 * que l'utilisateur a rouvert l'application — retombe sur la même ligne au lieu
 * d'en créer une seconde. C'est l'exigence explicite du §5.
 *
 * Route Handler et non Server Action : l'appelant est le service de
 * synchronisation côté navigateur, qui envoie un lot JSON et a besoin d'une
 * réponse structurée mutation par mutation.
 *
 * Chaque mutation est traitée indépendamment : une seule en échec ne doit pas
 * faire perdre les autres, sans quoi une saisie invalide bloquerait toute la
 * file de l'artisan.
 */
export async function POST(requete: Request) {
  const { organizationId, userId } = await exigerPermission("intervention:modifier");

  let corps: unknown;
  try {
    corps = await requete.json();
  } catch {
    return Response.json({ erreur: "Corps de requête illisible." }, { status: 400 });
  }

  const saisie = schemaFileMutations.safeParse(corps);
  if (!saisie.success) {
    return Response.json({ erreur: "File de synchronisation invalide." }, { status: 400 });
  }

  const resultats: { clientMutationId: string; etat: "applique" | "refuse"; motif?: string }[] =
    [];

  // Les interventions concernées sont vérifiées une seule fois : c'est ce qui
  // empêche d'écrire dans l'intervention d'un autre artisan en devinant son
  // identifiant, sans refaire la requête pour chaque ligne du lot.
  const interventionsCitees = [...new Set(saisie.data.mutations.map((m) => m.interventionId))];
  const accessibles = new Set(
    (
      await prisma.intervention.findMany({
        where: {
          id: { in: interventionsCitees },
          organizationId,
          // Une intervention clôturée n'accepte plus d'écriture : son compte
          // rendu servira de base à la facturation (Phase 5).
          statut: { notIn: ["CLOTUREE", "ANNULEE"] },
        },
        select: { id: true },
      })
    ).map((i) => i.id),
  );

  for (const mutation of saisie.data.mutations) {
    if (!accessibles.has(mutation.interventionId)) {
      resultats.push({
        clientMutationId: mutation.clientMutationId,
        etat: "refuse",
        motif: "intervention_indisponible",
      });
      continue;
    }

    try {
      await appliquer(mutation, organizationId);
      resultats.push({ clientMutationId: mutation.clientMutationId, etat: "applique" });
    } catch (erreur) {
      console.error("[sync] mutation en échec", {
        type: mutation.type,
        clientMutationId: mutation.clientMutationId,
        erreur,
      });
      resultats.push({
        clientMutationId: mutation.clientMutationId,
        etat: "refuse",
        motif: "erreur_serveur",
      });
    }
  }

  const appliquees = resultats.filter((r) => r.etat === "applique").length;
  if (appliquees > 0) {
    await journaliser({
      action: "intervention.synced",
      organizationId,
      actorUserId: userId,
      metadata: { appliquees, refusees: resultats.length - appliquees },
    });
  }

  return Response.json({ resultats }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * Applique une mutation de façon idempotente.
 *
 * `upsert` sur `clientMutationId` : la création n'a lieu qu'une fois, les rejeux
 * se contentent de réécrire les mêmes valeurs.
 */
async function appliquer(mutation: Mutation, organizationId: string): Promise<void> {
  switch (mutation.type) {
    case "tache":
      await prisma.interventionTask.upsert({
        where: { clientMutationId: mutation.clientMutationId },
        create: {
          clientMutationId: mutation.clientMutationId,
          interventionId: mutation.interventionId,
          libelle: mutation.libelle,
          ordre: mutation.ordre,
          organizationId,
        },
        update: { libelle: mutation.libelle, ordre: mutation.ordre },
      });
      return;

    case "temps":
      await prisma.timeEntry.upsert({
        where: { clientMutationId: mutation.clientMutationId },
        create: {
          clientMutationId: mutation.clientMutationId,
          interventionId: mutation.interventionId,
          minutes: mutation.minutes,
          libelle: mutation.libelle,
          organizationId,
        },
        update: { minutes: mutation.minutes, libelle: mutation.libelle },
      });
      return;

    case "fourniture":
      await prisma.interventionSupply.upsert({
        where: { clientMutationId: mutation.clientMutationId },
        create: {
          clientMutationId: mutation.clientMutationId,
          interventionId: mutation.interventionId,
          libelle: mutation.libelle,
          quantiteMilli: mutation.quantiteMilli,
          unite: mutation.unite,
          organizationId,
        },
        update: {
          libelle: mutation.libelle,
          quantiteMilli: mutation.quantiteMilli,
          unite: mutation.unite,
        },
      });
      return;

    case "compteRendu":
      // Le compte rendu n'est pas une collection : le rejouer écrase la même
      // ligne, ce qui est exactement le comportement voulu.
      await prisma.intervention.updateMany({
        where: { id: mutation.interventionId, organizationId },
        data: {
          probleme: mutation.probleme,
          diagnostic: mutation.diagnostic,
          compteRendu: mutation.compteRendu,
        },
      });
      return;
  }
}
