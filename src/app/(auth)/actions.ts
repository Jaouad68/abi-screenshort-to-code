"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { loginSchema, registerSchema } from "@/lib/validation";
import type { ActionState } from "@/components/FormMessage";

function firstError(e: import("zod").ZodError): string {
  return e.errors[0]?.message ?? "Données invalides";
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { etablissementNom, etablissementAdresse, nom, email, password } = parsed.data;

  const existing = await prisma.utilisateur.findUnique({ where: { email } });
  if (existing) return { error: "Un compte existe déjà avec cet email." };

  const passwordHash = await hashPassword(password);
  const etab = await prisma.etablissement.create({
    data: {
      nom: etablissementNom,
      adresse: etablissementAdresse || null,
      utilisateurs: { create: { nom, email, passwordHash, role: "GERANT" } },
      rappels: {
        create: [
          { libelle: "Relevés du matin", heure: "09:00" },
          { libelle: "Relevés du soir", heure: "18:00" },
        ],
      },
    },
    include: { utilisateurs: true },
  });

  const user = etab.utilisateurs[0];
  await createSession({
    userId: user.id,
    etablissementId: etab.id,
    role: "GERANT",
    nom: user.nom,
  });
  redirect("/app/parametres?onboarding=1");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { email, password } = parsed.data;

  const user = await prisma.utilisateur.findUnique({ where: { email } });
  if (!user || !user.actif || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email ou mot de passe incorrect." };
  }

  await createSession({
    userId: user.id,
    etablissementId: user.etablissementId,
    role: user.role as "GERANT" | "EMPLOYE",
    nom: user.nom,
  });
  redirect("/app");
}

export async function logoutAction() {
  destroySession();
  redirect("/login");
}
