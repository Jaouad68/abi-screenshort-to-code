import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hacherJeton, signerSession } from "@/lib/session";

/**
 * IDEMPOTENCE DE LA SYNCHRONISATION + ISOLATION TERRAIN (Phase 3).
 *
 * Le risque identifié en Phase 0 pour cette phase est la perte de confiance née
 * d'une synchronisation ratée : doublons ou saisie perdue. Ces tests exercent
 * l'endpoint réel `/api/sync`, pas une simulation.
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
const { POST } = await import("@/app/api/sync/route");

const suffixe = `sync-${Date.now()}`;

type Artisan = { organizationId: string; jeton: string; interventionId: string; clientId: string };

async function creerArtisan(nom: string): Promise<Artisan> {
  const organisation = await prisma.organization.create({ data: { nom: `${nom} ${suffixe}` } });
  const user = await prisma.user.create({
    data: { email: `${nom.toLowerCase()}-${suffixe}@exemple.fr`, passwordHash: "x" },
  });
  await prisma.membership.create({
    data: { userId: user.id, organizationId: organisation.id, role: "PROPRIETAIRE" },
  });

  const sid = `sid-${nom}-${suffixe}`;
  const jeton = await signerSession({ sid, userId: user.id, organizationId: organisation.id });
  await prisma.session.create({
    data: {
      id: sid,
      tokenHash: hacherJeton(jeton),
      userId: user.id,
      organizationId: organisation.id,
      expiresAt: new Date(Date.now() + 3600_000),
    },
  });

  const client = await prisma.client.create({
    data: { nomAffichage: `Client ${nom}`, organizationId: organisation.id },
  });
  const intervention = await prisma.intervention.create({
    data: { statut: "EN_COURS", clientId: client.id, organizationId: organisation.id },
  });

  return {
    organizationId: organisation.id,
    jeton,
    interventionId: intervention.id,
    clientId: client.id,
  };
}

function requete(mutations: unknown[]): Request {
  return new Request("http://localhost/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mutations }),
  });
}

const uuid = (n: number) => `${String(n).padStart(8, "0")}-1111-4111-8111-111111111111`;

decrire("synchronisation hors-ligne", () => {
  let a: Artisan;
  let b: Artisan;

  beforeAll(async () => {
    a = await creerArtisan("SyncA");
    b = await creerArtisan("SyncB");
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { nom: { contains: suffixe } } });
    await prisma.user.deleteMany({ where: { email: { contains: suffixe } } });
    await prisma.$disconnect();
  });

  it("applique une mutation de temps", async () => {
    jetonCourant = a.jeton;
    const reponse = await POST(
      requete([
        {
          type: "temps",
          clientMutationId: uuid(1),
          interventionId: a.interventionId,
          minutes: 75,
          libelle: "Dépose siphon",
        },
      ]),
    );
    const corps = await reponse.json();
    expect(corps.resultats[0].etat).toBe("applique");

    const temps = await prisma.timeEntry.findMany({
      where: { interventionId: a.interventionId },
    });
    expect(temps).toHaveLength(1);
    expect(temps[0]?.minutes).toBe(75);
  });

  /*
   * LE test de la phase. Rejouer exactement la même mutation — réponse perdue,
   * réseau coupé au mauvais moment, application rouverte — ne doit produire
   * aucun doublon (§5).
   */
  it("est idempotente : rejouer la même mutation ne crée pas de doublon", async () => {
    jetonCourant = a.jeton;
    const charge = [
      {
        type: "temps",
        clientMutationId: uuid(2),
        interventionId: a.interventionId,
        minutes: 30,
        libelle: "Pose flexible",
      },
    ];

    await POST(requete(charge));
    const rejeu = await POST(requete(charge));
    await POST(requete(charge));

    const temps = await prisma.timeEntry.findMany({
      where: { interventionId: a.interventionId, clientMutationId: uuid(2) },
    });
    expect(temps).toHaveLength(1);

    /*
     * L'absence de doublon ne suffit pas : la contrainte d'unicité en base y
     * pourvoit déjà. Ce qui compte pour le client, c'est que le rejeu soit
     * ACCEPTÉ. Un refus ferait réessayer la file jusqu'au seuil, puis
     * afficherait à l'artisan une erreur sur une saisie pourtant bien
     * enregistrée. (Vérifié par mutation : remplacer l'upsert par un create
     * fait échouer cette assertion.)
     */
    const corps = await rejeu.json();
    expect(corps.resultats[0].etat).toBe("applique");
  });

  it("met à jour la ligne existante si la saisie a été corrigée", async () => {
    jetonCourant = a.jeton;
    const base = {
      type: "temps",
      clientMutationId: uuid(3),
      interventionId: a.interventionId,
      libelle: "Diagnostic",
    };

    await POST(requete([{ ...base, minutes: 20 }]));
    // L'artisan corrige son temps : même identifiant, nouvelle valeur.
    await POST(requete([{ ...base, minutes: 35 }]));

    const temps = await prisma.timeEntry.findMany({
      where: { clientMutationId: uuid(3) },
    });
    expect(temps).toHaveLength(1);
    expect(temps[0]?.minutes).toBe(35);
  });

  it("applique tâches et fournitures", async () => {
    jetonCourant = a.jeton;
    await POST(
      requete([
        {
          type: "tache",
          clientMutationId: uuid(4),
          interventionId: a.interventionId,
          libelle: "Changer le siphon",
          ordre: 0,
        },
        {
          type: "fourniture",
          clientMutationId: uuid(5),
          interventionId: a.interventionId,
          libelle: "Flexible 50 cm",
          quantiteMilli: 2000,
          unite: "u",
        },
      ]),
    );

    expect(
      await prisma.interventionTask.count({ where: { interventionId: a.interventionId } }),
    ).toBe(1);
    const fournitures = await prisma.interventionSupply.findMany({
      where: { interventionId: a.interventionId },
    });
    expect(fournitures[0]?.quantiteMilli).toBe(2000);
  });

  /*
   * Isolation : l'identifiant de l'intervention de B est parfaitement valide,
   * mais envoyé depuis la session de A. Un identifiant fuite bien plus
   * facilement qu'un mot de passe.
   */
  it("refuse d'écrire dans l'intervention d'un autre artisan", async () => {
    jetonCourant = a.jeton;
    const reponse = await POST(
      requete([
        {
          type: "temps",
          clientMutationId: uuid(6),
          interventionId: b.interventionId,
          minutes: 60,
          libelle: "Tentative",
        },
      ]),
    );
    const corps = await reponse.json();
    expect(corps.resultats[0].etat).toBe("refuse");

    expect(
      await prisma.timeEntry.count({ where: { interventionId: b.interventionId } }),
    ).toBe(0);
  });

  // Une saisie invalide ne doit pas faire perdre les autres : sinon une seule
  // ligne fautive bloquerait toute la file de l'artisan.
  it("traite les mutations indépendamment dans un même lot", async () => {
    jetonCourant = a.jeton;
    const reponse = await POST(
      requete([
        {
          type: "temps",
          clientMutationId: uuid(7),
          interventionId: b.interventionId,
          minutes: 10,
          libelle: "Refusée",
        },
        {
          type: "temps",
          clientMutationId: uuid(8),
          interventionId: a.interventionId,
          minutes: 15,
          libelle: "Acceptée",
        },
      ]),
    );
    const corps = await reponse.json();
    expect(corps.resultats).toHaveLength(2);
    expect(corps.resultats.filter((r: { etat: string }) => r.etat === "applique")).toHaveLength(1);
    expect(await prisma.timeEntry.count({ where: { clientMutationId: uuid(8) } })).toBe(1);
  });

  it("refuse d'écrire dans une intervention clôturée", async () => {
    jetonCourant = a.jeton;
    const client = await prisma.client.findFirst({ where: { id: a.clientId } });
    const close = await prisma.intervention.create({
      data: {
        statut: "CLOTUREE",
        clientId: client!.id,
        organizationId: a.organizationId,
        clotureeLe: new Date(),
      },
    });

    const reponse = await POST(
      requete([
        {
          type: "temps",
          clientMutationId: uuid(9),
          interventionId: close.id,
          minutes: 20,
          libelle: "Après clôture",
        },
      ]),
    );
    const corps = await reponse.json();
    expect(corps.resultats[0].etat).toBe("refuse");
    expect(await prisma.timeEntry.count({ where: { interventionId: close.id } })).toBe(0);
  });

  it("rejette un lot mal formé sans rien écrire", async () => {
    jetonCourant = a.jeton;
    const avant = await prisma.timeEntry.count();
    const reponse = await POST(
      requete([
        { type: "temps", clientMutationId: "pas-un-uuid", interventionId: a.interventionId, minutes: 5 },
      ]),
    );
    expect(reponse.status).toBe(400);
    expect(await prisma.timeEntry.count()).toBe(avant);
  });
});
