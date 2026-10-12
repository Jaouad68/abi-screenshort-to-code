"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hacherMotDePasse, ouvrirSession, verifierMotDePasse } from "@/lib/auth";
import { journaliser } from "@/lib/audit";
import { resoudreInvitation } from "@/lib/invitations";
import { echecsRecents, enregistrerTentative, tentativeAutorisee } from "@/lib/securite";
import { LONGUEUR_MIN_MOT_DE_PASSE, premiereErreur } from "@/lib/validation";
import type { Role } from "@/generated/prisma/enums";

export type EtatInvitation = {
  erreur?: string;
  succes?: string;
  valeurs?: Record<string, string>;
  tentative?: number;
};

const schemaCreation = z.object({
  nomComplet: z
    .string()
    .trim()
    .min(1, "Votre nom est obligatoire.")
    .max(120, "Ce nom est trop long."),
  motDePasse: z
    .string()
    .min(
      LONGUEUR_MIN_MOT_DE_PASSE,
      `Le mot de passe doit contenir au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`,
    )
    .max(200, "Le mot de passe est trop long."),
});

/** Message unique : il ne dit pas si le lien est inconnu, révoqué, expiré ou déjà utilisé. */
const LIEN_INVALIDE =
  "Ce lien d'invitation n'est plus valable. Demandez-en un nouveau à l'entreprise " +
  "qui vous a invité.";

/**
 * Accepte une invitation.
 *
 * Deux chemins, parce que le risque n'est pas le même :
 *
 *  - **adresse sans compte** : on crée le compte et on ouvre la session, comme
 *    à l'inscription ;
 *  - **adresse ayant déjà un compte** : on exige le mot de passe de ce compte,
 *    et on n'ouvre AUCUNE session. Sans cela, quiconque intercepterait le lien
 *    entrerait dans un compte existant sans jamais en connaître le mot de passe
 *    — et contournerait au passage le second facteur. On rattache, puis on
 *    renvoie vers la connexion, qui reste la porte unique.
 *
 * Le rôle vient TOUJOURS de l'invitation, jamais du formulaire.
 */
export async function accepterInvitation(
  precedent: EtatInvitation,
  donnees: FormData,
): Promise<EtatInvitation> {
  const suite = (precedent.tentative ?? 0) + 1;
  const jeton = String(donnees.get("jeton") ?? "");

  const invitation = await resoudreInvitation(jeton);
  if (!invitation) return { erreur: LIEN_INVALIDE, tentative: suite };

  const motDePasse = String(donnees.get("motDePasse") ?? "");
  const nomComplet = String(donnees.get("nomComplet") ?? "");

  const compte = await prisma.user.findUnique({
    where: { email: invitation.email },
    select: { id: true, passwordHash: true },
  });

  /* ---------------------------------------------------------------------- */
  /* Compte existant : on prouve d'abord que c'est bien lui                  */
  /* ---------------------------------------------------------------------- */
  if (compte) {
    if (!tentativeAutorisee(await echecsRecents(invitation.email))) {
      return { erreur: "Trop de tentatives. Réessayez dans quelques minutes.", tentative: suite };
    }
    if (!(await verifierMotDePasse(motDePasse, compte.passwordHash))) {
      await enregistrerTentative(invitation.email, false);
      return {
        erreur: "Mot de passe incorrect pour ce compte Plombéo.",
        tentative: suite,
      };
    }
    await enregistrerTentative(invitation.email, true);

    const rattache = await rattacher(invitation.id, compte.id, invitation);
    if (!rattache) return { erreur: LIEN_INVALIDE, tentative: suite };

    return {
      succes:
        `Vous faites maintenant partie de ${invitation.nomEntreprise}. ` +
        "Connectez-vous pour y accéder.",
    };
  }

  /* ---------------------------------------------------------------------- */
  /* Nouveau compte                                                         */
  /* ---------------------------------------------------------------------- */
  const saisie = schemaCreation.safeParse({ nomComplet, motDePasse });
  if (!saisie.success) {
    return {
      erreur: premiereErreur(saisie.error),
      valeurs: { nomComplet },
      tentative: suite,
    };
  }

  const passwordHash = await hacherMotDePasse(saisie.data.motDePasse);

  let userId: string;
  try {
    userId = await prisma.$transaction(async (tx) => {
      // Consommation du jeton : conditionnée à `accepteeLe: null`, donc un
      // double envoi n'en profite pas. `count` à 0 annule tout le reste.
      const consomme = await tx.invitation.updateMany({
        where: {
          id: invitation.id,
          accepteeLe: null,
          revokeeLe: null,
          expiresAt: { gt: new Date() },
        },
        data: { accepteeLe: new Date() },
      });
      if (consomme.count !== 1) throw new ErreurJetonConsomme();

      const utilisateur = await tx.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          nomComplet: saisie.data.nomComplet,
        },
      });
      await tx.membership.create({
        data: {
          userId: utilisateur.id,
          organizationId: invitation.organizationId,
          // Le rôle vient de l'invitation. Il n'est pas lu du formulaire, et ne
          // peut donc pas être remonté par l'invité.
          role: invitation.role,
        },
      });
      return utilisateur.id;
    });
  } catch (erreur) {
    if (erreur instanceof ErreurJetonConsomme) {
      return { erreur: LIEN_INVALIDE, tentative: suite };
    }
    throw erreur;
  }

  await journaliser({
    action: "member.joined",
    organizationId: invitation.organizationId,
    actorUserId: userId,
    entityType: "Membership",
    metadata: { email: invitation.email, role: invitation.role },
  });

  await ouvrirSession(userId, invitation.organizationId);
  redirect("/app");
}

class ErreurJetonConsomme extends Error {}

/** Rattache un compte existant. Renvoie `false` si le jeton n'était plus valable. */
async function rattacher(
  invitationId: string,
  userId: string,
  invitation: { organizationId: string; role: Role; email: string },
): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      const consomme = await tx.invitation.updateMany({
        where: {
          id: invitationId,
          accepteeLe: null,
          revokeeLe: null,
          expiresAt: { gt: new Date() },
        },
        data: { accepteeLe: new Date() },
      });
      if (consomme.count !== 1) throw new ErreurJetonConsomme();

      const deja = await tx.membership.findUnique({
        where: {
          userId_organizationId: { userId, organizationId: invitation.organizationId },
        },
        select: { id: true },
      });
      // Déjà membre : l'invitation est consommée, le rôle en place n'est pas
      // écrasé. Une invitation ne doit pas servir à se faire changer de rôle.
      if (deja) return;

      await tx.membership.create({
        data: {
          userId,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });
    });
  } catch (erreur) {
    if (erreur instanceof ErreurJetonConsomme) return false;
    throw erreur;
  }

  await journaliser({
    action: "member.joined",
    organizationId: invitation.organizationId,
    actorUserId: userId,
    entityType: "Membership",
    metadata: { email: invitation.email, role: invitation.role },
  });
  return true;
}
