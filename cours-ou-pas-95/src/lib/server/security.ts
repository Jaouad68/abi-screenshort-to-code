import "server-only";
import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const DEVICE_COOKIE = "cop_device";
export const ADMIN_COOKIE = "cop_admin";
const ADMIN_SESSION_HOURS = 12;

/** Au-delà, l'adresse IP est temporairement bloquée (anti-spam). */
export const RATE_LIMIT_MAX = 15;
export const RATE_LIMIT_WINDOW_MIN = 10;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET doit être définie (32 caractères minimum).");
  }
  return "dev-only-secret-ne-pas-utiliser-en-production";
}

/**
 * On ne stocke jamais l'adresse IP : seulement une empreinte salée, qui sert
 * uniquement à limiter le nombre de signalements.
 */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${secret()}:${ip}`).digest("hex").slice(0, 32);
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/* ------------------------------------------------------------------------ */
/* Admin                                                                     */
/* ------------------------------------------------------------------------ */

function adminPassword(): string | null {
  const p = process.env.ADMIN_PASSWORD;
  if (p) return p;
  return process.env.NODE_ENV === "production" ? null : "admin";
}

export function isAdminEnabled(): boolean {
  return adminPassword() !== null;
}

export function checkAdminPassword(input: string): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return a.equals(b);
}

const key = () => new TextEncoder().encode(secret());

export async function createAdminSession(): Promise<void> {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_HOURS}h`)
    .sign(key());
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_HOURS * 3600,
  });
}

export async function clearAdminSession(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export function unauthorized(): Response {
  return Response.json({ error: "Non autorisé" }, { status: 401 });
}

/* ------------------------------------------------------------------------ */
/* Référents vérifiés                                                        */
/* ------------------------------------------------------------------------ */

export const REFERENT_COOKIE = "cop_referent";
const REFERENT_SESSION_DAYS = 180;
/** Sans caractères ambigus (0/O, 1/I/L). */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Code d'accès à 8 caractères, affiché sous la forme ABCD-EFGH. */
export function generateReferentCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

export function normalizeReferentCode(input: string): string {
  const c = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

/** Seule l'empreinte du code est stockée en base. */
export function hashReferentCode(code: string): string {
  return createHash("sha256").update(`${secret()}:referent:${normalizeReferentCode(code)}`).digest("hex");
}

export interface ReferentSession {
  rid: string;
  uai: string;
  label: string;
}

export async function createReferentSession(s: ReferentSession): Promise<void> {
  const token = await new SignJWT({ role: "referent", ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${REFERENT_SESSION_DAYS}d`)
    .sign(key());
  (await cookies()).set(REFERENT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REFERENT_SESSION_DAYS * 86400,
  });
}

export async function clearReferentSession(): Promise<void> {
  (await cookies()).delete(REFERENT_COOKIE);
}

/** Session référent signée. La révocation est vérifiée en base au moment du signalement. */
export async function getReferentSession(): Promise<ReferentSession | null> {
  const token = (await cookies()).get(REFERENT_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    if (payload.role !== "referent" || typeof payload.rid !== "string" || typeof payload.uai !== "string") return null;
    return { rid: payload.rid, uai: payload.uai, label: typeof payload.label === "string" ? payload.label : "" };
  } catch {
    return null;
  }
}
