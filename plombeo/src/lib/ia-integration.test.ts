import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ASSISTANT IA — intégration (Phase 11).
 *
 * Vérifie que la promesse §22 tient jusque dans la base : l'IA n'écrit JAMAIS
 * dans `diagnostic`, et rien n'entre dans l'intervention sans validation.
 */

const baseDisponible = Boolean(process.env["DATABASE_URL"]);
const decrire = baseDisponible ? describe : describe.skip;

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({ redirect: () => undefined }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
// Session simulée : ces tests portent sur le comportement de l'action, pas sur
// le DAL, déjà couvert ailleurs.
vi.mock("@/lib/dal", () => ({
  exigerPermission: async () => ({
    organizationId: contexteOrganisation,
    userId: "u-test",
    email: "test@exemple.fr",
  }),
}));

let contexteOrganisation = "";

const { prisma } = await import("@/lib/prisma");
const { proposerMiseAuPropre, accepterProposition } = await import(
  "@/app/app/interventions/[id]/ia-actions"
);

const suffixe = `ia-${Date.now()}`;

async function creerIntervention() {
  const organisation = await prisma.organization.create({ data: { nom: `IA ${suffixe}` } });
  const client = await prisma.client.create({
    data: { nomAffichage: "Client IA", nom: "IA", organizationId: organisation.id },
  });
  const intervention = await prisma.intervention.create({
    data: {
      statut: "EN_COURS",
      diagnostic: "DIAGNOSTIC ÉCRIT PAR L'ARTISAN",
      compteRendu: "jai chanG le joint",
      clientId: client.id,
      organizationId: organisation.id,
    },
  });
  contexteOrganisation = organisation.id;
  return { organizationId: organisation.id, interventionId: intervention.id };
}

decrire("assistant IA", () => {
  beforeEach(async () => {
    await prisma.organization.deleteMany({ where: { nom: { contains: suffixe } } });
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { nom: { contains: suffixe } } });
    await prisma.$disconnect();
  });

  /*
   * Sans fournisseur configuré, l'assistant refuse. L'échec est TRACÉ : un appel
   * raté est une donnée, pas un silence.
   */
  it("refuse explicitement sans fournisseur, et trace le refus", async () => {
    const jeu = await creerIntervention();

    const donnees = new FormData();
    donnees.set("interventionId", jeu.interventionId);
    donnees.set("texte", "jai chanG le joint sous levier");

    const resultat = await proposerMiseAuPropre({}, donnees);
    expect(resultat.erreur).toMatch(/IA_FOURNISSEUR/);
    expect(resultat.proposition).toBeUndefined();

    const trace = await prisma.aiAction.findFirst({
      where: { organizationId: jeu.organizationId },
    });
    expect(trace).not.toBeNull();
    expect(trace!.erreur).toMatch(/IA_FOURNISSEUR/);
    expect(trace!.proposition).toBe("");
  });

  it("n'écrit rien sur l'intervention tant que rien n'est validé", async () => {
    const jeu = await creerIntervention();

    const donnees = new FormData();
    donnees.set("interventionId", jeu.interventionId);
    donnees.set("texte", "un texte quelconque");
    await proposerMiseAuPropre({}, donnees);

    const intervention = await prisma.intervention.findUnique({
      where: { id: jeu.interventionId },
    });
    expect(intervention?.compteRendu).toBe("jai chanG le joint");
    expect(intervention?.diagnostic).toBe("DIAGNOSTIC ÉCRIT PAR L'ARTISAN");
  });

  /*
   * LE test du §22 : même acceptée, une proposition n'entre que dans
   * `compteRendu`. Le champ `diagnostic` porte depuis la Phase 3 la mention
   * « jamais généré ni déduit par l'application ».
   */
  it("n'écrit JAMAIS dans le diagnostic, même après acceptation", async () => {
    const jeu = await creerIntervention();

    const action = await prisma.aiAction.create({
      data: {
        type: "MISE_AU_PROPRE",
        demandeEnvoyee: "jai chanG le joint",
        proposition: "J'ai changé le joint sous l'évier.",
        interventionId: jeu.interventionId,
        organizationId: jeu.organizationId,
      },
    });

    const donnees = new FormData();
    donnees.set("actionId", action.id);
    donnees.set("interventionId", jeu.interventionId);
    donnees.set("decision", "ACCEPTEE");
    await accepterProposition(donnees);

    const intervention = await prisma.intervention.findUnique({
      where: { id: jeu.interventionId },
    });
    expect(intervention?.compteRendu).toBe("J'ai changé le joint sous l'évier.");
    // Intact : c'est le jugement professionnel de l'artisan.
    expect(intervention?.diagnostic).toBe("DIAGNOSTIC ÉCRIT PAR L'ARTISAN");
  });

  it("n'écrit rien quand la proposition est rejetée", async () => {
    const jeu = await creerIntervention();
    const action = await prisma.aiAction.create({
      data: {
        type: "MISE_AU_PROPRE",
        demandeEnvoyee: "x",
        proposition: "TEXTE REJETE",
        interventionId: jeu.interventionId,
        organizationId: jeu.organizationId,
      },
    });

    const donnees = new FormData();
    donnees.set("actionId", action.id);
    donnees.set("interventionId", jeu.interventionId);
    donnees.set("decision", "REJETEE");
    await accepterProposition(donnees);

    const intervention = await prisma.intervention.findUnique({
      where: { id: jeu.interventionId },
    });
    expect(intervention?.compteRendu).toBe("jai chanG le joint");

    // Le rejet est conservé : c'est lui qui documente le jugement de l'artisan.
    const trace = await prisma.aiAction.findUnique({ where: { id: action.id } });
    expect(trace?.decision).toBe("REJETEE");
    expect(trace?.proposition).toBe("TEXTE REJETE");
  });

  it("ne transmet au fournisseur qu'un texte caviardé, et ne trace que celui-là", async () => {
    const jeu = await creerIntervention();

    const donnees = new FormData();
    donnees.set("interventionId", jeu.interventionId);
    donnees.set("texte", "Rappeler Madame Durand au 06 12 34 56 78, 69001 Lyon.");
    await proposerMiseAuPropre({}, donnees);

    const trace = await prisma.aiAction.findFirst({
      where: { organizationId: jeu.organizationId },
    });
    expect(trace!.demandeEnvoyee).not.toContain("06 12 34 56 78");
    expect(trace!.demandeEnvoyee).not.toContain("69001");
    expect(trace!.demandeEnvoyee).toContain("[téléphone]");
  });
});
