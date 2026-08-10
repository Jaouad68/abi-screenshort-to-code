import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "node:crypto";

export const COOKIE_SESSION = "plombeo_session";
const ALG = "HS256";

/** Durée de vie d'une session. L'artisan est sur chantier : le reconnecter
 * chaque jour serait une friction inutile ; 30 jours avec révocation
 * possible à tout moment est le bon compromis. */
export const DUREE_SESSION_JOURS = 30;

function cleSecrete() {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET n'est pas défini");
  return new TextEncoder().encode(secret);
}

/**
 * Clés acceptées EN VÉRIFICATION (Phase 15).
 *
 * `SESSION_SECRET` signe ; `SESSION_SECRET_PRECEDENT`, s'il existe, reste
 * accepté. Cela rend une rotation possible sans déconnecter tout le monde :
 * on publie le nouveau secret, on garde l'ancien le temps que les sessions
 * expirent, puis on le retire.
 *
 * Sans ce mécanisme, une rotation est si coûteuse qu'elle n'a jamais lieu — et
 * un secret qu'on ne peut pas changer est un secret qu'on ne changera pas après
 * une fuite.
 */
function clesAcceptees(): Uint8Array[] {
  const cles = [cleSecrete()];
  const precedent = process.env["SESSION_SECRET_PRECEDENT"];
  if (precedent) cles.push(new TextEncoder().encode(precedent));
  return cles;
}

export type ContenuSession = {
  /** Identifiant unique de session, corrélé à la table Session. */
  sid: string;
  userId: string;
  organizationId: string;
};

/** Identifiant de session opaque, imprévisible. */
export function genererIdSession(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Seul le hachage du jeton est stocké en base : une lecture de la table Session
 * ne permet donc pas de fabriquer un cookie valide. SHA-256 sans sel suffit ici,
 * l'entrée étant déjà un secret aléatoire de 256 bits (contrairement à un mot de
 * passe, qui exige bcrypt).
 */
export function hacherJeton(jeton: string): string {
  return createHash("sha256").update(jeton).digest("hex");
}

export async function signerSession(contenu: ContenuSession): Promise<string> {
  return new SignJWT({ ...contenu })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${DUREE_SESSION_JOURS}d`)
    .sign(cleSecrete());
}

/**
 * Vérifie la signature et l'expiration du jeton.
 *
 * Attention : un jeton valide ici n'authentifie PAS à lui seul. La session doit
 * également être active en base (voir src/lib/dal.ts) — c'est ce qui rend la
 * révocation réellement effective.
 */
export async function verifierSession(jeton: string): Promise<ContenuSession | null> {
  // La signature EST toujours vérifiée : accepter le secret précédent élargit
  // les clés valides, jamais le contrôle lui-même.
  for (const cle of clesAcceptees()) {
    try {
      const { payload } = await jwtVerify(jeton, cle, { algorithms: [ALG] });
      const { sid, userId, organizationId } = payload;
      if (
        typeof sid !== "string" ||
        typeof userId !== "string" ||
        typeof organizationId !== "string"
      ) {
        return null;
      }
      return { sid, userId, organizationId };
    } catch {
      // Clé suivante. Une signature invalide pour toutes les clés finit en null.
    }
  }
  return null;
}
