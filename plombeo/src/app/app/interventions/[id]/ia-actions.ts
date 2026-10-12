"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";
import { journaliser } from "@/lib/audit";
import { demanderIA } from "@/lib/ia-serveur";

export type EtatIA = {
  erreur?: string;
  succes?: string;
  proposition?: string;
  actionId?: string;
};

/**
 * Demande une mise au propre.
 *
 * N'ÉCRIT RIEN sur l'intervention : la proposition est retournée à l'écran et
 * tracée dans `AiAction`. Seule une validation explicite de l'artisan la fera
 * entrer dans le compte rendu (§22, et Phase 0 : « toute action
 * ACTION_VALIDATION_REQUISE bloque sans clic explicite »).
 */
export async function proposerMiseAuPropre(
  _precedent: EtatIA,
  donnees: FormData,
): Promise<EtatIA> {
  const { organizationId, userId } = await exigerPermission("ia:utiliser");
  const interventionId = String(donnees.get("interventionId") ?? "");
  const texte = String(donnees.get("texte") ?? "").trim();

  if (!texte) return { erreur: "Écrivez d'abord quelques mots." };

  const intervention = await prisma.intervention.findFirst({
    where: { id: interventionId, organizationId },
    select: { id: true },
  });
  if (!intervention) return { erreur: "Cette intervention est introuvable." };

  const { reponse, envoye } = await demanderIA("MISE_AU_PROPRE", texte);

  // L'échec est TRACÉ comme le succès : un appel raté est une donnée, et
  // l'artisan doit pouvoir constater que rien n'est parti.
  const action = await prisma.aiAction.create({
    data: {
      type: "MISE_AU_PROPRE",
      demandeEnvoyee: envoye,
      proposition: reponse.ok ? reponse.texte : "",
      erreur: reponse.ok ? "" : reponse.erreur,
      interventionId,
      organizationId,
    },
    select: { id: true },
  });

  await journaliser({
    action: reponse.ok ? "ai.proposed" : "ai.unavailable",
    organizationId,
    actorUserId: userId,
    entityType: "Intervention",
    entityId: interventionId,
  });

  if (!reponse.ok) return { erreur: reponse.erreur };
  return { proposition: reponse.texte, actionId: action.id };
}

/** Enregistre la décision de l'artisan — et n'écrit le texte que s'il l'accepte. */
export async function accepterProposition(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("ia:utiliser");
  const actionId = String(donnees.get("actionId") ?? "");
  const interventionId = String(donnees.get("interventionId") ?? "");
  const accepte = String(donnees.get("decision") ?? "") === "ACCEPTEE";

  const action = await prisma.aiAction.findFirst({
    where: { id: actionId, organizationId },
    select: { proposition: true },
  });
  if (!action) return;

  await prisma.aiAction.updateMany({
    where: { id: actionId, organizationId },
    data: { decision: accepte ? "ACCEPTEE" : "REJETEE", decideLe: new Date() },
  });

  if (accepte && action.proposition) {
    // Le texte va dans `compteRendu` UNIQUEMENT. Jamais dans `diagnostic` : ce
    // champ porte depuis la Phase 3 la mention « jamais généré ni déduit par
    // l'application » (§22).
    await prisma.intervention.updateMany({
      where: { id: interventionId, organizationId, statut: { not: "CLOTUREE" } },
      data: { compteRendu: action.proposition },
    });
  }

  await journaliser({
    action: accepte ? "ai.accepted" : "ai.rejected",
    organizationId,
    actorUserId: userId,
    entityType: "Intervention",
    entityId: interventionId,
  });

  revalidatePath(`/app/interventions/${interventionId}`);
}
