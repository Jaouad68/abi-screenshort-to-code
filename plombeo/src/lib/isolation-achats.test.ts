import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hacherJeton, signerSession } from "@/lib/session";

/**
 * ISOLATION ET INTÉGRITÉ DES ACHATS ET DU STOCK (Phase 8).
 *
 * Deux garanties :
 *
 *  1. fournisseurs, achats et mouvements d'un autre artisan sont inaccessibles,
 *     y compris en connaissant l'identifiant exact ;
 *  2. une correction de stock écrit un MOUVEMENT d'écart et ne réécrit jamais
 *     l'historique (§57).
 *
 * Validation par mutation : retirer un filtre `organizationId` dans
 * `src/lib/achats.ts` doit faire échouer ces tests.
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
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({ redirect: () => undefined }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { prisma } = await import("@/lib/prisma");
const { listerAchats, lireAchat, listerFournisseurs, lireFournisseur, listerStock, stockArticle, listerMouvements } =
  await import("@/lib/achats");
const { corrigerStock, enregistrerMouvement } = await import("@/app/app/achats/actions");

const suffixe = `achat-${Date.now()}`;

type Artisan = {
  organizationId: string;
  jeton: string;
  supplierId: string;
  purchaseId: string;
  productId: string;
};

async function creerArtisan(nom: string): Promise<Artisan> {
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

  const fournisseur = await prisma.supplier.create({
    data: { nom: `Fournisseur ${nom}`, ville: "Lyon", organizationId: organisation.id },
  });

  const article = await prisma.product.create({
    data: {
      libelle: `Raccord ${nom}`,
      reference: `REF-${nom}`,
      unite: "u",
      prixUnitaireCents: 1200,
      suiviStock: true,
      seuilAlerteMilli: 2000,
      organizationId: organisation.id,
    },
  });

  const achat = await prisma.purchase.create({
    data: {
      libelle: `Achat ${nom}`,
      referenceFournisseur: `BL-${nom}`,
      supplierId: fournisseur.id,
      organizationId: organisation.id,
      lignes: {
        create: {
          libelle: `Raccord ${nom}`,
          quantiteMilli: 10000,
          unite: "u",
          prixUnitaireCents: 700,
          tauxTvaCentiemes: 2000,
          ordre: 0,
          productId: article.id,
          organizationId: organisation.id,
        },
      },
    },
  });

  await prisma.stockMovement.create({
    data: {
      type: "ENTREE_ACHAT",
      quantiteMilli: 10000,
      productId: article.id,
      organizationId: organisation.id,
      parEmail: `${nom}@exemple.fr`,
    },
  });

  return {
    organizationId: organisation.id,
    jeton,
    supplierId: fournisseur.id,
    purchaseId: achat.id,
    productId: article.id,
  };
}

decrire("isolation des achats et du stock", () => {
  let a: Artisan;
  let b: Artisan;

  beforeAll(async () => {
    a = await creerArtisan("Alpha");
    b = await creerArtisan("Beta");
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { nom: { contains: suffixe } } });
    await prisma.user.deleteMany({ where: { email: { contains: suffixe } } });
    await prisma.$disconnect();
  });

  it("traite le fournisseur d'un autre artisan comme inexistant", async () => {
    jetonCourant = a.jeton;
    expect(await lireFournisseur(b.supplierId)).toBeNull();
    expect(await lireFournisseur(a.supplierId)).not.toBeNull();
  });

  it("ne liste que ses propres fournisseurs", async () => {
    jetonCourant = a.jeton;
    expect((await listerFournisseurs()).map((f) => f.id)).toEqual([a.supplierId]);
    jetonCourant = b.jeton;
    expect((await listerFournisseurs()).map((f) => f.id)).toEqual([b.supplierId]);
  });

  it("traite l'achat d'un autre artisan comme inexistant", async () => {
    jetonCourant = a.jeton;
    expect(await lireAchat(b.purchaseId)).toBeNull();
    expect(await lireAchat(a.purchaseId)).not.toBeNull();
  });

  it("ne liste que ses propres achats", async () => {
    jetonCourant = a.jeton;
    expect((await listerAchats()).map((x) => x.id)).toEqual([a.purchaseId]);
  });

  /*
   * Le prix d'achat d'un concurrent est une donnée commercialement sensible :
   * la fuite serait bien plus grave qu'un simple identifiant.
   */
  it("ne laisse voir ni le stock ni le prix d'achat d'un autre artisan", async () => {
    jetonCourant = a.jeton;
    expect(await stockArticle(b.productId)).toBeNull();
    expect(await stockArticle(a.productId)).toBe(10000);

    const stock = await listerStock();
    expect(stock.map((s) => s.id)).toEqual([a.productId]);
    expect(await listerMouvements(b.productId)).toHaveLength(0);
  });

  it("refuse de bouger le stock d'un autre artisan", async () => {
    jetonCourant = a.jeton;
    const resultat = await enregistrerMouvement({}, formulaire({ productId: b.productId, quantite: "5", type: "SORTIE_CHANTIER" }));
    expect(resultat.erreur).toBeTruthy();

    // Le stock de B est intact.
    jetonCourant = b.jeton;
    expect(await stockArticle(b.productId)).toBe(10000);
  });

  it("accepte une sortie qui rend le stock négatif, sans la bloquer", async () => {
    jetonCourant = a.jeton;
    const resultat = await enregistrerMouvement({}, formulaire({ productId: a.productId, quantite: "15", type: "SORTIE_CHANTIER" }));
    expect(resultat.succes).toBeTruthy();
    expect(await stockArticle(a.productId)).toBe(-5000);
  });

  /*
   * §57 : une correction s'AJOUTE, elle ne réécrit rien. On doit pouvoir lire
   * plus tard « il manquait 5 unités », pas découvrir un passé modifié.
   */
  it("corrige par un mouvement d'écart, sans toucher à l'historique", async () => {
    jetonCourant = a.jeton;
    const avant = await listerMouvements(a.productId);

    const resultat = await corrigerStock({}, formulaire({ productId: a.productId, compte: "3" }));
    expect(resultat.succes).toBeTruthy();
    expect(await stockArticle(a.productId)).toBe(3000);

    const apres = await listerMouvements(a.productId);
    expect(apres.length).toBe(avant.length + 1);

    // Les mouvements antérieurs sont inchangés, à l'identique.
    const anciensApres = apres.filter((m) => avant.some((v) => v.id === m.id));
    for (const ancien of avant) {
      const correspondant = anciensApres.find((m) => m.id === ancien.id);
      expect(correspondant?.quantiteMilli).toBe(ancien.quantiteMilli);
      expect(correspondant?.type).toBe(ancien.type);
    }

    const ecart = apres.find((m) => m.type === "CORRECTION_COMPTAGE");
    expect(ecart?.quantiteMilli).toBe(8000); // de -5 à +3
  });

  it("refuse de corriger le stock d'un autre artisan", async () => {
    jetonCourant = a.jeton;
    const resultat = await corrigerStock({}, formulaire({ productId: b.productId, compte: "99" }));
    expect(resultat.erreur).toBeTruthy();

    jetonCourant = b.jeton;
    expect(await stockArticle(b.productId)).toBe(10000);
  });

  it("ne signale rien pour une référence non suivie", async () => {
    jetonCourant = a.jeton;
    await prisma.product.updateMany({
      where: { id: a.productId, organizationId: a.organizationId },
      data: { suiviStock: false },
    });
    expect(await listerStock()).toHaveLength(0);

    await prisma.product.updateMany({
      where: { id: a.productId, organizationId: a.organizationId },
      data: { suiviStock: true },
    });
  });
});

function formulaire(champs: Record<string, string>): FormData {
  const donnees = new FormData();
  for (const [cle, valeur] of Object.entries(champs)) donnees.set(cle, valeur);
  return donnees;
}
