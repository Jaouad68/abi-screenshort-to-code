import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, signSession, verifySession } from "@/lib/session";
import type { Role } from "@/generated/prisma/client";

export async function createSessionCookie(userId: string) {
  const token = await signSession({ userId });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * Renvoie l'utilisateur connecté (actif) et son entreprise, sinon redirige
 * vers /connexion. C'est le seul point d'entrée des données côté serveur :
 * chaque page/action doit passer par ici puis filtrer explicitement par
 * `company.id` — c'est ce qui garantit l'étanchéité entre entreprises.
 */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/connexion");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { company: true },
  });
  if (!user || !user.company || !user.actif) {
    await destroySessionCookie();
    redirect("/connexion");
  }

  return { user, company: user.company };
}

/** Comme requireUser, mais redirige vers le tableau de bord si le rôle ne
 * fait pas partie de `roles` (ex. page réservée au dirigeant). */
export async function requireRole(roles: Role[]) {
  const ctx = await requireUser();
  if (!roles.includes(ctx.user.role)) {
    redirect("/tableau-de-bord?erreur=acces-refuse");
  }
  return ctx;
}
