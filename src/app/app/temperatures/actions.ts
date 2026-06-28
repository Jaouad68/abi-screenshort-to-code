"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createReleve } from "@/lib/releves";
import { isConforme } from "@/lib/haccp";
import { releveSchema } from "@/lib/validation";
import type { ActionState } from "@/components/FormMessage";

function revalidateTemp() {
  revalidatePath("/app/temperatures");
  revalidatePath("/app/temperatures/historique");
  revalidatePath("/app");
  revalidatePath("/app/non-conformites");
}

export async function enregistrerReleve(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = releveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Données invalides" };

  const { equipementId, valeur, commentaire } = parsed.data;
  const res = await createReleve({
    userId: user.id,
    etablissementId: user.etablissementId,
    equipementId,
    valeur,
    commentaire,
  });
  if (!res.ok) return { error: "Équipement introuvable." };

  revalidateTemp();
  return res.conforme
    ? { success: `Relevé enregistré : ${res.equipement.nom}, ${valeur} °C — conforme.` }
    : {
        error: `⚠️ ${res.equipement.nom} : ${valeur} °C HORS PLAGE. Une anomalie a été ouverte — pensez à saisir l'action corrective dans « Anomalies ».`,
      };
}

/**
 * Correction tracée : ne modifie JAMAIS le relevé d'origine. Crée une nouvelle
 * entrée pointant vers l'originale (audit trail), avec un motif obligatoire.
 */
export async function corrigerReleve(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const originalId = String(formData.get("originalId") ?? "");
  const valeurRaw = String(formData.get("valeur") ?? "").replace(",", ".");
  const motif = String(formData.get("motif") ?? "").trim();
  const valeur = Number(valeurRaw);

  if (!motif) return { error: "Le motif de correction est obligatoire." };
  if (!Number.isFinite(valeur)) return { error: "Température invalide." };

  const original = await prisma.releveTemperature.findFirst({
    where: { id: originalId, equipement: { etablissementId: user.etablissementId } },
    include: { equipement: true, correction: true },
  });
  if (!original) return { error: "Relevé introuvable." };
  if (original.correction) return { error: "Ce relevé a déjà été corrigé." };

  const conforme = isConforme(valeur, original.equipement.tempMin, original.equipement.tempMax);

  await prisma.releveTemperature.create({
    data: {
      valeur,
      conforme,
      equipementId: original.equipementId,
      utilisateurId: user.id,
      correctionDeId: original.id,
      motifCorrection: motif,
    },
  });

  revalidateTemp();
  return { success: "Correction enregistrée (l'entrée d'origine reste tracée)." };
}
