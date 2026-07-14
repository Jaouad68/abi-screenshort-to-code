"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSessionCookie, getSession } from "@/lib/auth";
import { uniqueSalonSlug } from "@/lib/slug";
import { DEFAULT_HORAIRES, DEFAULT_REGLAGES_ACOMPTE } from "@/lib/horaires";

export async function changerSalonActif(salonId: string) {
  const session = await getSession();
  if (!session) redirect("/connexion");

  const membership = await prisma.membership.findUnique({
    where: { userId_salonId: { userId: session.userId, salonId } },
  });
  if (!membership) redirect("/tableau-de-bord");

  await createSessionCookie(session.userId, salonId);
  redirect("/tableau-de-bord");
}

export type AjouterSalonState = {
  error?: string;
};

export async function ajouterSalon(
  _prev: AjouterSalonState,
  formData: FormData
): Promise<AjouterSalonState> {
  const nom = (formData.get("nom") as string | null)?.trim() ?? "";
  if (nom.length < 2) {
    return { error: "Le nom du salon est trop court." };
  }

  const session = await getSession();
  if (!session) redirect("/connexion");

  const slug = await uniqueSalonSlug(nom);
  const salon = await prisma.salon.create({
    data: {
      nom,
      slug,
      horaires: DEFAULT_HORAIRES,
      reglagesAcompte: DEFAULT_REGLAGES_ACOMPTE,
      memberships: { create: { userId: session.userId } },
      praticiens: { create: { nom: "Praticien principal" } },
    },
  });

  await createSessionCookie(session.userId, salon.id);
  redirect("/tableau-de-bord");
}
