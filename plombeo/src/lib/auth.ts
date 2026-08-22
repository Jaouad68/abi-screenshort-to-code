import "server-only";
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  COOKIE_SESSION,
  DUREE_SESSION_JOURS,
  genererIdSession,
  hacherJeton,
  signerSession,
} from "@/lib/session";

const COUT_BCRYPT = 12;

export function hacherMotDePasse(motDePasse: string): Promise<string> {
  return bcrypt.hash(motDePasse, COUT_BCRYPT);
}

export function verifierMotDePasse(motDePasse: string, hash: string): Promise<boolean> {
  return bcrypt.compare(motDePasse, hash);
}

/**
 * Hash de référence utilisé quand l'e-mail est inconnu.
 *
 * On compare malgré tout le mot de passe à ce hash factice pour que le temps de
 * réponse soit comparable, qu'un compte existe ou non : sans cela, la différence
 * de durée révélerait quels e-mails sont enregistrés (énumération de comptes).
 */
const HASH_FACTICE = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.7QRZ3Bl/M8kIYtOHz.9pKzM/HeGYS9y";

export async function comparaisonFactice(motDePasse: string): Promise<void> {
  await bcrypt.compare(motDePasse, HASH_FACTICE);
}

/** Description courte de l'appareil, pour que l'artisan reconnaisse ses sessions.
 *  Minimisation RGPD : on tronque et on ne conserve aucune adresse IP. */
async function decrireAppareil(): Promise<string> {
  const userAgent = (await headers()).get("user-agent") ?? "";
  return userAgent.slice(0, 180);
}

/**
 * Crée une session : ligne en base + cookie signé.
 * Les deux sont nécessaires — voir src/lib/dal.ts pour la double vérification.
 */
export async function ouvrirSession(userId: string, organizationId: string): Promise<void> {
  const sid = genererIdSession();
  const expiresAt = new Date(Date.now() + DUREE_SESSION_JOURS * 24 * 60 * 60 * 1000);
  const jeton = await signerSession({ sid, userId, organizationId });

  await prisma.session.create({
    data: {
      id: sid,
      tokenHash: hacherJeton(jeton),
      userId,
      organizationId,
      expiresAt,
      appareil: await decrireAppareil(),
    },
  });

  const store = await cookies();
  store.set(COOKIE_SESSION, jeton, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Révoque la session courante et supprime le cookie. */
export async function fermerSession(sessionId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  (await cookies()).delete(COOKIE_SESSION);
}

/** Révoque toutes les sessions de l'utilisateur (« déconnecter tous mes appareils »). */
export async function revoquerToutesLesSessions(userId: string): Promise<number> {
  const resultat = await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  (await cookies()).delete(COOKIE_SESSION);
  return resultat.count;
}
