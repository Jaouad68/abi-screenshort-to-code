"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSessionCookie, compteExiste } from "@/lib/auth";
import { COMPANY_DEFAULT, PRESTATIONS_DEFAULT } from "@/lib/defaults";

const schema = z
  .object({
    email: z.email("Adresse e-mail invalide."),
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
    confirmation: z.string(),
  })
  .refine((d) => d.password === d.confirmation, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmation"],
  });

export type InscriptionState = {
  error?: string;
};

export async function inscrire(
  _prev: InscriptionState,
  formData: FormData,
): Promise<InscriptionState> {
  // Application mono-utilisateur : un seul compte, créé au premier lancement.
  if (await compteExiste()) {
    return { error: "Un compte existe déjà. Utilisez la page de connexion." };
  }

  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  // Création du compte + pré-remplissage des coordonnées de l'entreprise
  // et de la bibliothèque de prestations, en une seule opération.
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      company: { create: { ...COMPANY_DEFAULT } },
      prestations: { create: PRESTATIONS_DEFAULT },
    },
  });

  await createSessionCookie(user.id);
  redirect("/tableau-de-bord");
}
