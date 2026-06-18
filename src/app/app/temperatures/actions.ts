"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { releveSchema } from "@/lib/validation";
import type { ActionState } from "@/components/FormMessage";

export async function enregistrerReleve(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = releveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Données invalides" };

  const { equipementId, valeur, commentaire } = parsed.data;

  // L'équipement doit appartenir à l'établissement de l'utilisateur (cloisonnement).
  const equipement = await prisma.equipement.findFirst({
    where: { id: equipementId, etablissementId: user.etablissementId },
  });
  if (!equipement) return { error: "Équipement introuvable." };

  // Conformité calculée côté serveur (source de vérité).
  const conforme = valeur >= equipement.tempMin && valeur <= equipement.tempMax;

  const releve = await prisma.releveTemperature.create({
    data: {
      valeur,
      conforme,
      commentaire: commentaire || null,
      equipementId: equipement.id,
      utilisateurId: user.id,
    },
  });

  // Hors plage → ouverture automatique d'une non-conformité tracée
  // (traçabilité réglementaire), à compléter par une action corrective.
  if (!conforme) {
    await prisma.nonConformite.create({
      data: {
        type: "Température hors plage",
        description: `${equipement.nom} : ${valeur} °C relevé (plage cible ${equipement.tempMin} à ${equipement.tempMax} °C).`,
        etablissementId: user.etablissementId,
        utilisateurId: user.id,
        releveId: releve.id,
      },
    });
  }

  revalidatePath("/app/temperatures");
  revalidatePath("/app");
  revalidatePath("/app/non-conformites");

  return conforme
    ? { success: `Relevé enregistré : ${equipement.nom}, ${valeur} °C — conforme.` }
    : {
        error: `⚠️ ${equipement.nom} : ${valeur} °C HORS PLAGE. Une anomalie a été ouverte — pensez à saisir l'action corrective dans « Anomalies ».`,
      };
}
