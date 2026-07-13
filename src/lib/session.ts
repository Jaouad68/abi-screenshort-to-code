import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "resazen_session";
const ALG = "HS256";

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  salonId: string;
};

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.userId !== "string" || typeof payload.salonId !== "string") {
      return null;
    }
    return { userId: payload.userId, salonId: payload.salonId };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
