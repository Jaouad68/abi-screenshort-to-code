import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyserSms } from "@/lib/sms/segments";

/**
 * Inbound SMS webhook: a real provider (Brevo, smsmode, Twilio...) calls this when
 * a client replies to one of our messages. A "STOP" reply withdraws SMS consent for
 * every client record matching that phone number (across salons, since the person
 * is opting out of receiving SMS from this platform at all), per README §11's
 * "gérer le STOP obligatoire". Adapt the payload shape below to your provider's
 * actual webhook format.
 *
 * Protected by a shared secret: `Authorization: Bearer ${STOP_SMS_SECRET}`.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STOP_SMS_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const from: string | undefined = body.from;
  const texte: string | undefined = body.text;

  if (!from || !texte) {
    return NextResponse.json({ error: "Missing from/text" }, { status: 400 });
  }

  const telephone = from.replace(/[\s.-]/g, "");
  const estStop = texte.trim().toUpperCase().startsWith("STOP");

  if (!estStop) {
    return NextResponse.json({ traite: false });
  }

  const clients = await prisma.client.findMany({ where: { telephone } });

  for (const client of clients) {
    await prisma.client.update({
      where: { id: client.id },
      data: { consentementSms: false, consentementDate: new Date() },
    });

    const dernierRdv = await prisma.appointment.findFirst({
      where: { clientId: client.id },
      orderBy: { debutAt: "desc" },
    });

    if (dernierRdv) {
      const { segments } = analyserSms(texte);
      await prisma.smsLog.create({
        data: {
          appointmentId: dernierRdv.id,
          direction: "ENTRANT",
          gabarit: "STOP",
          destinataire: telephone,
          corps: texte,
          segments,
          statut: "ENVOYE",
        },
      });
    }
  }

  return NextResponse.json({ traite: true, clientsMisAJour: clients.length });
}
