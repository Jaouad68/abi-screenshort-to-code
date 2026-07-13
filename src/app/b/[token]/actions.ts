"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { envoyerSms } from "@/lib/sms/service";
import { smsAccuseAnnulationClient, smsNotifGerantCreneauLibere } from "@/lib/sms/templates";
import { dateVersHeure } from "@/lib/datetime";

async function chargerParToken(token: string) {
  return prisma.appointment.findUnique({
    where: { bookingToken: token },
    include: { client: true, salon: true, service: true },
  });
}

export async function confirmerRdv(token: string) {
  const rdv = await chargerParToken(token);
  if (!rdv || rdv.statut !== "RESERVE") return;

  await prisma.appointment.update({ where: { id: rdv.id }, data: { statut: "CONFIRME" } });
  revalidatePath(`/b/${token}`);
}

export async function annulerRdv(token: string) {
  const rdv = await chargerParToken(token);
  if (!rdv || (rdv.statut !== "RESERVE" && rdv.statut !== "CONFIRME")) return;

  await prisma.appointment.update({ where: { id: rdv.id }, data: { statut: "ANNULE" } });

  const dateISO = rdv.debutAt.toISOString().slice(0, 10);
  const heure = dateVersHeure(rdv.debutAt);

  if (rdv.client.consentementSms) {
    await envoyerSms({
      appointmentId: rdv.id,
      destinataire: rdv.client.telephone,
      gabarit: "ANNULATION",
      corps: smsAccuseAnnulationClient({ salonNom: rdv.salon.nom, dateISO, heure }),
    });
  }

  if (rdv.salon.telephone) {
    await envoyerSms({
      appointmentId: rdv.id,
      destinataire: rdv.salon.telephone,
      gabarit: "NOTIF_GERANT",
      corps: smsNotifGerantCreneauLibere({ clientPrenom: rdv.client.prenom, dateISO, heure }),
    });
  }

  revalidatePath(`/b/${token}`);
  revalidatePath("/tableau-de-bord");
}
