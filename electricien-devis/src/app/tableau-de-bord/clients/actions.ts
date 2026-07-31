"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  nom: z.string().trim().min(1, "Le nom du client est obligatoire."),
  adresse: z.string().trim(),
  codePostal: z.string().trim(),
  ville: z.string().trim(),
  telephone: z.string().trim(),
  email: z.string().trim(),
  notes: z.string().trim(),
});

export type ClientFormState = {
  ok?: boolean;
  error?: string;
};

function lire(formData: FormData) {
  return schema.safeParse({
    nom: formData.get("nom"),
    adresse: formData.get("adresse"),
    codePostal: formData.get("codePostal"),
    ville: formData.get("ville"),
    telephone: formData.get("telephone"),
    email: formData.get("email"),
    notes: formData.get("notes"),
  });
}

export async function creerClient(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const { user } = await requireUser();
  const parsed = lire(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const client = await prisma.client.create({
    data: { userId: user.id, ...parsed.data },
  });

  revalidatePath("/tableau-de-bord/clients");
  redirect(`/tableau-de-bord/clients/${client.id}`);
}

export async function modifierClient(
  id: string,
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const { user } = await requireUser();
  const parsed = lire(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  // updateMany borne la mise à jour aux clients de l'utilisateur (sécurité).
  const res = await prisma.client.updateMany({
    where: { id, userId: user.id },
    data: parsed.data,
  });
  if (res.count === 0) return { error: "Client introuvable." };

  revalidatePath(`/tableau-de-bord/clients/${id}`);
  revalidatePath("/tableau-de-bord/clients");
  return { ok: true };
}

export async function supprimerClient(id: string) {
  const { user } = await requireUser();

  const nbDevis = await prisma.devis.count({ where: { clientId: id, userId: user.id } });
  if (nbDevis > 0) {
    // On protège l'historique : un client rattaché à des devis n'est pas supprimable.
    redirect(`/tableau-de-bord/clients/${id}?erreur=devis`);
  }

  await prisma.client.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/tableau-de-bord/clients");
  redirect("/tableau-de-bord/clients");
}
