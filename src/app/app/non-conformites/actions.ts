"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { actionCorrectiveSchema, nonConformiteSchema } from "@/lib/validation";
import type { ActionState } from "@/components/FormMessage";

export async function declarerNC(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = nonConformiteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Données invalides" };

  const { type, description, responsable, photoData } = parsed.data;
  await prisma.nonConformite.create({
    data: {
      type,
      description,
      responsable: responsable || null,
      photoData: photoData || null,
      etablissementId: user.etablissementId,
      utilisateurId: user.id,
    },
  });

  revalidatePath("/app/non-conformites");
  revalidatePath("/app");
  return { success: "Non-conformité déclarée." };
}

export async function resoudreNC(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = actionCorrectiveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Données invalides" };

  const { id, actionCorrective, responsable } = parsed.data;
  const res = await prisma.nonConformite.updateMany({
    where: { id, etablissementId: user.etablissementId, statut: "OUVERT" },
    data: {
      actionCorrective,
      responsable: responsable || user.nom,
      statut: "RESOLU",
      resolvedAt: new Date(),
    },
  });
  if (res.count === 0) return { error: "Non-conformité introuvable ou déjà résolue." };

  revalidatePath("/app/non-conformites");
  revalidatePath("/app");
  return { success: "Action corrective enregistrée — non-conformité résolue." };
}
