import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * CONTRATS — intégration (Phase 13).
 *
 * Deux garanties : l'échéance n'avance qu'après une visite RÉELLEMENT
 * enregistrée, et le rappel ne se répète pas à chaque balayage.
 */

const baseDisponible = Boolean(process.env["DATABASE_URL"]);
const decrire = baseDisponible ? describe : describe.skip;

let organisationCourante = "";
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({ redirect: () => undefined }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/dal", () => ({
  exigerPermission: async () => ({
    organizationId: organisationCourante,
    userId: "u",
    email: "t@exemple.fr",
  }),
}));

const { prisma } = await import("@/lib/prisma");
const { balayer } = await import("@/lib/moteur");
const { enregistrerVisite, changerStatutContrat } = await import("@/app/app/contrats/actions");
const { prochaineEcheance } = await import("@/lib/contrats");

const suffixe = `ctr-${Date.now()}`;

async function creerContrat(options: { debutLe?: Date } = {}) {
  const organisation = await prisma.organization.create({ data: { nom: `Ctr ${suffixe}` } });
  const client = await prisma.client.create({
    data: { nomAffichage: "Client Ctr", nom: "Ctr", organizationId: organisation.id },
  });
  const contrat = await prisma.maintenanceContract.create({
    data: {
      libelle: "Entretien chaudière",
      periodicite: "ANNUELLE",
      // Débuté il y a plus d'un an : l'échéance est donc dépassée.
      debutLe: options.debutLe ?? new Date(Date.now() - 400 * 24 * 3600 * 1000),
      clientId: client.id,
      organizationId: organisation.id,
    },
  });
  await prisma.automationRule.create({
    data: {
      active: true,
      declencheur: "CONTRAT_ECHEANCE",
      action: "NOTIFIER",
      delaiJours: 30,
      organizationId: organisation.id,
    },
  });
  organisationCourante = organisation.id;
  return { organizationId: organisation.id, contratId: contrat.id };
}

decrire("contrats d'entretien", () => {
  beforeEach(async () => {
    await prisma.organization.deleteMany({ where: { nom: { contains: suffixe } } });
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { nom: { contains: suffixe } } });
    await prisma.$disconnect();
  });

  it("notifie une échéance due, une seule fois", async () => {
    const jeu = await creerContrat();

    const premier = await balayer(new Date(), jeu.organizationId);
    expect(premier.executions).toBe(1);
    expect(premier.notifications).toBe(1);

    // Rejoué : le rappel ne se répète pas. Un contrat durablement en retard
    // produirait sinon une alerte par balayage, et l'artisan cesserait de les
    // lire.
    const second = await balayer(new Date(), jeu.organizationId);
    expect(second.executions).toBe(0);

    expect(
      await prisma.notification.count({ where: { organizationId: jeu.organizationId } }),
    ).toBe(1);
  });

  /*
   * LE test de la phase : c'est la visite RÉELLE qui fait avancer l'échéance.
   */
  it("n'avance l'échéance qu'après une visite enregistrée", async () => {
    const jeu = await creerContrat();

    const avant = await prisma.maintenanceContract.findUnique({ where: { id: jeu.contratId } });
    const echeanceAvant = prochaineEcheance(avant!);
    expect(avant!.derniereVisiteLe).toBeNull();

    const donnees = new FormData();
    donnees.set("id", jeu.contratId);
    await enregistrerVisite(donnees);

    const apres = await prisma.maintenanceContract.findUnique({ where: { id: jeu.contratId } });
    expect(apres!.derniereVisiteLe).not.toBeNull();

    const echeanceApres = prochaineEcheance(apres!);
    expect(echeanceApres!.getTime()).toBeGreaterThan(echeanceAvant!.getTime());
  });

  /*
   * Comme l'échéance dérive de la dernière visite, l'enregistrer change
   * l'occurrence et rouvre naturellement le rappel suivant — sans qu'aucun
   * code n'ait à « réinitialiser » quoi que ce soit.
   */
  it("rouvre le rappel après une visite, pour l'échéance suivante", async () => {
    const jeu = await creerContrat();
    await balayer(new Date(), jeu.organizationId);

    const donnees = new FormData();
    donnees.set("id", jeu.contratId);
    // Visite enregistrée il y a plus d'un an : la prochaine est déjà due.
    donnees.set("date", new Date(Date.now() - 400 * 24 * 3600 * 1000).toISOString().slice(0, 10));
    await enregistrerVisite(donnees);

    const second = await balayer(new Date(), jeu.organizationId);
    expect(second.executions).toBe(1);
  });

  /*
   * LA promesse de la phase, et elle manquait à ma première série de tests :
   * le moteur NOTIFIE, il n'enregistre jamais la visite. Sans ce test, une
   * ligne qui ferait avancer `derniereVisiteLe` au balayage passerait inaperçue
   * — et produirait un contrat « à jour » sans qu'aucun technicien ne soit
   * passé, ce que la spécification interdit explicitement.
   */
  it("ne coche JAMAIS la visite de lui-même", async () => {
    const jeu = await creerContrat();

    const bilan = await balayer(new Date(), jeu.organizationId);
    expect(bilan.notifications).toBe(1);

    const contrat = await prisma.maintenanceContract.findUnique({
      where: { id: jeu.contratId },
    });
    // Notifié, mais AUCUNE visite enregistrée.
    expect(contrat!.derniereVisiteLe).toBeNull();
  });

  it("ne notifie plus un contrat résilié", async () => {
    const jeu = await creerContrat();

    const donnees = new FormData();
    donnees.set("id", jeu.contratId);
    donnees.set("vers", "RESILIE");
    await changerStatutContrat(donnees);

    const bilan = await balayer(new Date(), jeu.organizationId);
    expect(bilan.executions).toBe(0);
    expect(
      await prisma.notification.count({ where: { organizationId: jeu.organizationId } }),
    ).toBe(0);
  });

  it("ne notifie pas avant le préavis", async () => {
    // Contrat démarré aujourd'hui : l'échéance est dans un an, bien au-delà
    // des 30 jours de préavis.
    const jeu = await creerContrat({ debutLe: new Date() });
    const bilan = await balayer(new Date(), jeu.organizationId);
    expect(bilan.executions).toBe(0);
  });
});
