"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  nom: z.string().trim().min(1, "Le nom de l'entreprise est obligatoire."),
  adresse: z.string().trim(),
  codePostal: z.string().trim(),
  ville: z.string().trim(),
  telephone: z.string().trim(),
  email: z.string().trim(),
  siret: z.string().trim(),
  tvaIntra: z.string().trim(),
  assurance: z.string().trim(),
  iban: z.string().trim(),
  prefixeDevis: z.string().trim().min(1, "Le préfixe est obligatoire.").max(10),
  tauxTvaDefaut: z.coerce.number().int().min(0).max(20),
  dureeValidite: z.coerce.number().int().min(1).max(365),
  mentionsLegales: z.string().trim(),
});

export type ParametresState = {
  ok?: boolean;
  error?: string;
};

export async function enregistrerParametres(
  _prev: ParametresState,
  formData: FormData,
): Promise<ParametresState> {
  const { company } = await requireUser();

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await prisma.company.update({
    where: { id: company.id },
    data: parsed.data,
  });

  revalidatePath("/tableau-de-bord/parametres");
  revalidatePath("/tableau-de-bord");
  return { ok: true };
}
