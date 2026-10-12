"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const ROLES = ["ADMINISTRATIF", "TECHNICIEN"] as const;

const schema = z.object({
  nom: z.string().trim().min(1, "Le nom est obligatoire."),
  email: z.email("Adresse e-mail invalide."),
  role: z.enum(ROLES),
});

export type CreerUtilisateurState = {
  error?: string;
  cree?: { email: string; motDePasse: string; nom: string };
};

function genererMotDePasse(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let mdp = "";
  for (let i = 0; i < 10; i++) mdp += alphabet[Math.floor(Math.random() * alphabet.length)];
  return mdp;
}

/** Création d'un compte Administratif ou Technicien par le dirigeant. Aucun
 * service d'envoi d'e-mail n'est branché : un mot de passe temporaire est
 * généré et affiché une seule fois, à transmettre à la personne par un canal
 * de votre choix (SMS, en main propre...). */
export async function creerUtilisateur(
  _prev: CreerUtilisateurState,
  formData: FormData,
): Promise<CreerUtilisateurState> {
  const { company } = await requireRole(["DIRIGEANT"]);

  const parsed = schema.safeParse({
    nom: formData.get("nom"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const existant = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existant) return { error: "Un compte existe déjà avec cet e-mail." };

  const motDePasse = genererMotDePasse();
  const passwordHash = await bcrypt.hash(motDePasse, 10);

  await prisma.user.create({
    data: {
      companyId: company.id,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      nom: parsed.data.nom,
      role: parsed.data.role,
    },
  });

  revalidatePath("/tableau-de-bord/equipe");
  return { cree: { email: parsed.data.email.toLowerCase(), motDePasse, nom: parsed.data.nom } };
}

export async function basculerActifUtilisateur(id: string, actif: boolean) {
  const { user, company } = await requireRole(["DIRIGEANT"]);
  if (id === user.id) return; // on ne peut pas se désactiver soi-même
  await prisma.user.updateMany({ where: { id, companyId: company.id }, data: { actif } });
  revalidatePath("/tableau-de-bord/equipe");
}
