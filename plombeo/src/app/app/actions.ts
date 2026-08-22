"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { fermerSession, revoquerToutesLesSessions } from "@/lib/auth";
import { journaliser } from "@/lib/audit";
import { exigerPermission, exigerSession } from "@/lib/dal";
import { premiereErreur, schemaOrganisation } from "@/lib/validation";

/**
 * État renvoyé par les Server Actions de formulaire.
 *
 * `valeurs` et `tentative` compensent la réinitialisation automatique du
 * formulaire par React 19 après l'exécution d'une action : sans réémission de
 * la saisie, une erreur de validation viderait tous les champs déjà remplis.
 */
export type EtatFormulaire = {
  erreur?: string;
  succes?: string;
  valeurs?: Record<string, string>;
  tentative?: number;
};

const CHAMPS_ORGANISATION = [
  "nom", "formeJuridique", "siret", "adresse", "codePostal", "ville", "telephone", "email",
] as const;

export async function deconnecter(): Promise<void> {
  const { sessionId, userId, organizationId } = await exigerSession();
  await fermerSession(sessionId);
  await journaliser({ action: "user.logged_out", organizationId, actorUserId: userId });
  redirect("/connexion");
}

export async function deconnecterTousLesAppareils(): Promise<void> {
  const { userId, organizationId } = await exigerSession();
  const nombre = await revoquerToutesLesSessions(userId);
  await journaliser({
    action: "user.sessions_revoked",
    organizationId,
    actorUserId: userId,
    metadata: { sessions: nombre },
  });
  redirect("/connexion");
}

export async function mettreAJourOrganisation(
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  // La permission est vérifiée côté serveur : masquer le bouton dans l'interface
  // ne protège rien, une Server Action est un point d'entrée réseau.
  const { organizationId, userId } = await exigerPermission("organisation:modifier");

  const saisie = schemaOrganisation.safeParse({
    nom: donnees.get("nom"),
    formeJuridique: donnees.get("formeJuridique") ?? "",
    siret: donnees.get("siret") ?? "",
    adresse: donnees.get("adresse") ?? "",
    codePostal: donnees.get("codePostal") ?? "",
    ville: donnees.get("ville") ?? "",
    telephone: donnees.get("telephone") ?? "",
    email: donnees.get("email") ?? "",
  });
  if (!saisie.success) {
    return {
      erreur: premiereErreur(saisie.error),
      valeurs: Object.fromEntries(
        CHAMPS_ORGANISATION.map((c) => [c, String(donnees.get(c) ?? "")]),
      ),
      tentative: (_precedent.tentative ?? 0) + 1,
    };
  }

  // L'identifiant de l'organisation vient de la session, jamais du formulaire :
  // c'est ce qui empêche de modifier l'entreprise d'un autre artisan.
  await prisma.organization.update({ where: { id: organizationId }, data: saisie.data });

  await journaliser({
    action: "organization.updated",
    organizationId,
    actorUserId: userId,
    entityType: "Organization",
    entityId: organizationId,
  });

  revalidatePath("/app/entreprise");
  return { succes: "Les informations de votre entreprise ont été enregistrées." };
}
