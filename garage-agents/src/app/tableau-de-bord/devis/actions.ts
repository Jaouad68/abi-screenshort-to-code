"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireGarageId } from "@/lib/auth";
import { envoyerSms } from "@/lib/sms";

const ajoutSchema = z.object({
  clientNom: z.string().trim().min(2, "Nom du client requis."),
  clientTelephone: z.string().trim().optional().default(""),
  clientEmail: z.union([z.email(), z.literal("")]).optional().default(""),
  montant: z.coerce.number().positive("Montant invalide."),
});

export type AjoutDevisState = { error?: string };

export async function ajouterDevis(
  _prev: AjoutDevisState,
  formData: FormData
): Promise<AjoutDevisState> {
  const garageId = await requireGarageId();

  const parsed = ajoutSchema.safeParse({
    clientNom: formData.get("clientNom"),
    clientTelephone: formData.get("clientTelephone") ?? "",
    clientEmail: formData.get("clientEmail") ?? "",
    montant: formData.get("montant"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { clientNom, clientTelephone, clientEmail, montant } = parsed.data;
  const nombreDevis = await prisma.devis.count({ where: { garageId } });
  const reference = `#${1041 + nombreDevis + 1}`;

  await prisma.devis.create({
    data: {
      garageId,
      reference,
      clientNom,
      clientTelephone,
      clientEmail,
      montantCentimes: Math.round(montant * 100),
    },
  });

  revalidatePath("/tableau-de-bord/devis");
  revalidatePath("/tableau-de-bord");
  return {};
}

/** Relance manuelle immédiate d'un devis, en plus des relances automatiques du cron. */
export async function relancerDevisMaintenant(devisId: string) {
  const garageId = await requireGarageId();

  const devis = await prisma.devis.findFirst({
    where: { id: devisId, garageId },
    include: { garage: { select: { nom: true } } },
  });
  if (!devis || devis.statut === "SIGNE" || devis.statut === "PERDU") return;

  const corps = `Bonjour ${devis.clientNom}, votre devis ${devis.reference} (${(devis.montantCentimes / 100).toLocaleString("fr-FR")} €) est toujours disponible. Contactez-nous si vous souhaitez y donner suite — ${devis.garage.nom}.`;
  const resultat = devis.clientTelephone
    ? await envoyerSms(devis.clientTelephone, corps)
    : { ok: true, simule: true };

  await prisma.$transaction([
    prisma.relanceDevis.create({
      data: { devisId, simule: resultat.simule },
    }),
    prisma.devis.updateMany({
      where: { id: devisId, garageId },
      data: { statut: "RELANCE" },
    }),
  ]);

  revalidatePath("/tableau-de-bord/devis");
  revalidatePath("/tableau-de-bord");
}

export async function marquerStatutDevis(devisId: string, statut: "SIGNE" | "PERDU") {
  const garageId = await requireGarageId();

  await prisma.devis.updateMany({
    where: { id: devisId, garageId },
    data: { statut },
  });

  revalidatePath("/tableau-de-bord/devis");
  revalidatePath("/tableau-de-bord");
}
