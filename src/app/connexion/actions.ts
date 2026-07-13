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
};

export async function connecter(
  _prev: ConnexionState,
  formData: FormData
): Promise<ConnexionState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "E-mail ou mot de passe incorrect." };
  }

  const salonId = user.memberships[0]?.salonId;
  if (!salonId) {
    return { error: "Ce compte n'est rattaché à aucun salon." };
  }

  await createSessionCookie(user.id, salonId);
  redirect("/tableau-de-bord");
}
