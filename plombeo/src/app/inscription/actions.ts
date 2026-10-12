"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hacherMotDePasse, ouvrirSession } from "@/lib/auth";
import { journaliser } from "@/lib/audit";
import { premiereErreur, schemaInscription } from "@/lib/validation";

/** `valeurs`/`tentative` : voir EtatCrm — React 19 réinitialise le formulaire
 *  après l'action. Le mot de passe n'est délibérément jamais réémis. */
export type EtatInscription = {
  erreur?: string;
  valeurs?: Record<string, string>;
  tentative?: number;
};

function rejouer(precedent: EtatInscription, erreur: string, donnees: FormData): EtatInscription {
  return {
    erreur,
    valeurs: {
      email: String(donnees.get("email") ?? ""),
      nomEntreprise: String(donnees.get("nomEntreprise") ?? ""),
    },
    tentative: (precedent.tentative ?? 0) + 1,
  };
}

export async function inscrire(
  _precedent: EtatInscription,
  donnees: FormData,
): Promise<EtatInscription> {
  const saisie = schemaInscription.safeParse({
    email: donnees.get("email"),
    motDePasse: donnees.get("motDePasse"),
    nomEntreprise: donnees.get("nomEntreprise"),
  });
  if (!saisie.success) return rejouer(_precedent, premiereErreur(saisie.error), donnees);

  const { email, motDePasse, nomEntreprise } = saisie.data;

  const existant = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existant) {
    // Message volontairement neutre : il n'annonce pas qu'un compte existe.
    return rejouer(
      _precedent,
      "Impossible de créer ce compte. Vérifiez vos informations ou connectez-vous.",
      donnees,
    );
  }

  const passwordHash = await hacherMotDePasse(motDePasse);

  // Transaction : un compte sans organisation, ou une organisation sans
  // propriétaire, laisserait l'artisan dans un état inutilisable.
  const { user, organisation } = await prisma.$transaction(async (tx) => {
    const organisation = await tx.organization.create({ data: { nom: nomEntreprise } });
    const user = await tx.user.create({ data: { email, passwordHash } });
    await tx.membership.create({
      data: { userId: user.id, organizationId: organisation.id, role: "PROPRIETAIRE" },
    });
    return { user, organisation };
  });

  await journaliser({
    action: "organization.created",
    organizationId: organisation.id,
    actorUserId: user.id,
    entityType: "Organization",
    entityId: organisation.id,
  });
  await journaliser({
    action: "user.registered",
    organizationId: organisation.id,
    actorUserId: user.id,
    entityType: "User",
    entityId: user.id,
  });

  await ouvrirSession(user.id, organisation.id);

  // redirect() interrompt l'exécution par une exception de contrôle de flux :
  // aucun code placé après ne s'exécute.
  redirect("/app");
}
