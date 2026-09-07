"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const schema = z
  .object({
    motDePasseActuel: z.string().min(1, "Mot de passe actuel requis."),
    nouveauMotDePasse: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères."),
    confirmation: z.string(),
  })
  .refine((d) => d.nouveauMotDePasse === d.confirmation, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmation"],
  });

export type ChangerMotDePasseState = { ok?: boolean; error?: string };

export async function changerMotDePasse(
  _prev: ChangerMotDePasseState,
  formData: FormData,
): Promise<ChangerMotDePasseState> {
  const { user } = await requireUser();

  const parsed = schema.safeParse({
    motDePasseActuel: formData.get("motDePasseActuel"),
    nouveauMotDePasse: formData.get("nouveauMotDePasse"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const valide = await bcrypt.compare(parsed.data.motDePasseActuel, user.passwordHash);
  if (!valide) return { error: "Mot de passe actuel incorrect." };

  const passwordHash = await bcrypt.hash(parsed.data.nouveauMotDePasse, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { ok: true };
}
