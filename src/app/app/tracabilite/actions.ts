"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { produitOuvertSchema } from "@/lib/validation";
import { computeDlc } from "@/lib/haccp";
import type { ActionState } from "@/components/FormMessage";

export async function ouvrirProduit(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = produitOuvertSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Données invalides" };

  const { nom, dureeJours } = parsed.data;
  const dateOuverture = new Date();
  const dlcSecondaire = computeDlc(dateOuverture, dureeJours);

  await prisma.produitOuvert.create({
    data: {
      nom,
      dureeJours,
      dlcSecondaire,
      etablissementId: user.etablissementId,
      utilisateurId: user.id,
    },
  });

  revalidatePath("/app/tracabilite");
  revalidatePath("/app");
  return { success: `Étiquette créée : ${nom} — à consommer avant le ${dlcSecondaire.toLocaleDateString("fr-FR")}.` };
}

export async function cloturerProduit(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const statut = String(formData.get("statut") ?? "");
  if (statut !== "CONSOMME" && statut !== "JETE") return;

  await prisma.produitOuvert.updateMany({
    where: { id, etablissementId: user.etablissementId, statut: "OUVERT" },
    data: { statut, clotureAt: new Date() },
  });

  revalidatePath("/app/tracabilite");
  revalidatePath("/app");
}
