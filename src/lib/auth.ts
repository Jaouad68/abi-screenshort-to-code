import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, signSession, verifySession } from "@/lib/session";

export async function createSessionCookie(userId: string, salonId: string) {
  const token = await signSession({ userId, salonId });
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

/** Returns the logged-in gérant's salon, or redirects to /connexion. */
export async function requireSalon() {
  const session = await getSession();
  if (!session) redirect("/connexion");

  const salon = await prisma.salon.findUnique({ where: { id: session.salonId } });
  if (!salon) redirect("/connexion");

  return salon;
}

/** All salons a gérant belongs to, oldest membership first. */
export async function mesSalons(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { salon: { select: { id: true, nom: true } } },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => m.salon);
}
