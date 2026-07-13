"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const schema = z
  .object({
    motDePasse: z.string().min(8, "8 caractères minimum."),
    confirmation: z.string(),
  })
  .refine((data) => data.motDePasse === data.confirmation, {
    error: "Les mots de passe ne correspondent pas.",
    path: ["confirmation"],
  });

export type ReinitialisationState = {
  error?: string;
};

export async function reinitialiserMotDePasse(
  token: string,
  _prev: ReinitialisationState,
  formData: FormData
): Promise<ReinitialisationState> {
  const parsed = schema.safeParse({
    motDePasse: formData.get("motDePasse"),
    confirmation: formData.get("confirmation"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { error: "Ce lien de réinitialisation n'est plus valide. Demandez-en un nouveau." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.motDePasse, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    // Invalidate every outstanding reset link for this user, not just this one.
    prisma.passwordResetToken.updateMany({
      where: { userId: resetToken.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  redirect("/connexion");
}
