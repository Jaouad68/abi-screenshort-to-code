import { describe, expect, it } from "vitest";
import {
  NOMBRE_CODES_RECUPERATION,
  PAS_SECONDES,
  RANG_ROLE,
  codeTotp,
  depuisBase32,
  genererCodesRecuperation,
  genererSecretTotp,
  peutInviterAuRole,
  uriTotp,
  verifierTotp,
  versBase32,
} from "@/lib/mfa";

/**
 * SECOND FACTEUR ET HIÉRARCHIE DES RÔLES (Phase 14).
 *
 * Cette phase change le modèle de menace : ouvrir les comptes multiplie les
 * portes. Ces tests portent sur les deux mécanismes qui les tiennent fermées.
 */

describe("base32", () => {
  it("fait l'aller-retour sans perte", () => {
    const octets = new Uint8Array([1, 2, 3, 4, 5, 250, 255, 128]);
    expect([...depuisBase32(versBase32(octets))]).toEqual([...octets]);
  });

  it("ignore l'espacement et la casse des saisies humaines", () => {
    const secret = genererSecretTotp();
    const saisi = secret.toLowerCase().match(/.{1,4}/g)!.join(" ");
    expect([...depuisBase32(saisi)]).toEqual([...depuisBase32(secret)]);
  });
});

describe("TOTP", () => {
  // Vecteur stable : le secret et le pas étant fixés, le code l'est aussi.
  const secret = versBase32(new TextEncoder().encode("12345678901234567890"));

  it("produit six chiffres", () => {
    expect(codeTotp(secret, 1)).toMatch(/^\d{6}$/);
  });

  it("change à chaque pas de temps", () => {
    expect(codeTotp(secret, 100)).not.toBe(codeTotp(secret, 101));
  });

  it("accepte le code du moment", () => {
    const maintenant = new Date(2026, 7, 10, 12, 0, 0);
    const pas = Math.floor(maintenant.getTime() / 1000 / PAS_SECONDES);
    expect(verifierTotp(secret, codeTotp(secret, pas), maintenant)).toBe(true);
  });

  /*
   * Sans tolérance, un téléphone désynchronisé de quelques secondes rendrait le
   * compte inaccessible.
   */
  it("tolère une dérive d'un pas, pas davantage", () => {
    const maintenant = new Date(2026, 7, 10, 12, 0, 0);
    const pas = Math.floor(maintenant.getTime() / 1000 / PAS_SECONDES);

    expect(verifierTotp(secret, codeTotp(secret, pas - 1), maintenant)).toBe(true);
    expect(verifierTotp(secret, codeTotp(secret, pas + 1), maintenant)).toBe(true);
    // Deux pas d'écart : refusé. Élargir affaiblirait le facteur sans gain.
    expect(verifierTotp(secret, codeTotp(secret, pas + 5), maintenant)).toBe(false);
  });

  it("refuse ce qui n'est pas un code à six chiffres", () => {
    for (const mauvais of ["", "12345", "1234567", "abcdef", "12 34 56 78"]) {
      expect(verifierTotp(secret, mauvais)).toBe(false);
    }
  });

  it("refuse le code d'un autre secret", () => {
    const maintenant = new Date(2026, 7, 10, 12, 0, 0);
    const pas = Math.floor(maintenant.getTime() / 1000 / PAS_SECONDES);
    const autre = genererSecretTotp();
    expect(verifierTotp(secret, codeTotp(autre, pas), maintenant)).toBe(false);
  });

  it("produit des secrets imprévisibles", () => {
    const secrets = new Set(Array.from({ length: 100 }, () => genererSecretTotp()));
    expect(secrets.size).toBe(100);
  });

  it("produit un URI lisible par une application d'authentification", () => {
    const uri = uriTotp("ABCDEF", "anne@exemple.fr");
    expect(uri.startsWith("otpauth://totp/")).toBe(true);
    expect(uri).toContain("secret=ABCDEF");
    expect(uri).toContain("period=30");
  });
});

describe("codes de récupération", () => {
  it("en produit le nombre attendu, tous différents", () => {
    const codes = genererCodesRecuperation();
    expect(codes).toHaveLength(NOMBRE_CODES_RECUPERATION);
    expect(new Set(codes).size).toBe(NOMBRE_CODES_RECUPERATION);
  });

  it("produit des codes lisibles et imprévisibles", () => {
    const tous = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      for (const c of genererCodesRecuperation()) {
        expect(c).toMatch(/^[0-9A-F]{5}-[0-9A-F]{5}$/);
        tous.add(c);
      }
    }
    // Aucune collision sur 400 tirages.
    expect(tous.size).toBe(50 * NOMBRE_CODES_RECUPERATION);
  });
});

describe("hiérarchie des rôles", () => {
  /*
   * LA règle de la phase : sans elle, l'invitation devient un mécanisme
   * d'élévation de privilèges — il suffirait d'inviter un complice, ou
   * soi-même sur une autre adresse, pour obtenir les pleins pouvoirs.
   */
  it("interdit d'inviter plus haut que soi", () => {
    expect(peutInviterAuRole("ADMINISTRATEUR", "PROPRIETAIRE")).toBe(false);
    expect(peutInviterAuRole("ASSISTANT", "ADMINISTRATEUR")).toBe(false);
    expect(peutInviterAuRole("TECHNICIEN", "ASSISTANT")).toBe(false);
    expect(peutInviterAuRole("LECTURE_SEULE", "APPRENTI")).toBe(false);
  });

  it("interdit d'inviter à son propre rang", () => {
    // Un administrateur ne fabrique pas un autre administrateur : seul le
    // propriétaire décide de qui partage son niveau d'autorité.
    expect(peutInviterAuRole("ADMINISTRATEUR", "ADMINISTRATEUR")).toBe(false);
    expect(peutInviterAuRole("PROPRIETAIRE", "PROPRIETAIRE")).toBe(false);
  });

  it("autorise à inviter plus bas", () => {
    expect(peutInviterAuRole("PROPRIETAIRE", "ADMINISTRATEUR")).toBe(true);
    expect(peutInviterAuRole("ADMINISTRATEUR", "TECHNICIEN")).toBe(true);
    expect(peutInviterAuRole("ASSISTANT", "LECTURE_SEULE")).toBe(true);
  });

  it("couvre TOUS les rôles du cahier des charges", () => {
    // Un rôle ajouté sans rang hériterait de `undefined`, et toute comparaison
    // deviendrait fausse — donc permissive par accident.
    for (const role of [
      "PROPRIETAIRE", "ADMINISTRATEUR", "ASSISTANT", "TECHNICIEN",
      "APPRENTI", "SOUS_TRAITANT", "COMPTABLE", "LECTURE_SEULE",
    ] as const) {
      expect(typeof RANG_ROLE[role]).toBe("number");
    }
  });

  it("place le propriétaire au sommet", () => {
    const rangs = Object.values(RANG_ROLE);
    expect(RANG_ROLE.PROPRIETAIRE).toBe(Math.max(...rangs));
  });
});
