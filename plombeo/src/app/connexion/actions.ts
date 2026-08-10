"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { comparaisonFactice, ouvrirSession, verifierMotDePasse } from "@/lib/auth";
import { journaliser } from "@/lib/audit";
import { echecsRecents, enregistrerTentative, tentativeAutorisee } from "@/lib/securite";
import { premiereErreur, schemaConnexion } from "@/lib/validation";

/** L'e-mail est réémis après un échec (React 19 vide le formulaire), jamais le
 *  mot de passe. */
export type EtatConnexion = {
  erreur?: string;
  email?: string;
  tentative?: number;
};

/**
 * Message unique pour tous les échecs d'identification.
 *
 * Distinguer « e-mail inconnu » de « mot de passe incorrect » permettrait
 * d'énumérer les comptes existants.
 */
const IDENTIFIANTS_INVALIDES = "E-mail ou mot de passe incorrect.";

export async function connecter(
  _precedent: EtatConnexion,
  donnees: FormData,
): Promise<EtatConnexion> {
  const saisie = schemaConnexion.safeParse({
    email: donnees.get("email"),
    motDePasse: donnees.get("motDePasse"),
  });
  if (!saisie.success) return { erreur: premiereErreur(saisie.error), email: String(donnees.get('email') ?? ''), tentative: (_precedent.tentative ?? 0) + 1 };

  const { email, motDePasse } = saisie.data;

  if (!tentativeAutorisee(await echecsRecents(email))) {
    await journaliser({ action: "user.login_blocked", entityType: "User", metadata: { email } });
    return {
      erreur: "Trop de tentatives de connexion. Réessayez dans quelques minutes.",
      email,
      tentative: (_precedent.tentative ?? 0) + 1,
    };
  }

  const utilisateur = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      memberships: {
        select: { organizationId: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  if (!utilisateur) {
    // Comparaison factice : le temps de réponse doit être le même que pour un
    // compte existant, sans quoi la latence révélerait les e-mails enregistrés.
    await comparaisonFactice(motDePasse);
    await enregistrerTentative(email, false);
    await journaliser({ action: "user.login_failed", metadata: { email, raison: "inconnu" } });
    return { erreur: IDENTIFIANTS_INVALIDES, email: String(donnees.get('email') ?? ''), tentative: (_precedent.tentative ?? 0) + 1 };
  }

  if (!(await verifierMotDePasse(motDePasse, utilisateur.passwordHash))) {
    await enregistrerTentative(email, false);
    await journaliser({
      action: "user.login_failed",
      actorUserId: utilisateur.id,
      metadata: { email, raison: "mot_de_passe" },
    });
    return { erreur: IDENTIFIANTS_INVALIDES, email: String(donnees.get('email') ?? ''), tentative: (_precedent.tentative ?? 0) + 1 };
  }

  const membership = utilisateur.memberships[0];
  if (!membership) {
    // Compte sans organisation : anormal (l'inscription les crée ensemble).
    // On refuse plutôt que d'ouvrir une session sans contexte tenant.
    await journaliser({
      action: "user.login_failed",
      actorUserId: utilisateur.id,
      metadata: { email, raison: "sans_organisation" },
    });
    return {
      erreur: "Ce compte n'est rattaché à aucune entreprise. Contactez le support.",
      email,
      tentative: (_precedent.tentative ?? 0) + 1,
    };
  }

  await enregistrerTentative(email, true);
  await ouvrirSession(utilisateur.id, membership.organizationId);
  await journaliser({
    action: "user.logged_in",
    organizationId: membership.organizationId,
    actorUserId: utilisateur.id,
  });

  redirect("/app");
}
