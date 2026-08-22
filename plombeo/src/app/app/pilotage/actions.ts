"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";
import { journaliser } from "@/lib/audit";
import { versCentimes } from "@/lib/calcul";

export type EtatPilotage = { erreur?: string; succes?: string };

export async function definirCoutHoraire(
  _precedent: EtatPilotage,
  donnees: FormData,
): Promise<EtatPilotage> {
  const { organizationId, userId } = await exigerPermission("organisation:modifier");

  const brut = donnees.get("coutHoraire");
  const saisie = typeof brut === "string" ? brut.trim() : "";
  // Un champ vide REMET À ZÉRO, c'est-à-dire « non renseigné » : l'artisan doit
  // pouvoir retirer une valeur dont il n'est plus sûr, plutôt que de garder un
  // chiffre auquel il ne croit plus.
  const cents = saisie ? versCentimes(saisie) : 0;

  if (cents === null || cents < 0) {
    return { erreur: "Indiquez un montant valide, ou laissez vide pour ne pas le renseigner." };
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: { coutHoraireCents: cents },
  });

  await journaliser({
    action: "organization.updated",
    organizationId,
    actorUserId: userId,
    entityType: "Organization",
    entityId: organizationId,
    metadata: { coutHoraireCents: cents },
  });

  revalidatePath("/app/pilotage");
  return { succes: cents === 0 ? "Coût horaire retiré." : "Coût horaire enregistré." };
}
