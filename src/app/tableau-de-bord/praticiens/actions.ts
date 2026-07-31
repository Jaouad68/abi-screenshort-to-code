"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSalon } from "@/lib/auth";

const schema = z.object({
  nom: z.string().trim().min(2, "Le nom est trop court."),
});

export type PraticienFormState = {
  error?: string;
};

export async function creerPraticien(
  _prev: PraticienFormState,
  formData: FormData
): Promise<PraticienFormState> {
  const salon = await requireSalon();

  const parsed = schema.safeParse({ nom: formData.get("nom") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await prisma.praticien.create({
    data: { salonId: salon.id, nom: parsed.data.nom },
  });

  revalidatePath("/tableau-de-bord/praticiens");
  return {};
}

export async function renommerPraticien(praticienId: string, formData: FormData) {
  const salon = await requireSalon();

  const parsed = schema.safeParse({ nom: formData.get("nom") });
  if (!parsed.success) return;

  const praticien = await prisma.praticien.findFirst({
    where: { id: praticienId, salonId: salon.id },
  });
  if (!praticien) return;

  await prisma.praticien.update({
    where: { id: praticienId },
    data: { nom: parsed.data.nom },
  });
  revalidatePath("/tableau-de-bord/praticiens");
}

export async function basculerActifPraticien(praticienId: string) {
  const salon = await requireSalon();
  const praticien = await prisma.praticien.findFirst({
    where: { id: praticienId, salonId: salon.id },
  });
  if (!praticien) return;

  await prisma.praticien.update({
    where: { id: praticienId },
    data: { actif: !praticien.actif },
  });
  revalidatePath("/tableau-de-bord/praticiens");
}

export async function supprimerPraticien(praticienId: string) {
  const salon = await requireSalon();
  const praticien = await prisma.praticien.findFirst({
    where: { id: praticienId, salonId: salon.id },
  });
  if (!praticien) return;

  try {
    await prisma.praticien.delete({ where: { id: praticienId } });
  } catch {
    // Des rendez-vous existants référencent ce praticien : on le désactive
    // plutôt que de casser leur historique.
    await prisma.praticien.update({ where: { id: praticienId }, data: { actif: false } });
  }
  revalidatePath("/tableau-de-bord/praticiens");
}
