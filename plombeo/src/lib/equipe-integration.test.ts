import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hacherJeton } from "@/lib/session";

/**
 * ÉQUIPE ET SECOND FACTEUR — intégration (Phase 14).
 *
 * Cette phase change le modèle de menace : ouvrir les comptes multiplie les
 * portes et crée un chemin d'élévation. Ces tests couvrent les trois garanties
 * qui le referment.
 */

const baseDisponible = Boolean(process.env["DATABASE_URL"]);
const decrire = baseDisponible ? describe : describe.skip;

let contexteCourant = { organizationId: "", userId: "", role: "PROPRIETAIRE", email: "chef@exemple.fr" };

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({ redirect: () => undefined }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/dal", () => ({
  exigerPermission: async () => contexteCourant,
  sessionCourante: async () => contexteCourant,
}));

const { prisma } = await import("@/lib/prisma");
const { inviterMembre, retirerMembre, preparerMfa, activerMfa } = await import(
  "@/app/app/equipe/actions"
);
const { codeTotp, PAS_SECONDES } = await import("@/lib/mfa");

const suffixe = `eq-${Date.now()}`;

async function creerOrganisation() {
  const organisation = await prisma.organization.create({ data: { nom: `Eq ${suffixe}` } });
  const chef = await prisma.user.create({
    data: { email: `chef-${suffixe}@exemple.fr`, passwordHash: "x" },
  });
  await prisma.membership.create({
    data: { userId: chef.id, organizationId: organisation.id, role: "PROPRIETAIRE" },
  });
  contexteCourant = {
    organizationId: organisation.id,
    userId: chef.id,
    role: "PROPRIETAIRE",
    email: `chef-${suffixe}@exemple.fr`,
  };
  return { organizationId: organisation.id, chefId: chef.id };
}

function formulaire(champs: Record<string, string>): FormData {
  const d = new FormData();
  for (const [c, v] of Object.entries(champs)) d.set(c, v);
  return d;
}

