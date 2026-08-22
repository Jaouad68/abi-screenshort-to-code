"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { exigerPermission, sessionCourante } from "@/lib/dal";
import { journaliser } from "@/lib/audit";
import { hacherJeton } from "@/lib/session";
import { DUREE_INVITATION_JOURS } from "@/lib/roles";
import {
  genererCodesRecuperation,
  genererSecretTotp,
  peutInviterAuRole,
  verifierTotp,
} from "@/lib/mfa";
import type { Role } from "@/generated/prisma/enums";

export type EtatEquipe = {
  erreur?: string;
  succes?: string;
  tentative?: number;
  lien?: string;
  secret?: string;
  uri?: string;
  codes?: string[];
};

function texte(donnees: FormData, champ: string): string {
  const v = donnees.get(champ);
  return typeof v === "string" ? v.trim() : "";
}

const ROLES: Role[] = [
  "PROPRIETAIRE", "ADMINISTRATEUR", "ASSISTANT", "TECHNICIEN",
  "APPRENTI", "SOUS_TRAITANT", "COMPTABLE", "LECTURE_SEULE",
];

/**
 * Invite un membre.
 *
 * Aucun compte n'est créé : un compte créé d'avance est un compte sans mot de
 * passe choisi, donc une porte ouverte en attente. Le RÔLE est figé ici, jamais
 * choisi par l'invité.
 */
export async function inviterMembre(
  precedent: EtatEquipe,
  donnees: FormData,
): Promise<EtatEquipe> {
  const { organizationId, userId, email: emailInvitant } =
    await exigerPermission("membre:inviter");
  const contexte = await sessionCourante();
  if (!contexte) return { erreur: "Session expirée." };

  const suite = (precedent.tentative ?? 0) + 1;
  const email = texte(donnees, "email").toLowerCase();
  if (!email.includes("@")) return { erreur: "Adresse e-mail invalide.", tentative: suite };

  const roleSaisi = texte(donnees, "role") as Role;
  if (!ROLES.includes(roleSaisi)) return { erreur: "Rôle inconnu.", tentative: suite };

  // On n'invite JAMAIS plus haut que soi : sans cette règle, l'invitation
  // devient un mécanisme d'élévation de privilèges.
  if (!peutInviterAuRole(contexte.role, roleSaisi)) {
    return {
      erreur: "Vous ne pouvez pas inviter quelqu'un à un rôle supérieur ou égal au vôtre.",
      tentative: suite,
    };
  }

  const jeton = randomBytes(32).toString("base64url");
  await prisma.invitation.create({
    data: {
      tokenHash: hacherJeton(jeton),
      email,
      role: roleSaisi,
      expiresAt: new Date(Date.now() + DUREE_INVITATION_JOURS * 24 * 3600 * 1000),
      parEmail: emailInvitant,
      organizationId,
    },
  });

  await journaliser({
    action: "member.invited",
    organizationId,
    actorUserId: userId,
    entityType: "Invitation",
    metadata: { email, role: roleSaisi },
  });

  const base = process.env["NEXT_PUBLIC_BASE_URL"] ?? "";
  revalidatePath("/app/equipe");
  // Le jeton en clair n'est montré QU'UNE FOIS : la base n'en garde que
  // l'empreinte, comme pour le portail (Phase 10).
  return { succes: "Invitation créée.", lien: `${base}/invitation/${jeton}` };
}

export async function revoquerInvitation(donnees: FormData): Promise<void> {
  const { organizationId, userId } = await exigerPermission("membre:inviter");
  const id = texte(donnees, "id");

  await prisma.invitation.updateMany({
    where: { id, organizationId, accepteeLe: null },
    data: { revokeeLe: new Date() },
  });
  await journaliser({
    action: "member.invitation_revoked",
    organizationId,
    actorUserId: userId,
    entityType: "Invitation",
    entityId: id,
  });
  revalidatePath("/app/equipe");
}

/**
 * Retire un membre.
 *
 * Le DERNIER propriétaire ne peut pas être retiré : une organisation sans
 * propriétaire est une organisation que plus personne ne peut administrer. Le
 * refus est explicite, jamais un échec silencieux.
 */
export async function retirerMembre(
  precedent: EtatEquipe,
  donnees: FormData,
): Promise<EtatEquipe> {
  const { organizationId, userId } = await exigerPermission("membre:retirer");
  const membershipId = texte(donnees, "id");

  const membre = await prisma.membership.findFirst({
    where: { id: membershipId, organizationId },
    select: { id: true, role: true, userId: true },
  });
  if (!membre) return { erreur: "Ce membre est introuvable." };

  if (membre.role === "PROPRIETAIRE") {
    const proprietaires = await prisma.membership.count({
      where: { organizationId, role: "PROPRIETAIRE" },
    });
    if (proprietaires <= 1) {
      return {
        erreur:
          "Impossible de retirer le dernier propriétaire : plus personne ne pourrait " +
          "administrer l'entreprise. Nommez d'abord un autre propriétaire.",
      };
    }
  }

  await prisma.membership.deleteMany({ where: { id: membershipId, organizationId } });
  // Les sessions du membre retiré tombent immédiatement : un retrait qui
  // laisserait une session ouverte ne serait pas un retrait.
  await prisma.session.deleteMany({ where: { userId: membre.userId, organizationId } });

  await journaliser({
    action: "member.removed",
    organizationId,
    actorUserId: userId,
    entityType: "Membership",
    entityId: membershipId,
  });

  revalidatePath("/app/equipe");
  return { succes: "Membre retiré." };
}

