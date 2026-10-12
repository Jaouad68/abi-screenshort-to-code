import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hacherJeton, signerSession } from "@/lib/session";

/**
 * TEST D'ISOLATION CRM (Phase 2).
 *
 * Vérifie que l'artisan A ne peut atteindre ni les clients, ni les logements,
 * ni les équipements de l'artisan B — y compris en connaissant leurs
 * identifiants exacts, ce qui est le scénario réaliste : un identifiant fuite
 * bien plus facilement qu'un mot de passe (URL partagée, capture d'écran,
 * export).
 *
 * Comme en Phase 1, ces tests ont été validés par mutation : retirer le filtre
 * d'organisation dans src/lib/crm.ts doit les faire échouer.
 */

const baseDisponible = Boolean(process.env["DATABASE_URL"]);
const decrire = baseDisponible ? describe : describe.skip;

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

class RedirectionAppelee extends Error {}
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new RedirectionAppelee();
  },
}));

const { prisma } = await import("@/lib/prisma");
const { listerClients, lireClient, lireLogement, lireEquipement, verifierClientAccessible } =
  await import("@/lib/crm");

const suffixe = `crm-${Date.now()}`;

type Artisan = {
  organizationId: string;
  userId: string;
  jeton: string;
  clientId: string;
  propertyId: string;
  equipmentId: string;
};

/** Crée une organisation complète avec un client, un logement et un équipement. */
async function creerArtisanAvecDonnees(nom: string): Promise<Artisan> {
  const organisation = await prisma.organization.create({ data: { nom: `${nom} ${suffixe}` } });
  const user = await prisma.user.create({
    data: { email: `${nom.toLowerCase()}-${suffixe}@exemple.fr`, passwordHash: "x" },
  });
  await prisma.membership.create({
    data: { userId: user.id, organizationId: organisation.id, role: "PROPRIETAIRE" },
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
      expiresAt: new Date(Date.now() + 3600_000),
    },
  });

  const client = await prisma.client.create({
    data: {
      nomAffichage: `Client de ${nom}`,
      nom: `Client de ${nom}`,
      telephone: "0600000000",
      ville: "Lyon",
      organizationId: organisation.id,
    },
  });
  const logement = await prisma.property.create({
    data: {
      libelle: `Logement de ${nom}`,
      adresse: "12 rue des Lilas",
      ville: "Lyon",
      clientId: client.id,
      organizationId: organisation.id,
    },
  });
  const equipement = await prisma.equipment.create({
    data: {
      categorie: "CHAUDIERE",
      marque: nom,
      propertyId: logement.id,
      organizationId: organisation.id,
    },
  });

  return {
    organizationId: organisation.id,
    userId: user.id,
    jeton,
    clientId: client.id,
    propertyId: logement.id,
    equipmentId: equipement.id,
  };
}

decrire("isolation CRM entre organisations", () => {
  let a: Artisan;
  let b: Artisan;

  beforeAll(async () => {
    a = await creerArtisanAvecDonnees("Alpha");
    b = await creerArtisanAvecDonnees("Beta");
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { nom: { contains: suffixe } } });
    await prisma.user.deleteMany({ where: { email: { contains: suffixe } } });
    await prisma.$disconnect();
  });

  it("ne liste que ses propres clients", async () => {
    jetonCourant = a.jeton;
    const clients = await listerClients();
    expect(clients.map((c) => c.id)).toEqual([a.clientId]);
    expect(clients.map((c) => c.id)).not.toContain(b.clientId);
  });

  /*
   * Cœur du test : l'identifiant de B est parfaitement valide, mais consulté
   * depuis la session de A. Le résultat doit être indiscernable d'un
   * identifiant inexistant — sans quoi la réponse confirmerait l'existence
   * d'une fiche chez un autre artisan.
   */
  it("traite le client d'un autre artisan comme inexistant", async () => {
    jetonCourant = a.jeton;
    expect(await lireClient(b.clientId)).toBeNull();
    expect(await lireClient("identifiant-qui-n-existe-pas")).toBeNull();
  });

  it("traite le logement d'un autre artisan comme inexistant", async () => {
    jetonCourant = a.jeton;
    expect(await lireLogement(b.propertyId)).toBeNull();
    expect(await lireLogement(a.propertyId)).not.toBeNull();
  });

  it("traite l'équipement d'un autre artisan comme inexistant", async () => {
    jetonCourant = a.jeton;
    expect(await lireEquipement(b.equipmentId)).toBeNull();
    expect(await lireEquipement(a.equipmentId)).not.toBeNull();
  });

  // C'est ce contrôle qui empêche de rattacher un logement à la fiche d'un
  // autre artisan en devinant son identifiant.
  it("refuse de reconnaître le client d'un autre artisan comme parent valide", async () => {
    jetonCourant = a.jeton;
    expect(await verifierClientAccessible(b.clientId)).toBe(false);
    expect(await verifierClientAccessible(a.clientId)).toBe(true);
  });

  it("ne fait jamais remonter un autre artisan dans les résultats de recherche", async () => {
    jetonCourant = a.jeton;

    // Ces termes correspondent aux données des DEUX organisations : seule celle
    // de la session doit ressortir.
    for (const terme of ["Client", "Lyon", "0600000000", "Lilas", "Logement"]) {
      const resultats = await listerClients({ recherche: terme });
      expect(resultats.every((c) => c.id !== b.clientId)).toBe(true);
    }

    // Contrôle en miroir : depuis B, c'est l'inverse.
    jetonCourant = b.jeton;
    const cotéB = await listerClients({ recherche: "Lyon" });
    expect(cotéB.map((c) => c.id)).toEqual([b.clientId]);
  });

  it("masque les clients archivés par défaut et les restitue à la demande", async () => {
    jetonCourant = a.jeton;
    await prisma.client.update({
      where: { id: a.clientId },
      data: { archivedAt: new Date() },
    });

    expect(await listerClients()).toHaveLength(0);
    expect((await listerClients({ inclureArchives: true })).map((c) => c.id)).toEqual([a.clientId]);
    // Un client archivé reste consultable par son lien direct.
    expect(await lireClient(a.clientId)).not.toBeNull();

    await prisma.client.update({ where: { id: a.clientId }, data: { archivedAt: null } });
  });
});
