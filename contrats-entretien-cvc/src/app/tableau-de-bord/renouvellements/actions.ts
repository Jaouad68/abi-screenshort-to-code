"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { parseInputDate } from "@/lib/date";

export type StatutActionState = { ok?: boolean; error?: string };

/** Fait avancer un contrat vers "Contacté" ou "Perdu" — pas de changement de
 * date, juste le statut de suivi + une ligne d'historique. */
export async function changerStatutSimple(
  contratId: string,
  statut: "A_CONTACTER" | "CONTACTE" | "PERDU",
  commentaire: string,
) {
  const { user, company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);

  const contrat = await prisma.contrat.findFirst({ where: { id: contratId, companyId: company.id } });
  if (!contrat) return;

  await prisma.$transaction([
    prisma.contrat.update({
      where: { id: contratId },
      data: { statut, ...(statut === "PERDU" ? { actif: false } : {}) },
    }),
    prisma.contratHistorique.create({
      data: { contratId, statut, commentaire: commentaire.trim(), creeParId: user.id },
    }),
  ]);

  revalidatePath("/tableau-de-bord/renouvellements");
  revalidatePath(`/tableau-de-bord/contrats/${contratId}`);
  revalidatePath("/tableau-de-bord/contrats");
  revalidatePath("/tableau-de-bord");
}

const schemaRenouveler = z.object({
  nouvelleEcheance: z.string().trim().min(1, "La nouvelle échéance est obligatoire."),
  commentaire: z.string().trim(),
});

/** Marque le contrat comme renouvelé : enregistre la trace dans l'historique
 * puis relance immédiatement le cycle suivant (nouvelle échéance, statut
 * remis à "À contacter") pour que le contrat réapparaisse au bon moment. */
export async function renouvelerContrat(
  contratId: string,
  _prev: StatutActionState,
  formData: FormData,
): Promise<StatutActionState> {
  const { user, company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);

  const parsed = schemaRenouveler.safeParse({
    nouvelleEcheance: formData.get("nouvelleEcheance"),
    commentaire: formData.get("commentaire"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const contrat = await prisma.contrat.findFirst({ where: { id: contratId, companyId: company.id } });
  if (!contrat) return { error: "Contrat introuvable." };

  const nouvelleEcheance = parseInputDate(parsed.data.nouvelleEcheance);
  if (!nouvelleEcheance) return { error: "Date invalide." };

  await prisma.$transaction([
    prisma.contratHistorique.create({
      data: {
        contratId,
        statut: "RENOUVELE",
        commentaire: parsed.data.commentaire || `Renouvelé jusqu'au ${parsed.data.nouvelleEcheance}.`,
        creeParId: user.id,
      },
    }),
    prisma.contrat.update({
      where: { id: contratId },
      data: { statut: "A_CONTACTER", dateDebut: contrat.dateEcheance, dateEcheance: nouvelleEcheance, actif: true },
    }),
  ]);

  revalidatePath("/tableau-de-bord/renouvellements");
  revalidatePath(`/tableau-de-bord/contrats/${contratId}`);
  revalidatePath("/tableau-de-bord/contrats");
  revalidatePath("/tableau-de-bord");
  return { ok: true };
}