/* -------------------------------------------------------------------------- */
/* Second facteur                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Prépare un secret. Rien n'est activé tant qu'un code n'a pas été vérifié.
 *
 * Signature d'action de formulaire (`useActionState`) bien qu'elle n'ait aucun
 * champ à lire : c'est ce qui permet de la déclencher par un bouton et d'en
 * afficher le résultat sans état client supplémentaire.
 */
export async function preparerMfa(
  _precedent: EtatEquipe,
  _donnees: FormData,
): Promise<EtatEquipe> {
  const contexte = await sessionCourante();
  if (!contexte) return { erreur: "Session expirée." };

  const utilisateur = await prisma.user.findUnique({
    where: { id: contexte.userId },
    select: { email: true, totpActifLe: true },
  });
  if (!utilisateur) return { erreur: "Compte introuvable." };
  if (utilisateur.totpActifLe) return { erreur: "Le second facteur est déjà actif." };

  const secret = genererSecretTotp();
  await prisma.user.update({ where: { id: contexte.userId }, data: { totpSecret: secret } });

  const { uriTotp } = await import("@/lib/mfa");
  return { secret, uri: uriTotp(secret, utilisateur.email) };
}

/**
 * Active le second facteur après vérification d'un code.
 *
 * L'activation n'a lieu QUE si l'utilisateur a prouvé que son application
 * fonctionne : activer sur la seule foi d'un secret affiché fermerait le compte
 * de quelqu'un qui aurait mal scanné.
 */
export async function activerMfa(
  precedent: EtatEquipe,
  donnees: FormData,
): Promise<EtatEquipe> {
  const contexte = await sessionCourante();
  if (!contexte) return { erreur: "Session expirée." };
  const suite = (precedent.tentative ?? 0) + 1;

  const utilisateur = await prisma.user.findUnique({
    where: { id: contexte.userId },
    select: { totpSecret: true, totpActifLe: true },
  });
  if (!utilisateur?.totpSecret) {
    return { erreur: "Commencez par préparer le second facteur.", tentative: suite };
  }
  if (utilisateur.totpActifLe) return { erreur: "Déjà actif." };

  if (!verifierTotp(utilisateur.totpSecret, texte(donnees, "code"))) {
    return { erreur: "Ce code ne correspond pas. Vérifiez l'heure de votre téléphone.", tentative: suite };
  }

  const codes = genererCodesRecuperation();
  await prisma.user.update({
    where: { id: contexte.userId },
    data: {
      totpActifLe: new Date(),
      // Codes HACHÉS : la base ne doit pas contenir de quoi contourner le
      // second facteur qu'elle protège.
      codesRecuperation: codes.map(hacherJeton),
    },
  });

  await journaliser({
    action: "user.mfa_enabled",
    organizationId: contexte.organizationId,
    actorUserId: contexte.userId,
    entityType: "User",
    entityId: contexte.userId,
  });

  revalidatePath("/app/securite");
  return {
    succes: "Second facteur activé.",
    codes,
  };
}

export async function desactiverMfa(
  precedent: EtatEquipe,
  donnees: FormData,
): Promise<EtatEquipe> {
  const contexte = await sessionCourante();
  if (!contexte) return { erreur: "Session expirée." };

  const utilisateur = await prisma.user.findUnique({
    where: { id: contexte.userId },
    select: { totpSecret: true, totpActifLe: true },
  });
  if (!utilisateur?.totpActifLe || !utilisateur.totpSecret) {
    return { erreur: "Le second facteur n'est pas actif." };
  }

  // Désactiver exige un code valide : sans cela, quelqu'un qui aurait pris la
  // main sur une session ouverte pourrait retirer la protection.
  if (!verifierTotp(utilisateur.totpSecret, texte(donnees, "code"))) {
    return { erreur: "Code invalide.", tentative: (precedent.tentative ?? 0) + 1 };
  }

  await prisma.user.update({
    where: { id: contexte.userId },
    data: { totpActifLe: null, totpSecret: null, codesRecuperation: [] },
  });

  await journaliser({
    action: "user.mfa_disabled",
    organizationId: contexte.organizationId,
    actorUserId: contexte.userId,
    entityType: "User",
    entityId: contexte.userId,
  });

  revalidatePath("/app/securite");
  return { succes: "Second facteur désactivé." };
}
