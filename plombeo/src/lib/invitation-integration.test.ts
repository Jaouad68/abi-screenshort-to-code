import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * ACCEPTATION D'UNE INVITATION ET CONNEXION AVEC SECOND FACTEUR (Phase 14).
 *
 * Ces tests portent sur les deux portes que la phase ouvre : celle par laquelle
 * un nouveau membre entre, et celle par laquelle tout le monde se connecte.
 */

const baseDisponible = Boolean(process.env["DATABASE_URL"]);
const decrire = baseDisponible ? describe : describe.skip;

/* Cookies simulés : la connexion pose un cookie de défi, l'acceptation ouvre
 * une session. On observe ce qui est réellement écrit. */
const cookiesPoses = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nom: string) =>
      cookiesPoses.has(nom) ? { name: nom, value: cookiesPoses.get(nom)! } : undefined,
    set: (nom: string, valeur: string) => cookiesPoses.set(nom, valeur),
    delete: (nom: string) => cookiesPoses.delete(nom),
  }),
  headers: async () => new Headers(),
}));

/* `redirect()` interrompt normalement l'exécution : on le simule par une
 * exception, sans quoi le test ne distinguerait pas « a redirigé » de « a
 * continué ». */
class Redirection extends Error {
  constructor(public cible: string) {
    super(`redirect:${cible}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (cible: string) => {
    throw new Redirection(cible);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { prisma } = await import("@/lib/prisma");
const { hacherMotDePasse } = await import("@/lib/auth");
const { hacherJeton, COOKIE_DEFI, COOKIE_SESSION } = await import("@/lib/session");
const { codeTotp, genererSecretTotp, PAS_SECONDES } = await import("@/lib/mfa");
const { accepterInvitation } = await import("@/app/invitation/[jeton]/actions");
const { connecter, verifierCode } = await import("@/app/connexion/actions");

const suffixe = `inv-${Date.now()}`;
const MOT_DE_PASSE = "un-mot-de-passe-assez-long";

function formulaire(champs: Record<string, string>): FormData {
  const d = new FormData();
  for (const [c, v] of Object.entries(champs)) d.set(c, v);
  return d;
}

async function attraper(promesse: Promise<unknown>): Promise<Redirection | null> {
  try {
    await promesse;
    return null;
  } catch (erreur) {
    if (erreur instanceof Redirection) return erreur;
    throw erreur;
  }
}

let organizationId = "";

async function creerInvitation(email: string, role = "TECHNICIEN") {
  const jeton = `jeton-${Math.random().toString(36).slice(2)}-${suffixe}`;
  await prisma.invitation.create({
    data: {
      tokenHash: hacherJeton(jeton),
      email,
      role: role as never,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      parEmail: `chef-${suffixe}@exemple.fr`,
      organizationId,
    },
  });
  return jeton;
}

async function nettoyer() {
  await prisma.session.deleteMany({ where: { user: { email: { contains: suffixe } } } });
  await prisma.organization.deleteMany({ where: { nom: { contains: suffixe } } });
  await prisma.user.deleteMany({ where: { email: { contains: suffixe } } });
  await prisma.loginAttempt.deleteMany({ where: { identifiant: { contains: suffixe } } });
}

decrire("acceptation d'une invitation", () => {
  beforeAll(async () => {
    await nettoyer();
    const organisation = await prisma.organization.create({ data: { nom: `Inv ${suffixe}` } });
    organizationId = organisation.id;
  });

  afterAll(async () => {
    await nettoyer();
    await prisma.$disconnect();
  });

  /*
   * LA garantie de l'invitation : le rôle vient du jeton, jamais du formulaire.
   * C'est l'évidence même, et c'est précisément le genre d'évidence qu'on oublie
   * de vérifier.
   */
  it("applique le rôle de l'invitation, pas celui posté par l'invité", async () => {
    const email = `tech1-${suffixe}@exemple.fr`;
    const jeton = await creerInvitation(email, "TECHNICIEN");

    const redirection = await attraper(
      accepterInvitation(
        {},
        formulaire({
          jeton,
          nomComplet: "Nadia Terrier",
          motDePasse: MOT_DE_PASSE,
          // Tentative d'élévation : un champ « role » posté en plus.
          role: "PROPRIETAIRE",
        }),
      ),
    );
    expect(redirection?.cible).toBe("/app");

    const membership = await prisma.membership.findFirst({
      where: { organizationId, user: { email } },
    });
    expect(membership?.role).toBe("TECHNICIEN");
  });

  it("ne sert qu'une fois", async () => {
    const email = `tech2-${suffixe}@exemple.fr`;
    const jeton = await creerInvitation(email);

    expect(
      (
        await attraper(
          accepterInvitation({}, formulaire({ jeton, nomComplet: "A", motDePasse: MOT_DE_PASSE })),
        )
      )?.cible,
    ).toBe("/app");

    // Deuxième passage : le jeton est consommé, aucun second compte ne doit
    // naître (la création échouerait d'ailleurs sur l'unicité de l'e-mail).
    const second = await accepterInvitation(
      {},
      formulaire({ jeton, nomComplet: "B", motDePasse: MOT_DE_PASSE }),
    );
    expect(second.erreur).toMatch(/plus valable/i);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });

  it("refuse un jeton révoqué ou expiré, sans dire lequel", async () => {
    const revoque = await creerInvitation(`rev-${suffixe}@exemple.fr`);
    await prisma.invitation.updateMany({
      where: { tokenHash: hacherJeton(revoque) },
      data: { revokeeLe: new Date() },
    });

    const perime = await creerInvitation(`per-${suffixe}@exemple.fr`);
    await prisma.invitation.updateMany({
      where: { tokenHash: hacherJeton(perime) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const a = await accepterInvitation(
      {},
      formulaire({ jeton: revoque, nomComplet: "X", motDePasse: MOT_DE_PASSE }),
    );
    const b = await accepterInvitation(
      {},
      formulaire({ jeton: perime, nomComplet: "X", motDePasse: MOT_DE_PASSE }),
    );
    const c = await accepterInvitation(
      {},
      formulaire({ jeton: "inexistant", nomComplet: "X", motDePasse: MOT_DE_PASSE }),
    );

    expect(a.erreur).toBe(b.erreur);
    expect(b.erreur).toBe(c.erreur);
    expect(await prisma.user.count({ where: { email: { contains: `rev-${suffixe}` } } })).toBe(0);
  });

  /*
   * Un compte existe déjà à cette adresse. Le rattacher sans mot de passe
   * donnerait à quiconque intercepte le lien l'accès à un compte qu'il n'a
   * jamais connu — et contournerait le second facteur au passage.
   */
  it("exige le mot de passe du compte existant, et n'ouvre aucune session", async () => {
    const email = `deja-${suffixe}@exemple.fr`;
    await prisma.user.create({
      data: { email, passwordHash: await hacherMotDePasse(MOT_DE_PASSE), nomComplet: "Déjà Là" },
    });
    const jeton = await creerInvitation(email, "COMPTABLE");
    cookiesPoses.clear();

    const refus = await accepterInvitation(
      {},
      formulaire({ jeton, motDePasse: "ce-n-est-pas-le-bon-mot-de-passe" }),
    );
    expect(refus.erreur).toMatch(/mot de passe/i);
    expect(await prisma.membership.count({ where: { organizationId, user: { email } } })).toBe(0);

    const accepte = await accepterInvitation({}, formulaire({ jeton, motDePasse: MOT_DE_PASSE }));
    expect(accepte.succes).toBeTruthy();

    const membership = await prisma.membership.findFirst({
      where: { organizationId, user: { email } },
    });
    expect(membership?.role).toBe("COMPTABLE");
    // Aucune session : la connexion reste la porte unique pour un compte
    // existant, avec son propre second facteur.
    expect(cookiesPoses.has(COOKIE_SESSION)).toBe(false);
    expect(await prisma.session.count({ where: { user: { email } } })).toBe(0);
  });
});

decrire("connexion avec second facteur", () => {
  const email = `mfa-${suffixe}@exemple.fr`;
  let secret = "";

  beforeAll(async () => {
    await nettoyer();
    const organisation = await prisma.organization.create({ data: { nom: `Mfa ${suffixe}` } });
    secret = genererSecretTotp();
    const utilisateur = await prisma.user.create({
      data: {
        email,
        passwordHash: await hacherMotDePasse(MOT_DE_PASSE),
        totpSecret: secret,
        totpActifLe: new Date(),
      },
    });
    await prisma.membership.create({
      data: { userId: utilisateur.id, organizationId: organisation.id, role: "PROPRIETAIRE" },
    });
  });

  afterAll(async () => {
    await nettoyer();
    await prisma.$disconnect();
  });

  /*
   * LA garantie du second facteur. Ouvrir la session dès le mot de passe, quitte
   * à « demander le code ensuite », rendrait la protection décorative.
   */
  it("n'ouvre AUCUNE session sur le seul mot de passe", async () => {
    cookiesPoses.clear();

    const etat = await connecter({}, formulaire({ email, motDePasse: MOT_DE_PASSE }));
    expect(etat.etape).toBe("code");
    expect(cookiesPoses.has(COOKIE_SESSION)).toBe(false);
    expect(cookiesPoses.has(COOKIE_DEFI)).toBe(true);
    expect(await prisma.session.count({ where: { user: { email } } })).toBe(0);
  });

  it("refuse un mauvais code, puis accepte le bon", async () => {
    cookiesPoses.clear();
    await connecter({}, formulaire({ email, motDePasse: MOT_DE_PASSE }));

    const mauvais = await verifierCode({}, formulaire({ code: "000000" }));
    expect(mauvais.erreur).toBeTruthy();
    expect(await prisma.session.count({ where: { user: { email } } })).toBe(0);

    const pas = Math.floor(Date.now() / 1000 / PAS_SECONDES);
    const redirection = await attraper(
      verifierCode({}, formulaire({ code: codeTotp(secret, pas) })),
    );
    expect(redirection?.cible).toBe("/app");
    expect(await prisma.session.count({ where: { user: { email } } })).toBe(1);
    // Le défi est consommé : il ne doit pas rester utilisable après coup.
    expect(cookiesPoses.has(COOKIE_DEFI)).toBe(false);
  });

  it("refuse un code sans défi préalable", async () => {
    cookiesPoses.clear();
    const pas = Math.floor(Date.now() / 1000 / PAS_SECONDES);

    // Le bon code, mais personne n'a prouvé le premier facteur.
    const etat = await verifierCode({}, formulaire({ code: codeTotp(secret, pas) }));
    expect(etat.erreur).toMatch(/expiré|recommenc/i);
    expect(cookiesPoses.has(COOKIE_SESSION)).toBe(false);
  });

  it("consomme un code de récupération une seule fois", async () => {
    const code = "ABCDE-FGHIJ";
    await prisma.user.updateMany({
      where: { email },
      data: { codesRecuperation: [hacherJeton(code)] },
    });

    cookiesPoses.clear();
    await connecter({}, formulaire({ email, motDePasse: MOT_DE_PASSE }));
    expect((await attraper(verifierCode({}, formulaire({ code }))))?.cible).toBe("/app");

    const utilisateur = await prisma.user.findUnique({ where: { email } });
    expect(utilisateur!.codesRecuperation).toHaveLength(0);

    // Rejoué, le même code ne vaut plus rien.
    cookiesPoses.clear();
    await connecter({}, formulaire({ email, motDePasse: MOT_DE_PASSE }));
    const rejoue = await verifierCode({}, formulaire({ code }));
    expect(rejoue.erreur).toBeTruthy();
  });
});
