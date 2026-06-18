"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { startOfMonth, startOfToday, startOfWeek } from "@/lib/dates";

function periodStart(frequence: string): Date {
  if (frequence === "HEBDOMADAIRE") return startOfWeek();
  if (frequence === "MENSUELLE") return startOfMonth();
  return startOfToday();
}

export async function validerTache(formData: FormData) {
  const user = await requireUser();
  const tacheId = String(formData.get("tacheId") ?? "");

  const tache = await prisma.tacheNettoyage.findFirst({
    where: { id: tacheId, etablissementId: user.etablissementId, actif: true },
  });
  if (!tache) return;

  // Idempotent sur la période courante : pas de double validation.
  const existing = await prisma.validationNettoyage.findFirst({
    where: { tacheId: tache.id, createdAt: { gte: periodStart(tache.frequence) } },
  });
  if (!existing) {
    await prisma.validationNettoyage.create({
      data: { tacheId: tache.id, utilisateurId: user.id },
    });
  }

  revalidatePath("/app/nettoyage");
  revalidatePath("/app");
}
