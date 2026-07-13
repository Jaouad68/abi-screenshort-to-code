"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSalon } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/paiement/provider";

async function chargerRendezVous(appointmentId: string, salonId: string) {
  return prisma.appointment.findFirst({
    where: { id: appointmentId, salonId },
  });
}

export async function marquerHonore(appointmentId: string) {
  const salon = await requireSalon();
  const rdv = await chargerRendezVous(appointmentId, salon.id);
  if (!rdv || (rdv.statut !== "RESERVE" && rdv.statut !== "CONFIRME")) return;

  await prisma.$transaction([
    prisma.appointment.update({ where: { id: rdv.id }, data: { statut: "HONORE" } }),
    prisma.client.update({
      where: { id: rdv.clientId },
      data: { honoredCount: { increment: 1 } },
    }),
  ]);

  // The deposit was only meant to deter a no-show; the client showed up, so refund it.
  if (rdv.acompteStatut === "REGLE" && rdv.stripeSessionId) {
    await getPaymentProvider().rembourser(rdv.stripeSessionId);
    await prisma.appointment.update({
      where: { id: rdv.id },
      data: { acompteStatut: "REMBOURSE" },
    });
  }

  revalidatePath("/tableau-de-bord");
}

export async function marquerNonVenu(appointmentId: string) {
  const salon = await requireSalon();
  const rdv = await chargerRendezVous(appointmentId, salon.id);
  if (!rdv || (rdv.statut !== "RESERVE" && rdv.statut !== "CONFIRME")) return;

  await prisma.$transaction([
    prisma.appointment.update({ where: { id: rdv.id }, data: { statut: "NON_VENU" } }),
    prisma.client.update({
      where: { id: rdv.clientId },
      data: { noShowCount: { increment: 1 } },
    }),
  ]);

  // The no-show is exactly what the deposit was meant to cover: keep it.
  if (rdv.acompteStatut === "REGLE") {
    await prisma.appointment.update({
      where: { id: rdv.id },
      data: { acompteStatut: "CONSERVE" },
    });
  }

  revalidatePath("/tableau-de-bord");
}
