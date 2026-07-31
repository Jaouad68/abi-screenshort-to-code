"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSalon } from "@/lib/auth";
import { isValidHoraires, type Horaires } from "@/lib/horaires";

export type HorairesFormState = {
  error?: string;
  saved?: boolean;
};

export async function enregistrerHoraires(
  horaires: Horaires
): Promise<HorairesFormState> {
  const salon = await requireSalon();

  if (!isValidHoraires(horaires)) {
    return { error: "Horaires invalides : vérifiez que chaque plage a une heure de début avant l'heure de fin." };
  }

  await prisma.salon.update({ where: { id: salon.id }, data: { horaires } });
  revalidatePath("/tableau-de-bord/horaires");
  return { saved: true };
}
