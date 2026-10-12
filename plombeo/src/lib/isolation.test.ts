import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hacherJeton, signerSession } from "@/lib/session";

/**
 * TEST D'ISOLATION MULTI-TENANT — obligatoire (décision d'architecture n°8).
 *
 * Vérifie qu'une session ouverte pour l'artisan A ne permet jamais d'atteindre
 * les données de l'artisan B, y compris lorsqu'un jeton est manipulé pour
 * revendiquer une autre organisation.
 *
 * Ce test s'exécute contre une vraie base de données. Sans `DATABASE_URL`, il
 * est explicitement ignoré plutôt que transformé en test vide qui passerait
 * sans rien vérifier.
 */

const baseDisponible = Boolean(process.env["DATABASE_URL"]);
const decrire = baseDisponible ? describe : describe.skip;

// Les cookies sont fournis par la requête en production. Sous test, on contrôle
// leur contenu pour simuler précisément la session de chaque artisan.
let jetonCourant: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nom: string) =>
      nom === "plombeo_session" && jetonCourant ? { name: nom, value: jetonCourant } : undefined,
    set: () => undefined,
    delete: () => undefined,
  }),
  headers: async () => new Map(),
}));

// `redirect()` interrompt normalement le rendu par une exception de contrôle de
// flux. On la rend identifiable pour pouvoir affirmer qu'un accès a bien été refusé.
class RedirectionAppelee extends Error {
  constructor(public readonly destination: string) {
    super(`redirect:${destination}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (destination: string) => {
    throw new RedirectionAppelee(destination);
  },
}));

const { prisma } = await import("@/lib/prisma");
const { sessionCourante, organisationCourante, exigerPermission } = await import("@/lib/dal");

type Artisan = {
  organizationId: string;
  userId: string;
  sessionId: string;
  jeton: string;
};

const suffixe = `test-${Date.now()}`;
const identifiants: string[] = [];

async function creerArtisan(nom: string, role: "PROPRIETAIRE" | "TECHNICIEN"): Promise<Artisan> {
  const organisation = await prisma.organization.create({ data: { nom: `${nom} ${suffixe}` } });
  const user = await prisma.user.create({
    data: { email: `${nom.toLowerCase()}-${suffixe}@exemple.fr`, passwordHash: "x" },
  });
  await prisma.membership.create({
    data: { userId: user.id, organizationId: organisation.id, role },
  });

  const sessionId = `sid-${nom}-${suffixe}`;
  const jeton = await signerSession({
    sid: sessionId,
    userId: user.id,
    organizationId: organisation.id,
  });
  await prisma.session.create({
    data: {
      id: sessionId,
      tokenHash: hacherJeton(jeton),
      userId: user.id,
      organizationId: organisation.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  identifiants.push(organisation.id, user.id);
  return { organizationId: organisation.id, userId: user.id, sessionId, jeton };
}

decrire("isolation entre organisations", () => {
  let artisanA: Artisan;
  let artisanB: Artisan;

  beforeAll(async () => {
    artisanA = await creerArtisan("ArtisanA", "PROPRIETAIRE");
    artisanB = await creerArtisan("ArtisanB", "PROPRIETAIRE");
  });

  afterAll(async () => {
    // Les suppressions en cascade emportent memberships et sessions.
    await prisma.organization.deleteMany({ where: { nom: { contains: suffixe } } });
    await prisma.user.deleteMany({ where: { email: { contains: suffixe } } });
    await prisma.$disconnect();
  });

  it("résout la session sur la bonne organisation", async () => {
    jetonCourant = artisanA.jeton;
    const contexte = await sessionCourante();
    expect(contexte?.organizationId).toBe(artisanA.organizationId);
    expect(contexte?.organizationId).not.toBe(artisanB.organizationId);
  });

  it("ne retourne jamais l'organisation d'un autre artisan", async () => {
    jetonCourant = artisanA.jeton;
    const organisation = await organisationCourante();
    expect(organisation.id).toBe(artisanA.organizationId);

    jetonCourant = artisanB.jeton;
    const autre = await organisationCourante();
    expect(autre.id).toBe(artisanB.organizationId);
    expect(autre.id).not.toBe(artisanA.organizationId);
  });

  // Un jeton dont on modifie la charge utile produit une empreinte différente :
  // la session est alors introuvable. Ce test vérifie cette première barrière.
  it("refuse un jeton reforgé, dont l'empreinte ne correspond à aucune session", async () => {
    jetonCourant = await signerSession({
      sid: artisanA.sessionId,
      userId: artisanA.userId,
      organizationId: artisanB.organizationId,
    });

    expect(await sessionCourante()).toBeNull();
  });

  /*
   * Les deux tests suivants exercent la SECONDE barrière : la comparaison entre
   * la charge utile du jeton et la ligne en base.
   *
   * Il faut les construire avec soin. Une divergence ordinaire est déjà arrêtée
   * en amont — soit par la recherche sur l'empreinte du jeton, soit par le
   * contrôle d'appartenance. Écrits naïvement, ces tests passent même sans le
   * contrôle et ne prouvent rien : c'est ce qu'a montré une vérification par
   * mutation (retrait du contrôle, la suite restait verte).
   *
   * Le seul cas où le contrôle est réellement la barrière utile est celui d'un
   * utilisateur membre de PLUSIEURS organisations — situation que le modèle de
   * données autorise dès maintenant. La divergence passe alors le contrôle
   * d'appartenance, et seule la comparaison avec le jeton l'arrête.
   *
   * Ce scénario n'est pas théorique : c'est exactement ce que produirait une
   * bascule d'organisation (Phase 14) qui modifierait `Session` sans réémettre
   * le cookie.
   */
  it("refuse une session dont l'organisation diverge du jeton, même si l'utilisateur y a accès", async () => {
    const multi = await creerArtisan("Multi", "PROPRIETAIRE");
    // Le même utilisateur est également membre de l'organisation de l'artisan B.
    await prisma.membership.create({
      data: { userId: multi.userId, organizationId: artisanB.organizationId, role: "PROPRIETAIRE" },
    });

    jetonCourant = multi.jeton;
    expect((await sessionCourante())?.organizationId).toBe(multi.organizationId);

    // La session bascule sur l'autre organisation, le cookie revendique toujours
    // la première. L'appartenance est valide des deux côtés : sans la comparaison
    // avec le jeton, la session serait acceptée sur la mauvaise organisation.
    await prisma.session.update({
      where: { id: multi.sessionId },
      data: { organizationId: artisanB.organizationId },
    });

    expect(await sessionCourante()).toBeNull();
  });

  it("refuse une session dont l'utilisateur diverge du jeton, même s'il est membre de l'organisation", async () => {
    const titulaire = await creerArtisan("Titulaire", "PROPRIETAIRE");
    // Un second utilisateur, membre de la même organisation.
    const collegue = await prisma.user.create({
      data: { email: `collegue-${suffixe}@exemple.fr`, passwordHash: "x" },
    });
    identifiants.push(collegue.id);
    await prisma.membership.create({
      data: {
        userId: collegue.id,
        organizationId: titulaire.organizationId,
        role: "ADMINISTRATEUR",
      },
    });

    jetonCourant = titulaire.jeton;
    expect((await sessionCourante())?.userId).toBe(titulaire.userId);

    // La session est réattribuée au collègue sans que le cookie change : sans la
    // comparaison, le porteur du cookie hériterait de l'identité et du rôle du
    // collègue.
    await prisma.session.update({
      where: { id: titulaire.sessionId },
      data: { userId: collegue.id },
    });

    expect(await sessionCourante()).toBeNull();
  });

  it("cesse d'authentifier dès que la session est révoquée en base", async () => {
    const artisanC = await creerArtisan("ArtisanC", "PROPRIETAIRE");
    jetonCourant = artisanC.jeton;
    expect(await sessionCourante()).not.toBeNull();

    // Le cookie reste cryptographiquement valide : seule la base fait autorité.
    await prisma.session.update({
      where: { id: artisanC.sessionId },
      data: { revokedAt: new Date() },
    });

    expect(await sessionCourante()).toBeNull();
  });

  it("cesse d'authentifier dès que l'accès à l'organisation est retiré", async () => {
    const artisanD = await creerArtisan("ArtisanD", "PROPRIETAIRE");
    jetonCourant = artisanD.jeton;
    expect(await sessionCourante()).not.toBeNull();

    await prisma.membership.deleteMany({ where: { userId: artisanD.userId } });

    expect(await sessionCourante()).toBeNull();
  });

  it("refuse une action dont le rôle n'a pas la permission", async () => {
    const technicien = await creerArtisan("Technicien", "TECHNICIEN");
    jetonCourant = technicien.jeton;

    await expect(exigerPermission("organisation:modifier")).rejects.toThrow(/Permission requise/);
    // La lecture, elle, reste autorisée pour ce rôle.
    await expect(exigerPermission("organisation:lire")).resolves.toMatchObject({
      organizationId: technicien.organizationId,
    });
  });

  it("redirige vers la connexion en l'absence de cookie", async () => {
    jetonCourant = undefined;
    await expect(organisationCourante()).rejects.toBeInstanceOf(RedirectionAppelee);
  });
});
