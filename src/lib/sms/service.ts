import "server-only";
import { prisma } from "@/lib/prisma";
import { getSmsProvider } from "./provider";
import { analyserSms } from "./segments";
import { definitionPlan } from "@/lib/facturation/plans";
import { moisActuelISO, debutEtFinDeMoisUtc } from "@/lib/datetime";
import type { SmsGabarit } from "@/generated/prisma/client";

async function quotaDepasse(salonId: string, salonPlan: Parameters<typeof definitionPlan>[0]): Promise<boolean> {
  const quota = definitionPlan(salonPlan).quotaSms;
  if (quota === null) return false;

  const { debut, fin } = debutEtFinDeMoisUtc(moisActuelISO());
  const envoyesCeMois = await prisma.smsLog.count({
    where: {
      direction: "SORTANT",
      statut: { not: "QUOTA_DEPASSE" },
      envoyeLe: { gte: debut, lt: fin },
      appointment: { salonId },
    },
  });

  return envoyesCeMois >= quota;
}

export async function envoyerSms(params: {
  appointmentId: string;
  destinataire: string;
  gabarit: SmsGabarit;
  corps: string;
}): Promise<void> {
  const { segments } = analyserSms(params.corps);

  const appointment = await prisma.appointment.findUnique({
    where: { id: params.appointmentId },
    select: { salon: { select: { id: true, plan: true } } },
  });

  if (appointment && (await quotaDepasse(appointment.salon.id, appointment.salon.plan))) {
    await prisma.smsLog.create({
      data: {
        appointmentId: params.appointmentId,
        direction: "SORTANT",
        gabarit: params.gabarit,
        destinataire: params.destinataire,
        corps: params.corps,
        segments,
        statut: "QUOTA_DEPASSE",
      },
    });
    return;
  }

  const provider = getSmsProvider();
  const resultat = await provider.envoyer({
    destinataire: params.destinataire,
    corps: params.corps,
  });

  await prisma.smsLog.create({
    data: {
      appointmentId: params.appointmentId,
      direction: "SORTANT",
      gabarit: params.gabarit,
      destinataire: params.destinataire,
      corps: params.corps,
      segments,
      statut: resultat.statut,
    },
  });
}
