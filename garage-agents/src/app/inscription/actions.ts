"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSessionCookie } from "@/lib/auth";

const schema = z.object({
  nomGarage: z.string().trim().min(2, "Le nom du garage est trop court."),
  email: z.email("Adresse e-mail invalide."),
  password: z.string().min(8, "8 caractères minimum."),
});

export type InscriptionState = {
  error?: string;
};

export async function inscrire(
  _prev: InscriptionState,
  formData: FormData
): Promise<InscriptionState> {
  const parsed = schema.safeParse({
    nomGarage: formData.get("nomGarage"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { nomGarage, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet e-mail." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      garage: { create: { nom: nomGarage } },
    },
    include: { garage: true },
  });

  await createSessionCookie(user.id, user.garage!.id);
  redirect("/tableau-de-bord");
}
