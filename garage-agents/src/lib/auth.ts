import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, signSession, verifySession } from "@/lib/session";

export async function createSessionCookie(userId: string, garageId: string) {
  const token = await signSession({ userId, garageId });
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
 * Renvoie le garage du gérant connecté, sinon redirige vers /connexion.
 * Le garage est créé à l'inscription : il existe donc toujours pour une
 * session valide.
 */
export async function requireGarage() {
  const session = await getSession();
  if (!session) redirect("/connexion");

  const garage = await prisma.garage.findUnique({ where: { id: session.garageId } });
  if (!garage) redirect("/connexion");

  return garage;
}

/** Identifiant du garage connecté, pour les actions serveur (sans requête DB). */
export async function requireGarageId(): Promise<string> {
  const session = await getSession();
  if (!session) redirect("/connexion");
  return session.garageId;
}

/** Comme `requireGarage`, avec l'e-mail du gérant (affichage de la sidebar). */
export async function requireGarageEtEmail() {
  const session = await getSession();
  if (!session) redirect("/connexion");

  const garage = await prisma.garage.findUnique({
    where: { id: session.garageId },
    include: { user: { select: { email: true } } },
  });
  if (!garage) redirect("/connexion");

  return garage;
}
