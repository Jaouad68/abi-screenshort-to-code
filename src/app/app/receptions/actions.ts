"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { receptionSchema } from "@/lib/validation";
import type { ActionState } from "@/components/FormMessage";

export async function enregistrerReception(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const raw = Object.fromEntries(formData);
  // La case "conforme" : présente = true.
  const parsed = receptionSchema.safeParse({
    ...raw,
    conforme: formData.get("conforme") === "on" || formData.get("conforme") === "true",
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Données invalides" };

  const { fournisseur, produit, temperature, numeroLot, conforme, photoData } = parsed.data;
  const temp = temperature === "" || temperature === undefined ? null : Number(temperature);

  const reception = await prisma.reception.create({
    data: {
      fournisseur,
      produit,
      temperature: temp,
      numeroLot: numeroLot || null,
      conforme,
      photoData: photoData || null,
      etablissementId: user.etablissementId,
      utilisateurId: user.id,
    },
  });

  if (!conforme) {
    await prisma.nonConformite.create({
      data: {
        type: "Réception non conforme",
        description: `Réception ${produit} (${fournisseur})${
          temp !== null ? ` — ${temp} °C` : ""
        }${numeroLot ? ` — lot ${numeroLot}` : ""}.`,
        etablissementId: user.etablissementId,
        utilisateurId: user.id,
        receptionId: reception.id,
      },
    });
  }

  revalidatePath("/app/receptions");
  revalidatePath("/app");
  revalidatePath("/app/non-conformites");

  return conforme
    ? { success: `Réception enregistrée : ${produit} (${fournisseur}).` }
    : {
        error: `Réception NON CONFORME enregistrée. Une anomalie a été ouverte — saisissez l'action corrective dans « Anomalies ».`,
      };
}
