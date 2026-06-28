import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { prisma } from "./prisma";

const COOKIE_NAME = "rph_session";
const SESSION_DAYS = 30;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "AUTH_SECRET manquant ou trop court. Définir une valeur aléatoire forte (cf. .env.example)."
    );
  }
  return new TextEncoder().encode(s);
}

export type SessionPayload = {
  userId: string;
  etablissementId: string;
  role: "GERANT" | "EMPLOYE";
  nom: string;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function destroySession(): void {
  cookies().set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Lit et vérifie le JWT du cookie (sans accès base). Renvoie null si invalide. */
export async function readSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      userId: payload.userId as string,
      etablissementId: payload.etablissementId as string,
      role: payload.role as "GERANT" | "EMPLOYE",
      nom: payload.nom as string,
    };
  } catch {
    return null;
  }
}

/**
 * Charge l'utilisateur courant (et vérifie qu'il est toujours actif).
 * Mémoïsé par requête via React cache().
 */
export const getCurrentUser = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  const user = await prisma.utilisateur.findUnique({
    where: { id: session.userId },
    include: { etablissement: true },
  });
  if (!user || !user.actif) return null;
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function requireGerant() {
  const user = await requireUser();
  if (user.role !== "GERANT") throw new Error("FORBIDDEN");
  return user;
}
