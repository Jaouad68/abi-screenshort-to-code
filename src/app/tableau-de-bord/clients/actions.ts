"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSalon } from "@/lib/auth";

export async function anonymiserClient(clientId: string) {
  const salon = await requireSalon();

  const client = await prisma.client.findFirst({ where: { id: clientId, salonId: salon.id } });
  if (!client) return;

  // Erase personal identifiers (droit à la suppression) while keeping the row so
  // the salon's appointment history and bilan stay intact — the no-show/honored
  // counters are aggregate business data, not personal data on their own.
  await prisma.client.update({
    where: { id: client.id },
    data: {
      prenom: "Client supprimé",
      telephone: `supprime-${client.id}`,
      consentementSms: false,
      consentementDate: null,
    },
  });

  revalidatePath("/tableau-de-bord/clients");
}
