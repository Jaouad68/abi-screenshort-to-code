"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSessionCookie } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { DEFAULT_HORAIRES, DEFAULT_REGLAGES_ACOMPTE } from "@/lib/horaires";

const schema = z.object({
  nomSalon: z.string().trim().min(2, "Le nom du salon est trop court."),
  email: z.email("Adresse e-mail invalide."),
  password: z.string().min(8, "8 caractères minimum."),
});

export type InscriptionState = {
  error?: string;
};

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "salon";
  let slug = root;
  let i = 1;
  while (await prisma.salon.findUnique({ where: { slug } })) {
    i += 1;
    slug = `${root}-${i}`;
  }
  return slug;
}

export async function inscrire(
  _prev: InscriptionState,
  formData: FormData
): Promise<InscriptionState> {
  const parsed = schema.safeParse({
    nomSalon: formData.get("nomSalon"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { nomSalon, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet e-mail." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const slug = await uniqueSlug(nomSalon);

  const salon = await prisma.salon.create({
    data: {
      nom: nomSalon,
      slug,
      horaires: DEFAULT_HORAIRES,
      reglagesAcompte: DEFAULT_REGLAGES_ACOMPTE,
      user: { create: { email, passwordHash } },
    },
    include: { user: true },
  });

  await createSessionCookie(salon.user!.id, salon.id);
  redirect("/tableau-de-bord");
}
