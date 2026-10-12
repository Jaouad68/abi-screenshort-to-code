import { afterAll, describe, expect, it, vi } from "vitest";
import { CSP, ENTETES_SECURITE } from "@/lib/entetes";

/**
 * DURCISSEMENT (Phase 15).
 *
 * Ces tests portent sur des garanties qu'on ne peut vérifier qu'en les
 * exerçant : une CSP se relâche silencieusement, un secret de rotation
 * s'oublie, une purge peut emporter ce qu'elle devait garder.
 */

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({ redirect: () => undefined }));

const { signerSession, verifierSession } = await import("@/lib/session");

describe("politique de sécurité du contenu", () => {
  // La VALEUR est testée, pas le texte du fichier : un test qui lit le source
  // confond la politique et les commentaires qui la décrivent.
  const directives = new Map(
    CSP.split(";").map((d) => {
      const [nom, ...valeurs] = d.trim().split(/\s+/);
      return [nom ?? "", valeurs.join(" ")];
    }),
  );

  it("n'autorise jamais unsafe-eval", () => {
    expect(CSP).not.toContain("unsafe-eval");
  });

  it("verrouille les vecteurs d'injection classiques", () => {
    expect(directives.get("object-src")).toBe("'none'");
    expect(directives.get("base-uri")).toBe("'self'");
    expect(directives.get("form-action")).toBe("'self'");
    expect(directives.get("frame-ancestors")).toBe("'none'");
    expect(directives.get("frame-src")).toBe("'none'");
  });

  it("n'autorise aucune source distante, pour aucune directive", () => {
    // Plombéo ne charge aucun script, aucune police et aucune image tiers.
    expect(CSP).not.toMatch(/https?:\/\//);
    expect(CSP).not.toContain("*");
  });

  it("part d'un default-src fermé", () => {
    expect(directives.get("default-src")).toBe("'self'");
  });

  it("porte les en-têtes attendus", () => {
    for (const entete of [
      "Content-Security-Policy",
      "Strict-Transport-Security",
      "Cross-Origin-Opener-Policy",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "X-Frame-Options",
    ]) {
      expect(ENTETES_SECURITE[entete], entete).toBeTruthy();
    }
  });

  /*
   * `preload` engage le domaine entier et se retire très difficilement : son
   * absence est un choix, que ce test protège d'un ajout distrait.
   */
  it("n'inscrit pas le domaine sur la liste HSTS preload", () => {
    expect(ENTETES_SECURITE["Strict-Transport-Security"]).not.toContain("preload");
    expect(ENTETES_SECURITE["Strict-Transport-Security"]).toContain("max-age=31536000");
  });

  it("n'ouvre le micro à personne", () => {
    // La caméra sert aux photos de chantier, la géolocalisation au GPS ; le
    // micro n'a aucun usage, la dictée vocale ayant été écartée en Phase 11.
    expect(ENTETES_SECURITE["Permissions-Policy"]).toContain("microphone=()");
  });
});

describe("rotation du secret de session", () => {
  const secretOrigine = process.env["SESSION_SECRET"];

  afterAll(() => {
    process.env["SESSION_SECRET"] = secretOrigine;
    delete process.env["SESSION_SECRET_PRECEDENT"];
  });

  const contenu = { sid: "s1", userId: "u1", organizationId: "o1" };

  it("accepte un jeton signé par le secret précédent", async () => {
    process.env["SESSION_SECRET"] = "ancien-secret-de-test-0123456789abcdef";
    const jeton = await signerSession(contenu);

    // Rotation : le nouveau signe, l'ancien reste accepté.
    process.env["SESSION_SECRET"] = "nouveau-secret-de-test-0123456789abcdef";
    process.env["SESSION_SECRET_PRECEDENT"] = "ancien-secret-de-test-0123456789abcdef";

    const verifie = await verifierSession(jeton);
    expect(verifie).toEqual(contenu);
  });

  it("refuse un jeton signé par un secret inconnu", async () => {
    process.env["SESSION_SECRET"] = "un-secret-tiers-0123456789abcdefghij";
    delete process.env["SESSION_SECRET_PRECEDENT"];
    const jetonEtranger = await signerSession(contenu);

    process.env["SESSION_SECRET"] = "nouveau-secret-de-test-0123456789abcdef";
    process.env["SESSION_SECRET_PRECEDENT"] = "ancien-secret-de-test-0123456789abcdef";

    expect(await verifierSession(jetonEtranger)).toBeNull();
  });

  it("accepte toujours le secret courant après retrait du précédent", async () => {
    process.env["SESSION_SECRET"] = "nouveau-secret-de-test-0123456789abcdef";
    const jeton = await signerSession(contenu);
    delete process.env["SESSION_SECRET_PRECEDENT"];
    expect(await verifierSession(jeton)).toEqual(contenu);
  });
});

const baseDisponible = Boolean(process.env["DATABASE_URL"]);
const decrire = baseDisponible ? describe : describe.skip;

const { prisma } = await import("@/lib/prisma");
const { ecritureAutorisee, MAX_ECRITURES, purgerDonneesExpirees } = await import(
  "@/lib/securite"
);

decrire("purge et limitation de débit", () => {
  const suffixe = `durc-${Date.now()}`;

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { nom: { contains: suffixe } } });
    await prisma.user.deleteMany({ where: { email: { contains: suffixe } } });
    await prisma.loginAttempt.deleteMany({ where: { identifiant: { contains: suffixe } } });
    await prisma.$disconnect();
  });

  /*
   * Une purge qui emporte une session valide déconnecterait l'artisan en plein
   * chantier : c'est le risque à écarter, pas l'inverse.
   */
  it("supprime les sessions expirées et JAMAIS les sessions valides", async () => {
    const organisation = await prisma.organization.create({ data: { nom: `Purge ${suffixe}` } });
    const user = await prisma.user.create({
      data: { email: `purge-${suffixe}@exemple.fr`, passwordHash: "x" },
    });

    const expiree = await prisma.session.create({
      data: {
        id: `sid-expiree-${suffixe}`,
        tokenHash: `h-expiree-${suffixe}`,
        userId: user.id,
        organizationId: organisation.id,
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    const valide = await prisma.session.create({
      data: {
        id: `sid-valide-${suffixe}`,
        tokenHash: `h-valide-${suffixe}`,
        userId: user.id,
        organizationId: organisation.id,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });

    await purgerDonneesExpirees();

    expect(await prisma.session.findUnique({ where: { id: expiree.id } })).toBeNull();
    expect(await prisma.session.findUnique({ where: { id: valide.id } })).not.toBeNull();
  });

  it("laisse passer l'usage normal, puis refuse au-delà du plafond", async () => {
    const acteur = `acteur-${suffixe}`;

    // Un artisan pressé reste sous le plafond : la limite vise l'automate.
    for (let i = 0; i < 5; i += 1) {
      expect(await ecritureAutorisee(acteur)).toBe(true);
    }

    await prisma.loginAttempt.createMany({
      data: Array.from({ length: MAX_ECRITURES }, () => ({
        identifiant: `w:${acteur}`,
        reussie: true,
      })),
    });

    expect(await ecritureAutorisee(acteur)).toBe(false);
    // Un autre acteur n'est pas affecté : le compteur est bien par acteur.
    expect(await ecritureAutorisee(`autre-${suffixe}`)).toBe(true);
  });
});
