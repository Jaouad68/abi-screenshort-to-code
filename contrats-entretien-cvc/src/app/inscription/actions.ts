"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSessionCookie } from "@/lib/auth";

const schema = z
  .object({
    entreprise: z.string().trim().min(1, "Le nom de l'entreprise est obligatoire."),
    nom: z.string().trim().min(1, "Votre nom est obligatoire."),
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
  const parsed = schema.safeParse({
    entreprise: formData.get("entreprise"),
    nom: formData.get("nom"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { entreprise, nom, email, password } = parsed.data;

  const existant = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existant) {
    return { error: "Un compte existe déjà avec cet e-mail." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Une inscription = une nouvelle entreprise (locataire) + son premier
  // compte, avec le rôle Dirigeant. Les comptes Administratif/Technicien se
  // créent ensuite depuis la page Équipe.
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      nom,
      role: "DIRIGEANT",
      company: { create: { nom: entreprise } },
    },
  });

  await createSessionCookie(user.id);
  redirect("/tableau-de-bord");
}
