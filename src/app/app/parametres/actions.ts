"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireGerant, hashPassword, destroySession } from "@/lib/auth";
import {
  equipementSchema,
  tacheSchema,
  employeSchema,
  rappelSchema,
} from "@/lib/validation";
import type { ActionState } from "@/components/FormMessage";

// --- Équipements ---
export async function ajouterEquipement(_p: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireGerant();
  const parsed = equipementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Données invalides" };
  await prisma.equipement.create({
    data: { ...parsed.data, etablissementId: user.etablissementId },
  });
  revalidatePath("/app/parametres");
  return { success: `Équipement « ${parsed.data.nom} » ajouté.` };
}

export async function desactiverEquipement(formData: FormData) {
  const user = await requireGerant();
  const id = String(formData.get("id") ?? "");
  // Désactivation (soft) : on ne supprime jamais — l'historique reste inviolable.
  await prisma.equipement.updateMany({
    where: { id, etablissementId: user.etablissementId },
    data: { actif: false },
  });
  revalidatePath("/app/parametres");
}

// --- Tâches de nettoyage ---
export async function ajouterTache(_p: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireGerant();
  const parsed = tacheSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Données invalides" };
  await prisma.tacheNettoyage.create({
    data: { ...parsed.data, etablissementId: user.etablissementId },
  });
  revalidatePath("/app/parametres");
  return { success: `Tâche « ${parsed.data.libelle} » ajoutée.` };
}

export async function desactiverTache(formData: FormData) {
  const user = await requireGerant();
  const id = String(formData.get("id") ?? "");
  await prisma.tacheNettoyage.updateMany({
    where: { id, etablissementId: user.etablissementId },
    data: { actif: false },
  });
  revalidatePath("/app/parametres");
}

// --- Employés ---
export async function ajouterEmploye(_p: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireGerant();
  const parsed = employeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Données invalides" };
  const { nom, email, password } = parsed.data;

  const existing = await prisma.utilisateur.findUnique({ where: { email } });
  if (existing) return { error: "Un compte existe déjà avec cet email." };

  await prisma.utilisateur.create({
    data: {
      nom,
      email,
      passwordHash: await hashPassword(password),
      role: "EMPLOYE",
      etablissementId: user.etablissementId,
    },
  });
  revalidatePath("/app/parametres");
  return { success: `Employé « ${nom} » ajouté.` };
}

export async function desactiverEmploye(formData: FormData) {
  const user = await requireGerant();
  const id = String(formData.get("id") ?? "");
  if (id === user.id) return; // un gérant ne se désactive pas lui-même
  await prisma.utilisateur.updateMany({
    where: { id, etablissementId: user.etablissementId, role: "EMPLOYE" },
    data: { actif: false },
  });
  revalidatePath("/app/parametres");
}

// --- Rappels ---
export async function ajouterRappel(_p: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireGerant();
  const parsed = rappelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Données invalides" };
  await prisma.rappel.create({
    data: { ...parsed.data, etablissementId: user.etablissementId },
  });
  revalidatePath("/app/parametres");
  return { success: "Rappel ajouté." };
}

export async function supprimerRappel(formData: FormData) {
  const user = await requireGerant();
  const id = String(formData.get("id") ?? "");
  await prisma.rappel.deleteMany({ where: { id, etablissementId: user.etablissementId } });
  revalidatePath("/app/parametres");
}

// --- RGPD : suppression du compte/établissement ---
export async function supprimerCompte(formData: FormData) {
  const user = await requireGerant();
  const confirm = String(formData.get("confirm") ?? "");
  if (confirm !== "SUPPRIMER") return;
  // Cascade : supprime l'établissement et toutes ses données liées.
  await prisma.etablissement.delete({ where: { id: user.etablissementId } });
  destroySession();
  redirect("/login");
}
