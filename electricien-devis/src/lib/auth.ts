import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, signSession, verifySession } from "@/lib/session";

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

/** Nombre de comptes existants (l'inscription est fermée après le 1er compte). */
export async function compteExiste() {
  return (await prisma.user.count()) > 0;
}

/**
 * Renvoie l'utilisateur connecté et son entreprise, sinon redirige vers /connexion.
 * L'entreprise est créée à l'inscription : elle existe donc toujours pour un compte valide.
 */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/connexion");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { company: true },
  });
  if (!user || !user.company) redirect("/connexion");

  return { user, company: user.company };
}
