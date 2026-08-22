import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import {
  genererIdSession,
  hacherJeton,
  signerDefi,
  signerSession,
  verifierDefi,
  verifierSession,
  type ContenuSession,
} from "@/lib/session";

const contenu: ContenuSession = {
  sid: "session-123",
  userId: "user-123",
  organizationId: "org-123",
};

describe("jetons de session", () => {
  it("signe puis relit le contenu", async () => {
    const jeton = await signerSession(contenu);
    expect(await verifierSession(jeton)).toEqual(contenu);
  });

  it("rejette un jeton altéré", async () => {
    const jeton = await signerSession(contenu);
    // Modifier un caractère de la signature invalide le jeton.
    const altere = `${jeton.slice(0, -2)}${jeton.endsWith("a") ? "b" : "a"}`;
    expect(await verifierSession(altere)).toBeNull();
  });

  it("rejette une valeur qui n'est pas un jeton", async () => {
    expect(await verifierSession("pas-un-jeton")).toBeNull();
    expect(await verifierSession("")).toBeNull();
  });

  it("rejette un jeton signé avec un autre secret", async () => {
    const secretOrigine = process.env["SESSION_SECRET"];
    process.env["SESSION_SECRET"] = "un-tout-autre-secret-utilise-par-un-attaquant";
    const jetonEtranger = await signerSession(contenu);
    process.env["SESSION_SECRET"] = secretOrigine;

    expect(await verifierSession(jetonEtranger)).toBeNull();
  });
});

/*
 * Le défi de second facteur (Phase 14) est signé avec la MÊME clé que la
 * session. Sans séparation stricte, un jeton obtenu en ne connaissant que le
 * mot de passe serait présentable comme cookie de session : le second facteur
 * ne protégerait plus rien.
 */
describe("défi de second facteur", () => {
  const defi = { userId: "user-123", organizationId: "org-123", email: "a@b.fr" };

  it("signe puis relit le contenu", async () => {
    expect(await verifierDefi(await signerDefi(defi))).toEqual(defi);
  });

  it("n'est PAS accepté comme jeton de session", async () => {
    expect(await verifierSession(await signerDefi(defi))).toBeNull();
  });

  it("n'accepte PAS un jeton de session comme défi", async () => {
    expect(await verifierDefi(await signerSession(contenu))).toBeNull();
  });

  /*
   * Les deux tests ci-dessus passeraient encore si le marqueur `typ`
   * disparaissait : un défi n'a pas de `sid`, une session n'a pas d'`email`, et
   * chaque vérificateur échouerait sur le champ manquant. Ils ne prouvent donc
   * rien du marqueur lui-même.
   *
   * Ceux qui suivent signent un jeton portant TOUS les champs des deux formes,
   * et ne laissent plus que le type pour trancher. C'est le seul cas où
   * supprimer la garde se voit.
   */
  it("refuse un jeton complet dont seul le type diffère", async () => {
    const secret = new TextEncoder().encode(process.env["SESSION_SECRET"]!);
    const complet = {
      sid: "session-123",
      userId: "user-123",
      organizationId: "org-123",
      email: "a@b.fr",
    };

    const marqueDefi = await new SignJWT({ ...complet, typ: "defi" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("5m")
      .sign(secret);
    expect(await verifierSession(marqueDefi)).toBeNull();

    const marqueSession = await new SignJWT({ ...complet, typ: "session" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("5m")
      .sign(secret);
    expect(await verifierDefi(marqueSession)).toBeNull();

    // Contrôle : sans marqueur, le même jeton reste lisible comme session — ce
    // qui garde valides les sessions émises avant la Phase 14.
    const sansMarqueur = await new SignJWT(complet)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("5m")
      .sign(secret);
    expect(await verifierSession(sansMarqueur)).not.toBeNull();
  });
});

describe("hacherJeton", () => {
  it("est déterministe", () => {
    expect(hacherJeton("abc")).toBe(hacherJeton("abc"));
  });

  it("produit des empreintes différentes pour des jetons différents", () => {
    expect(hacherJeton("abc")).not.toBe(hacherJeton("abd"));
  });

  // C'est cette propriété qui fait qu'une fuite de la table Session ne permet
  // pas de rejouer une session : le jeton n'y figure jamais en clair.
  it("ne laisse pas transparaître le jeton", () => {
    const jeton = "jeton-secret-en-clair";
    expect(hacherJeton(jeton)).not.toContain(jeton);
    expect(hacherJeton(jeton)).toHaveLength(64);
  });
});

describe("genererIdSession", () => {
  it("produit des identifiants uniques et suffisamment longs", () => {
    const identifiants = new Set(Array.from({ length: 200 }, genererIdSession));
    expect(identifiants.size).toBe(200);
    for (const id of identifiants) expect(id.length).toBeGreaterThanOrEqual(40);
  });
});
