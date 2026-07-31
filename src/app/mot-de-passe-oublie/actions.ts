"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getEmailProvider } from "@/lib/email/provider";

const schema = z.object({
  email: z.email("Adresse e-mail invalide."),
});

export type DemandeReinitialisationState = {
  error?: string;
  envoye?: boolean;
};

function lienReinitialisation(token: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  return `${base}/reinitialiser-mot-de-passe/${token}`;
}

export async function demanderReinitialisation(
  _prev: DemandeReinitialisationState,
  formData: FormData
): Promise<DemandeReinitialisationState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Always behave the same way whether or not the account exists, to avoid
  // leaking which e-mails are registered.
  if (user) {
    const token = crypto.randomUUID();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await getEmailProvider().envoyer({
      destinataire: user.email,
      sujet: "Réinitialisez votre mot de passe RésaZen",
      corps: `Voici votre lien de réinitialisation (valable 1 heure) : ${lienReinitialisation(token)}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
    });
  }

  return { envoye: true };
}
