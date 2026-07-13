"use server";

import { redirect } from "next/navigation";
import { requireSalon, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { creerSessionAbonnement, creerSessionPortailFacturation } from "@/lib/facturation/stripe";
import type { Plan } from "@/generated/prisma/enums";

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

export async function souscrire(plan: Plan) {
  const salon = await requireSalon();
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;

  const url = await creerSessionAbonnement({
    salonId: salon.id,
    plan,
    stripeCustomerId: salon.stripeCustomerId,
    email: user?.email ?? "",
    successUrl: `${baseUrl()}/tableau-de-bord/facturation`,
    cancelUrl: `${baseUrl()}/tableau-de-bord/facturation`,
  });

  if (url) redirect(url);
}

export async function gererAbonnement() {
  const salon = await requireSalon();
  if (!salon.stripeCustomerId) return;

  const url = await creerSessionPortailFacturation(
    salon.stripeCustomerId,
    `${baseUrl()}/tableau-de-bord/facturation`
  );

  if (url) redirect(url);
}
