import "server-only";
import { prisma } from "@/lib/prisma";
import { getSmsProvider } from "./provider";
import { analyserSms } from "./segments";
import type { SmsGabarit } from "@/generated/prisma/client";

export async function envoyerSms(params: {
  appointmentId: string;
  destinataire: string;
  gabarit: SmsGabarit;
  corps: string;
}): Promise<void> {
  const { segments } = analyserSms(params.corps);
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
