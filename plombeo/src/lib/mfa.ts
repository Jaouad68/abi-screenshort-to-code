import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Role } from "@/generated/prisma/enums";

/**
 * SECOND FACTEUR ET INVITATIONS — logique pure (Phase 14).
 *
 * TOTP (RFC 6238) vérifié LOCALEMENT : aucun service tiers, aucun SMS. Un SMS
 * suppose un prestataire, un coût par message, et reste le second facteur le
 * plus faible.
 *
 * Cette phase change le modèle de menace : ouvrir les comptes multiplie les
 * portes et rend les rôles réellement opérants. C'est pourquoi le MFA, reporté
 * en Phase 15 faute d'objet, est livré ici.
 */

/* -------------------------------------------------------------------------- */
/* Base32 — l'alphabet des applications d'authentification                    */
/* -------------------------------------------------------------------------- */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function versBase32(octets: Uint8Array): string {
  let bits = 0;
  let valeur = 0;
  let sortie = "";
  for (const octet of octets) {
    valeur = (valeur << 8) | octet;
    bits += 8;
    while (bits >= 5) {
      sortie += ALPHABET[(valeur >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) sortie += ALPHABET[(valeur << (5 - bits)) & 31];
  return sortie;
}

export function depuisBase32(texte: string): Uint8Array {
  const propre = texte.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let valeur = 0;
  const octets: number[] = [];
  for (const caractere of propre) {
    valeur = (valeur << 5) | ALPHABET.indexOf(caractere);
    bits += 5;
    if (bits >= 8) {
      octets.push((valeur >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(octets);
}

/** Secret TOTP : 20 octets, la taille recommandée pour HMAC-SHA1. */
export function genererSecretTotp(): string {
  return versBase32(new Uint8Array(randomBytes(20)));
}

/* -------------------------------------------------------------------------- */
/* TOTP                                                                       */
/* -------------------------------------------------------------------------- */

export const PAS_SECONDES = 30;

/** Code à 6 chiffres pour un pas de temps donné. */
export function codeTotp(secretBase32: string, pas: number): string {
  const cle = Buffer.from(depuisBase32(secretBase32));
  const compteur = Buffer.alloc(8);
  compteur.writeBigUInt64BE(BigInt(pas));

  const empreinte = createHmac("sha1", cle).update(compteur).digest();
  const decalage = empreinte[empreinte.length - 1]! & 0x0f;
  const tronque =
    ((empreinte[decalage]! & 0x7f) << 24) |
    ((empreinte[decalage + 1]! & 0xff) << 16) |
    ((empreinte[decalage + 2]! & 0xff) << 8) |
    (empreinte[decalage + 3]! & 0xff);

  return String(tronque % 1_000_000).padStart(6, "0");
}

/**
 * Vérifie un code.
 *
 * Une **fenêtre d'un pas** de part et d'autre absorbe les dérives d'horloge :
 * sans elle, un téléphone désynchronisé de quelques secondes rendrait le compte
 * inaccessible. Élargir davantage affaiblirait le facteur sans gain d'usage.
 *
 * Comparaison à temps constant, comme pour le secret du cron (Phase 15).
 */
export function verifierTotp(
  secretBase32: string,
  code: string,
  maintenant: Date = new Date(),
  tolerance = 1,
): boolean {
  const propre = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(propre)) return false;

  const pas = Math.floor(maintenant.getTime() / 1000 / PAS_SECONDES);
  for (let ecart = -tolerance; ecart <= tolerance; ecart += 1) {
    const attendu = codeTotp(secretBase32, pas + ecart);
    const a = Buffer.from(attendu);
    const b = Buffer.from(propre);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

/** URI standard, lisible par toute application d'authentification. */
export function uriTotp(secretBase32: string, email: string, emetteur = "Plombéo"): string {
  const libelle = encodeURIComponent(`${emetteur}:${email}`);
  return (
    `otpauth://totp/${libelle}?secret=${secretBase32}` +
    `&issuer=${encodeURIComponent(emetteur)}&algorithm=SHA1&digits=6&period=${PAS_SECONDES}`
  );
}

/* -------------------------------------------------------------------------- */
/* Codes de récupération                                                      */
/* -------------------------------------------------------------------------- */

export const NOMBRE_CODES_RECUPERATION = 8;

/**
 * Codes de secours.
 *
 * Sans eux, un téléphone perdu ferme définitivement le compte — et le support
 * qui « débloque » un compte par téléphone est lui-même une faille.
 */
export function genererCodesRecuperation(): string[] {
  return Array.from({ length: NOMBRE_CODES_RECUPERATION }, () =>
    randomBytes(5).toString("hex").toUpperCase().match(/.{1,5}/g)!.join("-"),
  );
}

/* -------------------------------------------------------------------------- */
/* Hiérarchie des rôles                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Rang d'un rôle. Plus le nombre est élevé, plus le rôle est puissant.
 *
 * Sert à une seule règle, mais décisive : **on n'invite jamais plus haut que
 * soi**. Sans elle, l'invitation devient un mécanisme d'élévation de
 * privilèges — il suffirait d'inviter un complice, ou soi-même sur une autre
 * adresse, pour obtenir les pleins pouvoirs.
 */
export const RANG_ROLE: Record<Role, number> = {
  PROPRIETAIRE: 100,
  ADMINISTRATEUR: 80,
  ASSISTANT: 60,
  COMPTABLE: 50,
  TECHNICIEN: 40,
  APPRENTI: 20,
  SOUS_TRAITANT: 20,
  LECTURE_SEULE: 10,
};

export function peutInviterAuRole(roleInvitant: Role, roleCible: Role): boolean {
  return RANG_ROLE[roleInvitant] > RANG_ROLE[roleCible];
}
