import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ajouterJours, dateISOActuelle, debutEtFinDeJourUtc, dateVersHeure } from "@/lib/datetime";
import { envoyerSms } from "@/lib/sms/service";
import { smsRappelJ2 } from "@/lib/sms/templates";
import { lienRendezVous } from "@/lib/sms/liens";

/**
 * Sends the J-2 "confirm or cancel" reminder for appointments happening in exactly
 * two days. Meant to be hit once a day by an external scheduler (Vercel Cron, etc.)
 * with header `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dateCible = ajouterJours(dateISOActuelle(), 2);
  const { debut, fin } = debutEtFinDeJourUtc(dateCible);

  const rendezVous = await prisma.appointment.findMany({
    where: {
      debutAt: { gte: debut, lte: fin },
      statut: "RESERVE",
      rappelEnvoye: false,
    },
    include: { client: true, salon: true },
  });

  let envoyes = 0;

  for (const rdv of rendezVous) {
    if (rdv.client.consentementSms) {
      const dateISO = rdv.debutAt.toISOString().slice(0, 10);
      const heure = dateVersHeure(rdv.debutAt);
      await envoyerSms({
        appointmentId: rdv.id,
        destinataire: rdv.client.telephone,
        gabarit: "RAPPEL_J2",
        corps: smsRappelJ2({
          salonNom: rdv.salon.nom,
          dateISO,
          heure,
          lien: lienRendezVous(rdv.bookingToken),
        }),
      });
      envoyes += 1;
    }

    await prisma.appointment.update({
      where: { id: rdv.id },
      data: { rappelEnvoye: true },
    });
  }

  return NextResponse.json({ traites: rendezVous.length, envoyes });
}
