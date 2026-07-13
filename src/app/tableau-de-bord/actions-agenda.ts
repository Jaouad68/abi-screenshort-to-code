"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSalon } from "@/lib/auth";

async function chargerRendezVous(appointmentId: string, salonId: string) {
  return prisma.appointment.findFirst({
    where: { id: appointmentId, salonId },
  });
}

export async function marquerHonore(appointmentId: string) {
  const salon = await requireSalon();
  const rdv = await chargerRendezVous(appointmentId, salon.id);
  if (!rdv || rdv.statut !== "RESERVE") return;

  await prisma.$transaction([
    prisma.appointment.update({ where: { id: rdv.id }, data: { statut: "HONORE" } }),
    prisma.client.update({
      where: { id: rdv.clientId },
      data: { honoredCount: { increment: 1 } },
    }),
  ]);

  revalidatePath("/tableau-de-bord");
}

export async function marquerNonVenu(appointmentId: string) {
  const salon = await requireSalon();
  const rdv = await chargerRendezVous(appointmentId, salon.id);
  if (!rdv || rdv.statut !== "RESERVE") return;

  await prisma.$transaction([
    prisma.appointment.update({ where: { id: rdv.id }, data: { statut: "NON_VENU" } }),
    prisma.client.update({
      where: { id: rdv.clientId },
      data: { noShowCount: { increment: 1 } },
    }),
  ]);

  revalidatePath("/tableau-de-bord");
}
