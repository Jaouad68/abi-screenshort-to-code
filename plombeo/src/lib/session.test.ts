import { describe, expect, it } from "vitest";
import {
  genererIdSession,
  hacherJeton,
  signerSession,
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
