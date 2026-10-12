import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hacherJeton } from "@/lib/session";

/**
 * PORTAIL CLIENT — intégration (Phase 10).
 *
 * Première porte du projet ouverte à quelqu'un sans session Plombéo. Ce qui est
 * vérifié ici :
 *
 *  1. un jeton ne donne accès qu'aux documents de SON client ;
 *  2. un jeton révoqué ou expiré est refusé, indistinctement d'un jeton inconnu ;
 *  3. aucun champ interne ne fuit dans les projections.
 *
 * Validation par mutation : retirer `clientId` du filtre de `devisDetail`, ou
 * le contrôle d'expiration de `resoudreJeton`, doit faire échouer ces tests.
 */

const baseDisponible = Boolean(process.env["DATABASE_URL"]);
const decrire = baseDisponible ? describe : describe.skip;

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({ redirect: () => undefined }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { prisma } = await import("@/lib/prisma");
const { resoudreJeton, devisDetail, devisDuClient, facturesDuClient, enteteClient, genererJetonPortail } =
  await import("@/lib/portail");
const { accepterDevisPortail } = await import("@/app/portail/actions");

const suffixe = `portail-${Date.now()}`;

type Jeu = { organizationId: string; clientId: string; devisId: string; jeton: string };

async function creerJeu(nom: string, options: { expire?: boolean; revoque?: boolean } = {}) {
  const organisation = await prisma.organization.create({ data: { nom: `${nom} ${suffixe}` } });
  const client = await prisma.client.create({
    data: {
      nomAffichage: `Client ${nom}`,
      nom: `Client ${nom}`,
      // Note INTERNE : elle ne doit apparaître nulle part dans le portail.
      notes: `SECRET-INTERNE-${nom}`,
      organizationId: organisation.id,
    },
  });

  const devis = await prisma.quote.create({
    data: {
      numero: `DEV-2026-${nom === "Alpha" ? "001" : "002"}`,
      statut: "ENVOYE",
      objet: `Chantier ${nom}`,
      notes: `NOTE-DEVIS-INTERNE-${nom}`,
      clientId: client.id,
      organizationId: organisation.id,
      options: {
        create: {
          libelle: "Proposition",
          ordre: 0,
          organizationId: organisation.id,
          lignes: {
            create: {
              libelle: "Main-d'œuvre",
              quantiteMilli: 2000,
              unite: "h",
              prixUnitaireCents: 5000,
              tauxTvaCentiemes: 2000,
              ordre: 0,
              organizationId: organisation.id,
            },
          },
        },
      },
    },
  });

  const jeton = genererJetonPortail();
  await prisma.clientAccess.create({
    data: {
      tokenHash: hacherJeton(jeton),
      clientId: client.id,
      organizationId: organisation.id,
      expiresAt: options.expire
        ? new Date(Date.now() - 1000)
        : new Date(Date.now() + 30 * 24 * 3600 * 1000),
      ...(options.revoque ? { revokedAt: new Date() } : {}),
    },
  });

  return { organizationId: organisation.id, clientId: client.id, devisId: devis.id, jeton };
}

/**
 * Second client de la MÊME organisation.
 *
 * Sans lui, les tests de cloisonnement seraient vacueux : entre deux
 * organisations, c'est le filtre `organizationId` qui protège, et le filtre
 * `clientId` n'est jamais mis à l'épreuve. Or le scénario réaliste est celui-ci
 * — un artisan, deux clients, deux liens.
 */
async function creerVoisinMemeOrganisation(jeu: Jeu): Promise<Jeu> {
  const client = await prisma.client.create({
    data: {
      nomAffichage: "Client Voisin",
      nom: "Voisin",
      notes: "SECRET-INTERNE-Voisin",
      organizationId: jeu.organizationId,
    },
  });

  const devis = await prisma.quote.create({
    data: {
      numero: "DEV-2026-900",
      statut: "ENVOYE",
      objet: "Chantier du voisin",
      clientId: client.id,
      organizationId: jeu.organizationId,
      options: {
        create: {
          libelle: "Proposition",
          ordre: 0,
          organizationId: jeu.organizationId,
          lignes: {
            create: {
              libelle: "Main-d'œuvre",
              quantiteMilli: 1000,
              unite: "h",
              prixUnitaireCents: 9900,
              tauxTvaCentiemes: 2000,
              ordre: 0,
              organizationId: jeu.organizationId,
            },
          },
        },
      },
    },
  });

  const jeton = genererJetonPortail();
  await prisma.clientAccess.create({
    data: {
      tokenHash: hacherJeton(jeton),
      clientId: client.id,
      organizationId: jeu.organizationId,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    },
  });

  return { organizationId: jeu.organizationId, clientId: client.id, devisId: devis.id, jeton };
}

decrire("portail client", () => {
  let a: Jeu;
  let b: Jeu;
  let voisin: Jeu;

  beforeAll(async () => {
    a = await creerJeu("Alpha");
    b = await creerJeu("Beta");
    voisin = await creerVoisinMemeOrganisation(a);
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { nom: { contains: suffixe } } });
    await prisma.$disconnect();
  });

  it("résout un jeton valide", async () => {
    const acces = await resoudreJeton(a.jeton);
    expect(acces?.clientId).toBe(a.clientId);
    expect(acces?.organizationId).toBe(a.organizationId);
  });

  it("refuse un jeton inconnu, révoqué ou expiré de la même façon", async () => {
    const revoque = await creerJeu("Revoque", { revoque: true });
    const expire = await creerJeu("Expire", { expire: true });

    // Trois causes, un seul résultat : distinguer renseignerait sur
    // l'existence d'un lien.
    expect(await resoudreJeton("jeton-qui-n-existe-pas-du-tout")).toBeNull();
    expect(await resoudreJeton(revoque.jeton)).toBeNull();
    expect(await resoudreJeton(expire.jeton)).toBeNull();
    expect(await resoudreJeton("")).toBeNull();
  });

  /*
   * LE test de la phase : un jeton valide n'est pas un passe-partout. Le devis
   * de B existe et son identifiant est exact, mais il n'appartient pas au
   * client de A.
   */
  it("ne donne accès qu'aux documents de son propre client", async () => {
    const acces = (await resoudreJeton(a.jeton))!;

    expect(await devisDetail(acces, b.devisId)).toBeNull();
    expect(await devisDetail(acces, a.devisId)).not.toBeNull();

    const liste = await devisDuClient(acces);
    expect(liste.map((d) => d.id)).toEqual([a.devisId]);
  });

  /*
   * Le scénario réellement dangereux : un artisan, deux clients. Ici le filtre
   * d'organisation ne protège plus — seul `clientId` sépare les deux. C'est ce
   * test qui valide le mécanisme, l'autre étant rattrapé par l'organisation.
   */
  it("sépare deux clients d'un MÊME artisan", async () => {
    const accesA = (await resoudreJeton(a.jeton))!;
    const accesVoisin = (await resoudreJeton(voisin.jeton))!;
    expect(accesA.organizationId).toBe(accesVoisin.organizationId);

    expect(await devisDetail(accesA, voisin.devisId)).toBeNull();
    expect(await devisDetail(accesVoisin, a.devisId)).toBeNull();

    expect((await devisDuClient(accesA)).some((d) => d.id === voisin.devisId)).toBe(false);
    expect((await devisDuClient(accesVoisin)).map((d) => d.id)).toEqual([voisin.devisId]);

    // Le montant du voisin ne doit apparaître nulle part chez A.
    const chezA = JSON.stringify(await devisDuClient(accesA));
    expect(chezA).not.toContain("9900");
  });

  it("refuse d'accepter le devis d'un autre client du même artisan", async () => {
    const donnees = new FormData();
    donnees.set("jeton", voisin.jeton);
    donnees.set("devisId", a.devisId);

    expect((await accepterDevisPortail({}, donnees)).erreur).toBeTruthy();
  });

  it("n'expose aucune note interne", async () => {
    const acces = (await resoudreJeton(a.jeton))!;

    const entete = await enteteClient(acces);
    const detail = await devisDetail(acces, a.devisId);
    const liste = await devisDuClient(acces);
    const factures = await facturesDuClient(acces);

    // Sérialisation complète : si un champ interne se glissait dans une
    // projection, il apparaîtrait ici.
    const tout = JSON.stringify({ entete, detail, liste, factures });
    expect(tout).not.toContain("SECRET-INTERNE");
    expect(tout).not.toContain("NOTE-DEVIS-INTERNE");
    expect(tout).not.toContain("prixAchat");
    expect(tout).not.toContain("coutHoraire");
  });

  it("masque les brouillons : un devis non émis n'existe pas pour le client", async () => {
    const brouillon = await prisma.quote.create({
      data: {
        statut: "BROUILLON",
        objet: "Pas encore envoyé",
        clientId: a.clientId,
        organizationId: a.organizationId,
      },
    });

    const acces = (await resoudreJeton(a.jeton))!;
    expect(await devisDetail(acces, brouillon.id)).toBeNull();
    expect((await devisDuClient(acces)).some((d) => d.id === brouillon.id)).toBe(false);
  });

  it("accepte un devis et journalise l'origine", async () => {
    const donnees = new FormData();
    donnees.set("jeton", a.jeton);
    donnees.set("devisId", a.devisId);

    const resultat = await accepterDevisPortail({}, donnees);
    expect(resultat.succes).toBeTruthy();

    const devis = await prisma.quote.findUnique({ where: { id: a.devisId } });
    expect(devis?.statut).toBe("ACCEPTE");

    const entree = await prisma.auditLog.findFirst({
      where: { organizationId: a.organizationId, action: "quote.accepted_by_client" },
    });
    expect(entree).not.toBeNull();
    // L'auteur n'est pas un utilisateur de Plombéo.
    expect(entree?.actorUserId).toBeNull();

    // L'artisan est prévenu sans avoir à regarder.
    const notification = await prisma.notification.findFirst({
      where: { organizationId: a.organizationId },
    });
    expect(notification?.titre).toContain("accepté");
  });

  it("refuse d'accepter le devis d'un autre client", async () => {
    const donnees = new FormData();
    donnees.set("jeton", a.jeton);
    donnees.set("devisId", b.devisId);

    const resultat = await accepterDevisPortail({}, donnees);
    expect(resultat.erreur).toBeTruthy();

    const devis = await prisma.quote.findUnique({ where: { id: b.devisId } });
    expect(devis?.statut).toBe("ENVOYE");
  });

  it("refuse d'accepter avec un jeton révoqué", async () => {
    const revoque = await creerJeu("Revoque2", { revoque: true });
    const donnees = new FormData();
    donnees.set("jeton", revoque.jeton);
    donnees.set("devisId", revoque.devisId);

    expect((await accepterDevisPortail({}, donnees)).erreur).toBeTruthy();
    const devis = await prisma.quote.findUnique({ where: { id: revoque.devisId } });
    expect(devis?.statut).toBe("ENVOYE");
  });

  it("produit des jetons imprévisibles", () => {
    const jetons = new Set(Array.from({ length: 200 }, () => genererJetonPortail()));
    expect(jetons.size).toBe(200);
    // Aucun jeton ne doit ressembler à un identifiant de base.
    for (const j of jetons) expect(j.length).toBeGreaterThanOrEqual(40);
  });
});
