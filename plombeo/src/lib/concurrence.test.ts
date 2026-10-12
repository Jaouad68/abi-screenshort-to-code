import { afterAll, describe, expect, it, vi } from "vitest";

/**
 * CONCURRENCE (Phase 12).
 *
 * Deux appareils, ou un appareil revenu du hors-ligne, ne doivent jamais
 * s'écraser en silence. Sur un compte rendu rédigé après une heure de travail
 * dans un local technique, c'est la perte la plus coûteuse que l'application
 * puisse infliger.
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
    userId: "u-test",
    email: "t@exemple.fr",
  }),
  exigerSession: async () => ({ organizationId: organisationCourante, userId: "u-test" }),
}));

const { prisma } = await import("@/lib/prisma");
const { enregistrerCompteRendu } = await import("@/app/app/agenda/actions");

const suffixe = `conc-${Date.now()}`;

async function creerIntervention() {
  const organisation = await prisma.organization.create({ data: { nom: `Conc ${suffixe}` } });
  const client = await prisma.client.create({
    data: { nomAffichage: "Client", nom: "Client", organizationId: organisation.id },
  });
  const intervention = await prisma.intervention.create({
    data: {
      statut: "EN_COURS",
      compteRendu: "texte initial",
      clientId: client.id,
      organizationId: organisation.id,
    },
  });
  organisationCourante = organisation.id;
  return intervention;
}

function formulaire(id: string, compteRendu: string, vuLe?: string): FormData {
  const d = new FormData();
  d.set("id", id);
  d.set("probleme", "");
  d.set("diagnostic", "");
  d.set("compteRendu", compteRendu);
  if (vuLe !== undefined) d.set("vuLe", vuLe);
  return d;
}

decrire("concurrence sur le compte rendu", () => {
  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { nom: { contains: suffixe } } });
    await prisma.$disconnect();
  });

  it("enregistre quand le jeton de version correspond", async () => {
    const i = await creerIntervention();
    const r = await enregistrerCompteRendu({}, formulaire(i.id, "texte de l appareil A", i.updatedAt.toISOString()));
    expect(r.erreur).toBeUndefined();

    const apres = await prisma.intervention.findUnique({ where: { id: i.id } });
    expect(apres?.compteRendu).toBe("texte de l appareil A");
  });

  /*
   * LE test de la phase. L'appareil B a affiché la page avant l'écriture de A :
   * son jeton est périmé. Rien ne doit être écrasé, et les deux versions
   * doivent revenir à l'écran.
   */
  it("n'écrase rien quand une écriture est arrivée entre-temps", async () => {
    const i = await creerIntervention();
    const jetonDeB = i.updatedAt.toISOString();

    // A enregistre d'abord.
    await enregistrerCompteRendu({}, formulaire(i.id, "version de A", jetonDeB));

    // B envoie ensuite, avec le jeton qu'il avait lu AVANT.
    const r = await enregistrerCompteRendu({}, formulaire(i.id, "version de B", jetonDeB));

    expect(r.erreur).toBeTruthy();
    expect(r.conflit).toBeDefined();
    expect(r.conflit).toHaveLength(1);
    expect(r.conflit![0]!.champ).toBe("compteRendu");
    expect(r.conflit![0]!.versionServeur).toBe("version de A");
    expect(r.conflit![0]!.versionLocale).toBe("version de B");

    // Le texte de A est INTACT : rien n'a été écrasé.
    const apres = await prisma.intervention.findUnique({ where: { id: i.id } });
    expect(apres?.compteRendu).toBe("version de A");
  });

  it("permet de réenregistrer avec le jeton rafraîchi que le conflit renvoie", async () => {
    const i = await creerIntervention();
    const perime = i.updatedAt.toISOString();
    await enregistrerCompteRendu({}, formulaire(i.id, "version de A", perime));

    const conflit = await enregistrerCompteRendu({}, formulaire(i.id, "version de B", perime));
    const rafraichi = conflit.conflit![0]!.vuLe;

    const r = await enregistrerCompteRendu({}, formulaire(i.id, "version de B", rafraichi));
    expect(r.erreur).toBeUndefined();

    const apres = await prisma.intervention.findUnique({ where: { id: i.id } });
    expect(apres?.compteRendu).toBe("version de B");
  });

  /*
   * Tolérer l'absence du jeton rouvrirait la faille au premier formulaire qui
   * l'oublie : le refus est explicite.
   */
  it("refuse une écriture sans jeton de version, avec un message distinct", async () => {
    const i = await creerIntervention();
    const r = await enregistrerCompteRendu({}, formulaire(i.id, "sans jeton"));

    // Le message doit dire de RECHARGER, pas signaler un conflit : sans jeton,
    // il n'y a rien à arbitrer, le formulaire est simplement périmé. Sans la
    // garde explicite, l'écriture tomberait dans le chemin « conflit » et
    // afficherait deux versions à comparer là où il n'y a qu'un rechargement à
    // faire — d'où l'assertion sur le message, et non sur la seule présence
    // d'une erreur.
    expect(r.erreur).toMatch(/Rechargez la page/i);
    expect(r.conflit).toBeUndefined();

    const apres = await prisma.intervention.findUnique({ where: { id: i.id } });
    expect(apres?.compteRendu).toBe("texte initial");
  });

  /*
   * Modifiée entre-temps, mais sans divergence sur ces champs : il n'y a rien à
   * arbitrer. Signaler un conflit ici serait du bruit.
   */
  it("ne signale aucun conflit quand les textes n'ont pas divergé", async () => {
    const i = await creerIntervention();
    const jeton = i.updatedAt.toISOString();

    // Une écriture qui ne touche pas aux champs texte (ajout de temps).
    await prisma.timeEntry.create({
      data: { minutes: 30, interventionId: i.id, organizationId: organisationCourante },
    });
    await prisma.intervention.update({ where: { id: i.id }, data: { statut: "EN_COURS" } });

    const r = await enregistrerCompteRendu({}, formulaire(i.id, "texte initial", jeton));
    expect(r.conflit).toBeUndefined();
  });
});
