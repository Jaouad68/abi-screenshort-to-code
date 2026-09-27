"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSessionCookie } from "@/lib/auth";

const schema = z.object({
  email: z.email("Adresse e-mail invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});

export type ConnexionState = {
  error?: string;
  /** E-mail saisi, réaffiché après une erreur (le formulaire est réinitialisé). */
  email?: string;
};

export async function connecter(
  _prev: ConnexionState,
  formData: FormData,
): Promise<ConnexionState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  const email = String(formData.get("email") ?? "");
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide.", email };
  }

  const { password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "E-mail ou mot de passe incorrect.", email };
  }

  await createSessionCookie(user.id);
  redirect("/tableau-de-bord");
}
