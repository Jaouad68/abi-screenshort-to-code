"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { parseInputDate } from "@/lib/date";

const schema = z.object({
  type: z.string().trim(),
  marque: z.string().trim(),
  modele: z.string().trim(),
  numeroSerie: z.string().trim(),
  localisation: z.string().trim(),
  dateInstallation: z.string().trim(),
  notes: z.string().trim(),
});

export type EquipementFormState = {
  ok?: boolean;
  error?: string;
};

function lire(formData: FormData) {
  return schema.safeParse({
    type: formData.get("type"),
    marque: formData.get("marque"),
    modele: formData.get("modele"),
    numeroSerie: formData.get("numeroSerie"),
    localisation: formData.get("localisation"),
    dateInstallation: formData.get("dateInstallation"),
    notes: formData.get("notes"),
  });
}

export async function creerEquipement(
  clientId: string,
  _prev: EquipementFormState,
  formData: FormData,
): Promise<EquipementFormState> {
  const { company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);

  const client = await prisma.client.findFirst({ where: { id: clientId, companyId: company.id } });
  if (!client) return { error: "Client introuvable." };

  const parsed = lire(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const { dateInstallation, ...reste } = parsed.data;

  const equipement = await prisma.equipement.create({
    data: {
      companyId: company.id,
      clientId,
      ...reste,
      dateInstallation: dateInstallation ? parseInputDate(dateInstallation) : null,
    },
  });

  revalidatePath(`/tableau-de-bord/clients/${clientId}`);
  redirect(`/tableau-de-bord/equipements/${equipement.id}`);
}

export async function modifierEquipement(
  id: string,
  _prev: EquipementFormState,
  formData: FormData,
): Promise<EquipementFormState> {
  const { company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);
  const parsed = lire(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const { dateInstallation, ...reste } = parsed.data;

  const res = await prisma.equipement.updateMany({
    where: { id, companyId: company.id },
    data: { ...reste, dateInstallation: dateInstallation ? parseInputDate(dateInstallation) : null },
  });
  if (res.count === 0) return { error: "Équipement introuvable." };

  revalidatePath(`/tableau-de-bord/equipements/${id}`);
  return { ok: true };
}

export async function supprimerEquipement(id: string) {
  const { company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);

  const equipement = await prisma.equipement.findFirst({ where: { id, companyId: company.id } });
  if (!equipement) redirect("/tableau-de-bord/clients");

  const nbContrats = await prisma.contrat.count({ where: { equipementId: id, companyId: company.id } });
  if (nbContrats > 0) {
    redirect(`/tableau-de-bord/equipements/${id}?erreur=contrats`);
  }

  await prisma.equipement.deleteMany({ where: { id, companyId: company.id } });
  revalidatePath(`/tableau-de-bord/clients/${equipement.clientId}`);
  redirect(`/tableau-de-bord/clients/${equipement.clientId}`);
}
