"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSalon } from "@/lib/auth";
import { eurosToCents } from "@/lib/money";

const schema = z.object({
  nom: z.string().trim().min(2, "Le nom est trop court."),
  dureeMin: z.coerce.number().int().min(5, "Durée minimale : 5 min."),
  bufferMin: z.coerce.number().int().min(0),
  prix: z.coerce.number().min(0, "Le prix doit être positif."),
});

export type ServiceFormState = {
  error?: string;
};

export async function creerPrestation(
  _prev: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const salon = await requireSalon();

  const parsed = schema.safeParse({
    nom: formData.get("nom"),
    dureeMin: formData.get("dureeMin"),
    bufferMin: formData.get("bufferMin"),
    prix: formData.get("prix"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await prisma.service.create({
    data: {
      salonId: salon.id,
      nom: parsed.data.nom,
      dureeMin: parsed.data.dureeMin,
      bufferMin: parsed.data.bufferMin,
      prixCents: eurosToCents(parsed.data.prix),
    },
  });

  revalidatePath("/tableau-de-bord/prestations");
  return {};
}

export async function modifierPrestation(
  serviceId: string,
  _prev: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const salon = await requireSalon();

  const parsed = schema.safeParse({
    nom: formData.get("nom"),
    dureeMin: formData.get("dureeMin"),
    bufferMin: formData.get("bufferMin"),
    prix: formData.get("prix"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, salonId: salon.id },
  });
  if (!service) {
    return { error: "Prestation introuvable." };
  }

  await prisma.service.update({
    where: { id: serviceId },
    data: {
      nom: parsed.data.nom,
      dureeMin: parsed.data.dureeMin,
      bufferMin: parsed.data.bufferMin,
      prixCents: eurosToCents(parsed.data.prix),
    },
  });

  revalidatePath("/tableau-de-bord/prestations");
  redirect("/tableau-de-bord/prestations");
}

export async function basculerActif(serviceId: string) {
  const salon = await requireSalon();
  const service = await prisma.service.findFirst({
    where: { id: serviceId, salonId: salon.id },
  });
  if (!service) return;

  await prisma.service.update({
    where: { id: serviceId },
    data: { actif: !service.actif },
  });
  revalidatePath("/tableau-de-bord/prestations");
}

export async function supprimerPrestation(serviceId: string) {
  const salon = await requireSalon();
  const service = await prisma.service.findFirst({
    where: { id: serviceId, salonId: salon.id },
  });
  if (!service) return;

  try {
    await prisma.service.delete({ where: { id: serviceId } });
  } catch {
    // Des rendez-vous existants référencent cette prestation : on la désactive
    // plutôt que de casser leur historique.
    await prisma.service.update({ where: { id: serviceId }, data: { actif: false } });
  }
  revalidatePath("/tableau-de-bord/prestations");
  redirect("/tableau-de-bord/prestations");
}
