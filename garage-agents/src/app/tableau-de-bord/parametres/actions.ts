"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireGarageId } from "@/lib/auth";

const schema = z.object({
  nom: z.string().trim().min(2, "Le nom du garage est trop court."),
  telephone: z.string().trim().optional().default(""),
  paliers: z
    .string()
    .trim()
    .min(1, "Indiquez au moins un palier de rappel.")
    .transform((v) =>
      v
        .split(",")
        .map((n) => Number.parseInt(n.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0)
    )
    .refine((arr) => arr.length > 0, "Indiquez au moins un palier valide (ex. 21, 10, 3)."),
  devisRelanceApresJours: z.coerce.number().int().positive("Délai invalide."),
  devisPaiementFractionneApresJours: z.coerce.number().int().positive("Délai invalide."),
});

export type ParametresState = { error?: string; success?: boolean };

export async function enregistrerParametres(
  _prev: ParametresState,
  formData: FormData
): Promise<ParametresState> {
  const garageId = await requireGarageId();

  const parsed = schema.safeParse({
    nom: formData.get("nom"),
    telephone: formData.get("telephone") ?? "",
    paliers: formData.get("paliers"),
    devisRelanceApresJours: formData.get("devisRelanceApresJours"),
    devisPaiementFractionneApresJours: formData.get("devisPaiementFractionneApresJours"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { nom, telephone, paliers, devisRelanceApresJours, devisPaiementFractionneApresJours } =
    parsed.data;

  await prisma.garage.update({
    where: { id: garageId },
    data: {
      nom,
      telephone,
      rappelCtPaliers: [...paliers].sort((a, b) => b - a),
      devisRelanceApresJours,
      devisPaiementFractionneApresJours,
    },
  });

  revalidatePath("/tableau-de-bord/parametres");
  revalidatePath("/tableau-de-bord");
  return { success: true };
}
