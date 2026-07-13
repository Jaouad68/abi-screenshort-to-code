"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { slotsFor } from "@/lib/slots";
import {
  dateVersJour,
  dateEtHeureVersDate,
  dateVersHeure,
  debutEtFinDeJourUtc,
  dateISOActuelle,
  heureActuelleUtc,
} from "@/lib/datetime";
import type { Horaires, ReglagesAcompte } from "@/lib/horaires";
import { telephoneMobileFr } from "@/lib/telephone";
import { envoyerSms } from "@/lib/sms/service";
import { smsConfirmationClient, smsNotifGerantNouveauRdv } from "@/lib/sms/templates";
import { lienRendezVous, lienReservation } from "@/lib/sms/liens";
import { acompteRequis, montantAcompteCents } from "@/lib/acompte";
import { getPaymentProvider } from "@/lib/paiement/provider";

async function creneauxDisponibles(salonSlug: string, serviceId: string, dateISO: string) {
  const salon = await prisma.salon.findUnique({ where: { slug: salonSlug } });
  if (!salon) return [];

  const service = await prisma.service.findFirst({
    where: { id: serviceId, salonId: salon.id, actif: true },
  });
  if (!service) return [];

  const horaires = salon.horaires as Horaires;
  const jour = dateVersJour(dateISO);
  const jourHoraire = horaires.find((h) => h.jour === jour);
  if (!jourHoraire || jourHoraire.fenetres.length === 0) return [];

  const { debut, fin } = debutEtFinDeJourUtc(dateISO);
  const rdvsExistants = await prisma.appointment.findMany({
    where: {
      salonId: salon.id,
      debutAt: { gte: debut, lte: fin },
      statut: { not: "ANNULE" },
    },
    select: { debutAt: true, finAt: true },
  });

  const occupes = rdvsExistants.map((r) => ({
    debut: dateVersHeure(r.debutAt),
    fin: dateVersHeure(r.finAt),
  }));

  const slots = slotsFor({
    fenetres: jourHoraire.fenetres,
    dureeMin: service.dureeMin,
    bufferMin: service.bufferMin,
    occupes,
  });

  // A slot earlier today than the current time can no longer be booked.
  if (dateISO === dateISOActuelle()) {
    const heureActuelle = heureActuelleUtc();
    return slots.filter((s) => s > heureActuelle);
  }

  return slots;
}

export async function obtenirCreneaux(salonSlug: string, serviceId: string, dateISO: string) {
  return creneauxDisponibles(salonSlug, serviceId, dateISO);
}

const schemaReservation = z.object({
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  heure: z.string().regex(/^\d{2}:\d{2}$/),
  prenom: z.string().trim().min(1, "Prénom requis."),
  telephone: telephoneMobileFr,
  consentementSms: z.boolean(),
});

export type ReservationState = {
  error?: string;
  succes?: {
    prenom: string;
    heure: string;
    date: string;
    serviceNom: string;
    acompteDuCents?: number;
  };
};

export async function reserver(
  salonSlug: string,
  _prev: ReservationState,
  formData: FormData
): Promise<ReservationState> {
  const parsed = schemaReservation.safeParse({
    serviceId: formData.get("serviceId"),
    date: formData.get("date"),
    heure: formData.get("heure"),
    prenom: formData.get("prenom"),
    telephone: formData.get("telephone"),
    consentementSms: formData.get("consentementSms") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { serviceId, date, heure, prenom, telephone, consentementSms } = parsed.data;

  const salon = await prisma.salon.findUnique({ where: { slug: salonSlug } });
  if (!salon) return { error: "Salon introuvable." };

  const service = await prisma.service.findFirst({
    where: { id: serviceId, salonId: salon.id, actif: true },
  });
  if (!service) return { error: "Prestation introuvable." };

  // Re-validate against the live schedule to avoid a race with another booking.
  const disponibles = await creneauxDisponibles(salonSlug, serviceId, date);
  if (!disponibles.includes(heure)) {
    return { error: "Ce créneau vient d'être pris. Merci d'en choisir un autre." };
  }

  const debutAt = dateEtHeureVersDate(date, heure);
  const finAt = new Date(debutAt.getTime() + (service.dureeMin + service.bufferMin) * 60_000);

  const client = await prisma.client.upsert({
    where: { salonId_telephone: { salonId: salon.id, telephone } },
    update: { prenom, consentementSms, consentementDate: consentementSms ? new Date() : undefined },
    create: {
      salonId: salon.id,
      prenom,
      telephone,
      consentementSms,
      consentementDate: consentementSms ? new Date() : null,
    },
  });

  const bookingToken = crypto.randomUUID();

  const reglages = salon.reglagesAcompte as ReglagesAcompte;
  const depositRequis = acompteRequis(client, reglages);
  const acompteCents = depositRequis ? montantAcompteCents(reglages, service.prixCents) : 0;

  const rdv = await prisma.appointment.create({
    data: {
      salonId: salon.id,
      serviceId: service.id,
      clientId: client.id,
      debutAt,
      finAt,
      statut: "RESERVE",
      source: "EN_LIGNE",
      bookingToken,
      acompteCents,
      acompteStatut: depositRequis ? "DEMANDE" : "AUCUN",
    },
  });

  const lien = lienRendezVous(bookingToken);

  if (salon.telephone) {
    await envoyerSms({
      appointmentId: rdv.id,
      destinataire: salon.telephone,
      gabarit: "NOTIF_GERANT",
      corps: smsNotifGerantNouveauRdv({
        clientPrenom: prenom,
        dateISO: date,
        heure,
        serviceNom: service.nom,
      }),
    });
  }

  if (depositRequis) {
    const session = await getPaymentProvider().creerSessionPaiement({
      appointmentId: rdv.id,
      montantCents: acompteCents,
      description: `Acompte - ${service.nom} - ${salon.nom}`,
      successUrl: lien,
      cancelUrl: lienReservation(salonSlug),
    });

    if (session.sessionId && session.url) {
      await prisma.appointment.update({
        where: { id: rdv.id },
        data: { stripeSessionId: session.sessionId },
      });
      redirect(session.url);
    }

    // No payment provider configured: the deposit is recorded as due but not
    // collectable online yet, so the client-facing confirmation still goes out.
    if (consentementSms) {
      await envoyerSms({
        appointmentId: rdv.id,
        destinataire: telephone,
        gabarit: "CONFIRMATION",
        corps: smsConfirmationClient({ salonNom: salon.nom, dateISO: date, heure, lien }),
      });
    }

    return {
      succes: { prenom, heure, date, serviceNom: service.nom, acompteDuCents: acompteCents },
    };
  }

  if (consentementSms) {
    await envoyerSms({
      appointmentId: rdv.id,
      destinataire: telephone,
      gabarit: "CONFIRMATION",
      corps: smsConfirmationClient({ salonNom: salon.nom, dateISO: date, heure, lien }),
    });
  }

  return { succes: { prenom, heure, date, serviceNom: service.nom } };
}
