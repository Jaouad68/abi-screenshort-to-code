"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSessionCookie } from "@/lib/auth";
import { uniqueSalonSlug } from "@/lib/slug";
import { DEFAULT_HORAIRES, DEFAULT_REGLAGES_ACOMPTE } from "@/lib/horaires";
import { telephoneMobileFr } from "@/lib/telephone";

const schema = z.object({
  nomSalon: z.string().trim().min(2, "Le nom du salon est trop court."),
  telephone: z.union([telephoneMobileFr, z.literal("")]),
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
    nomSalon: formData.get("nomSalon"),
    telephone: formData.get("telephone") ?? "",
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { nomSalon, telephone, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet e-mail." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const slug = await uniqueSalonSlug(nomSalon);

  const salon = await prisma.salon.create({
    data: {
      nom: nomSalon,
      slug,
      telephone: telephone || null,
      horaires: DEFAULT_HORAIRES,
      reglagesAcompte: DEFAULT_REGLAGES_ACOMPTE,
      praticiens: { create: { nom: "Praticien principal" } },
    },
  });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      memberships: { create: { salonId: salon.id } },
    },
  });

  await createSessionCookie(user.id, salon.id);
  redirect("/tableau-de-bord");
}