decrire("équipe et second facteur", () => {
  beforeEach(async () => {
    await prisma.organization.deleteMany({ where: { nom: { contains: suffixe } } });
    await prisma.user.deleteMany({ where: { email: { contains: suffixe } } });
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { nom: { contains: suffixe } } });
    await prisma.user.deleteMany({ where: { email: { contains: suffixe } } });
    await prisma.$disconnect();
  });

  it("crée une invitation et n'affiche le lien qu'une fois", async () => {
    const jeu = await creerOrganisation();
    const r = await inviterMembre({}, formulaire({ email: "apprenti@exemple.fr", role: "APPRENTI" }));

    expect(r.succes).toBeTruthy();
    expect(r.lien).toContain("/invitation/");

    const invitation = await prisma.invitation.findFirst({
      where: { organizationId: jeu.organizationId },
    });
    // La base ne garde que l'empreinte : le jeton en clair n'y figure pas.
    const jeton = r.lien!.split("/invitation/")[1]!;
    expect(invitation!.tokenHash).toBe(hacherJeton(jeton));
    expect(JSON.stringify(invitation)).not.toContain(jeton);
  });

  /*
   * LA garantie de la phase : sans elle, l'invitation devient un mécanisme
   * d'élévation de privilèges — il suffirait d'inviter un complice, ou soi-même
   * sur une autre adresse, pour obtenir les pleins pouvoirs.
   */
  it("interdit d'inviter à un rôle supérieur ou égal au sien", async () => {
    const jeu = await creerOrganisation();
    contexteCourant = { ...contexteCourant, role: "ADMINISTRATEUR" };

    const versProprietaire = await inviterMembre({}, formulaire({ email: "x@exemple.fr", role: "PROPRIETAIRE" }));
    expect(versProprietaire.erreur).toMatch(/supérieur ou égal/i);

    const versPair = await inviterMembre({}, formulaire({ email: "y@exemple.fr", role: "ADMINISTRATEUR" }));
    expect(versPair.erreur).toBeTruthy();

    // Rien n'a été créé.
    expect(
      await prisma.invitation.count({ where: { organizationId: jeu.organizationId } }),
    ).toBe(0);

    // Vers le bas, en revanche, c'est permis.
    const versBas = await inviterMembre({}, formulaire({ email: "z@exemple.fr", role: "TECHNICIEN" }));
    expect(versBas.succes).toBeTruthy();
  });

  it("fige le rôle dans l'invitation", async () => {
    const jeu = await creerOrganisation();
    await inviterMembre({}, formulaire({ email: "tech@exemple.fr", role: "TECHNICIEN" }));

    const invitation = await prisma.invitation.findFirst({
      where: { organizationId: jeu.organizationId },
    });
    // Le rôle vient de l'invitation, jamais d'un choix de l'invité.
    expect(invitation!.role).toBe("TECHNICIEN");
  });

  /*
   * Une organisation sans propriétaire est une organisation que plus personne
   * ne peut administrer.
   */
  it("refuse de retirer le dernier propriétaire, en l'expliquant", async () => {
    const jeu = await creerOrganisation();
    const membership = await prisma.membership.findFirst({
      where: { organizationId: jeu.organizationId },
    });

    const r = await retirerMembre({}, formulaire({ id: membership!.id }));
    expect(r.erreur).toMatch(/dernier propriétaire/i);
    expect(
      await prisma.membership.count({ where: { organizationId: jeu.organizationId } }),
    ).toBe(1);
  });

  it("autorise le retrait dès qu'un second propriétaire existe", async () => {
    const jeu = await creerOrganisation();
    const second = await prisma.user.create({
      data: { email: `second-${suffixe}@exemple.fr`, passwordHash: "x" },
    });
    await prisma.membership.create({
      data: { userId: second.id, organizationId: jeu.organizationId, role: "PROPRIETAIRE" },
    });
    // Une session ouverte, qui doit tomber au retrait.
    await prisma.session.create({
      data: {
        id: `sid-${suffixe}`,
        tokenHash: `h-${suffixe}`,
        userId: second.id,
        organizationId: jeu.organizationId,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });

    const membership = await prisma.membership.findFirst({
      where: { organizationId: jeu.organizationId, userId: second.id },
    });
    const r = await retirerMembre({}, formulaire({ id: membership!.id }));
    expect(r.succes).toBeTruthy();

    // Un retrait qui laisserait une session ouverte ne serait pas un retrait.
    expect(await prisma.session.count({ where: { userId: second.id } })).toBe(0);
  });

  it("n'active le second facteur qu'après vérification d'un vrai code", async () => {
    const jeu = await creerOrganisation();

    const prepare = await preparerMfa({}, new FormData());
    expect(prepare.secret).toBeTruthy();
    expect(prepare.uri).toContain("otpauth://");

    // Rien n'est actif tant qu'aucun code n'a été vérifié : activer sur la
    // seule foi d'un secret affiché fermerait le compte de quelqu'un qui
    // aurait mal scanné.
    let utilisateur = await prisma.user.findUnique({ where: { id: jeu.chefId } });
    expect(utilisateur!.totpActifLe).toBeNull();

    const mauvais = await activerMfa({}, formulaire({ code: "000000" }));
    expect(mauvais.erreur).toBeTruthy();
    utilisateur = await prisma.user.findUnique({ where: { id: jeu.chefId } });
    expect(utilisateur!.totpActifLe).toBeNull();

    const pas = Math.floor(Date.now() / 1000 / PAS_SECONDES);
    const bon = await activerMfa({}, formulaire({ code: codeTotp(prepare.secret!, pas) }));
    expect(bon.succes).toBeTruthy();
    expect(bon.codes).toHaveLength(8);

    utilisateur = await prisma.user.findUnique({ where: { id: jeu.chefId } });
    expect(utilisateur!.totpActifLe).not.toBeNull();

    // Les codes de récupération sont HACHÉS : la base ne doit pas contenir de
    // quoi contourner le facteur qu'elle protège.
    for (const code of bon.codes!) {
      expect(utilisateur!.codesRecuperation).not.toContain(code);
      expect(utilisateur!.codesRecuperation).toContain(hacherJeton(code));
    }
  });
});
