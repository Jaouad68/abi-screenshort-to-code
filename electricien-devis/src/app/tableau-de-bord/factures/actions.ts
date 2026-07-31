"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

async function majStatut(
  id: string,
  data: { statut: "EMISE" | "PAYEE" | "ANNULEE"; datePaiement?: Date | null },
) {
  const { user } = await requireUser();
  await prisma.facture.updateMany({ where: { id, userId: user.id }, data });
  revalidatePath(`/tableau-de-bord/factures/${id}`);
  revalidatePath("/tableau-de-bord/factures");
  revalidatePath("/tableau-de-bord");
}

export async function marquerPayee(id: string) {
  await majStatut(id, { statut: "PAYEE", datePaiement: new Date() });
}

export async function marquerEmise(id: string) {
  await majStatut(id, { statut: "EMISE", datePaiement: null });
}

export async function annulerFacture(id: string) {
  await majStatut(id, { statut: "ANNULEE", datePaiement: null });
}

export async function supprimerFacture(id: string) {
  const { user } = await requireUser();
  await prisma.facture.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/tableau-de-bord/factures");
  revalidatePath("/tableau-de-bord");
  redirect("/tableau-de-bord/factures");
}
