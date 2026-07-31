"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { eurosToCents } from "@/lib/money";

const schema = z.object({
  libelle: z.string().trim().min(1, "Le libellé est obligatoire."),
  description: z.string().trim(),
  unite: z.string().trim().min(1),
  prix: z.string().trim(),
  tauxTva: z.coerce.number().int().min(0).max(20),
});

export type PrestationFormState = {
  ok?: boolean;
  error?: string;
};

function lire(formData: FormData) {
  const parsed = schema.safeParse({
    libelle: formData.get("libelle"),
    description: formData.get("description"),
    unite: formData.get("unite"),
    prix: formData.get("prix"),
    tauxTva: formData.get("tauxTva"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message } as const;
  const { libelle, description, unite, prix, tauxTva } = parsed.data;
  return {
    data: {
      libelle,
      description,
      unite,
      tauxTva,
      prixUnitaireCents: eurosToCents(prix),
      actif: formData.get("actif") != null,
    },
  } as const;
}

export async function creerPrestation(
  _prev: PrestationFormState,
  formData: FormData,
): Promise<PrestationFormState> {
  const { user } = await requireUser();
  const res = lire(formData);
  if ("error" in res) return { error: res.error ?? "Formulaire invalide." };

  await prisma.prestation.create({ data: { userId: user.id, ...res.data } });
  revalidatePath("/tableau-de-bord/prestations");
  redirect("/tableau-de-bord/prestations");
}

export async function modifierPrestation(
  id: string,
  _prev: PrestationFormState,
  formData: FormData,
): Promise<PrestationFormState> {
  const { user } = await requireUser();
  const res = lire(formData);
  if ("error" in res) return { error: res.error ?? "Formulaire invalide." };

  const upd = await prisma.prestation.updateMany({
    where: { id, userId: user.id },
    data: res.data,
  });
  if (upd.count === 0) return { error: "Prestation introuvable." };

  revalidatePath("/tableau-de-bord/prestations");
  return { ok: true };
}

export async function supprimerPrestation(id: string) {
  const { user } = await requireUser();
  await prisma.prestation.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/tableau-de-bord/prestations");
  redirect("/tableau-de-bord/prestations");
}
