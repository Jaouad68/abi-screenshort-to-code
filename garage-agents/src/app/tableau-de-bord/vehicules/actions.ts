"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireGarageId } from "@/lib/auth";
import { envoyerSms } from "@/lib/sms";
import { joursRestants } from "@/lib/ct";

const ajoutSchema = z.object({
  plaque: z.string().trim().min(2, "Plaque invalide.").toUpperCase(),
  clientNom: z.string().trim().min(2, "Nom du client requis."),
  clientTelephone: z.string().trim().optional().default(""),
  clientEmail: z.union([z.email(), z.literal("")]).optional().default(""),
  ctEcheance: z.string().min(1, "Date de contrôle technique requise."),
});

export type AjoutVehiculeState = { error?: string };

export async function ajouterVehicule(
  _prev: AjoutVehiculeState,
  formData: FormData
): Promise<AjoutVehiculeState> {
  const garageId = await requireGarageId();

  const parsed = ajoutSchema.safeParse({
    plaque: formData.get("plaque"),
    clientNom: formData.get("clientNom"),
    clientTelephone: formData.get("clientTelephone") ?? "",
    clientEmail: formData.get("clientEmail") ?? "",
    ctEcheance: formData.get("ctEcheance"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { plaque, clientNom, clientTelephone, clientEmail, ctEcheance } = parsed.data;

  await prisma.vehicule.create({
    data: {
      garageId,
      plaque,
      clientNom,
      clientTelephone,
      clientEmail,
      ctEcheance: new Date(ctEcheance),
    },
  });

  revalidatePath("/tableau-de-bord/vehicules");
  revalidatePath("/tableau-de-bord");
  return {};
}

/** Envoi manuel immédiat d'un rappel CT, en plus des paliers automatiques du cron. */
export async function envoyerRappelMaintenant(vehiculeId: string) {
  const garageId = await requireGarageId();

  const vehicule = await prisma.vehicule.findFirst({
    where: { id: vehiculeId, garageId },
    include: { garage: { select: { nom: true } } },
  });
  if (!vehicule) return;

  const corps = `Bonjour ${vehicule.clientNom}, le contrôle technique de votre véhicule ${vehicule.plaque} est prévu le ${vehicule.ctEcheance.toLocaleDateString("fr-FR")}. Contactez-nous pour prendre rendez-vous — ${vehicule.garage.nom}.`;
  const resultat = vehicule.clientTelephone
    ? await envoyerSms(vehicule.clientTelephone, corps)
    : { ok: true, simule: true };

  await prisma.$transaction([
    prisma.rappelCt.create({
      data: {
        vehiculeId,
        palierJours: Math.max(0, joursRestants(vehicule.ctEcheance, new Date())),
        simule: resultat.simule,
      },
    }),
    prisma.vehicule.updateMany({
      where: { id: vehiculeId, garageId, statut: "A_VENIR" },
      data: { statut: "ENVOYE" },
    }),
  ]);

  revalidatePath("/tableau-de-bord/vehicules");
  revalidatePath("/tableau-de-bord");
}

export async function marquerStatutVehicule(
  vehiculeId: string,
  statut: "CONFIRME" | "SANS_REPONSE" | "ENVOYE"
) {
  const garageId = await requireGarageId();

  await prisma.vehicule.updateMany({
    where: { id: vehiculeId, garageId },
    data: { statut },
  });

  revalidatePath("/tableau-de-bord/vehicules");
  revalidatePath("/tableau-de-bord");
}
