"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hacherMotDePasse, ouvrirSession } from "@/lib/auth";
import { journaliser } from "@/lib/audit";
import { premiereErreur, schemaInscription } from "@/lib/validation";

export type EtatInscription = { erreur?: string };

export async function inscrire(
  _precedent: EtatInscription,
  donnees: FormData,
): Promise<EtatInscription> {
  const saisie = schemaInscription.safeParse({
    email: donnees.get("email"),
    motDePasse: donnees.get("motDePasse"),
    nomEntreprise: donnees.get("nomEntreprise"),
  });
  if (!saisie.success) return { erreur: premiereErreur(saisie.error) };

  const { email, motDePasse, nomEntreprise } = saisie.data;

  const existant = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existant) {
    // Message volontairement neutre : il n'annonce pas qu'un compte existe.
    return { erreur: "Impossible de créer ce compte. Vérifiez vos informations ou connectez-vous." };
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
