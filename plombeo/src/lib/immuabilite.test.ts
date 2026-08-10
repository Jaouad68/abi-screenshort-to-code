import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hacherJeton, signerSession } from "@/lib/session";

/**
 * IMMUABILITÉ DE LA FACTURE ÉMISE (Phase 5).
 *
 * Le risque identifié en Phase 0 pour cette phase est « facture émise éditable
 * par erreur ». Ces tests exercent les Server Actions RÉELLES avec des données
 * forgées — c'est-à-dire exactement ce que ferait quelqu'un qui contournerait
 * l'interface.
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
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { prisma } = await import("@/lib/prisma");
const { verifierIntegrite, calculerSolde, totalTtc } = await import("@/lib/facturation");
const {
  ajouterLigneFacture,
  emettreFacture,
  enregistrerPaiement,
  creerAvoir,
  modifierEnteteFacture,
  supprimerLigneFacture,
} = await import("@/app/app/factures/actions");
const { supprimerClient } = await import("@/app/app/clients/actions");

const suffixe = `imm-${Date.now()}`;

function form(champs: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.set(k, v);
  return f;
}

type Artisan = { organizationId: string; jeton: string; clientId: string };

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
  return { organizationId: organisation.id, jeton, clientId: client.id };
}

/** Crée une facture avec une ligne à 150,00 € HT (TVA 20 %). */
async function creerFactureAvecLigne(a: Artisan): Promise<string> {
  const facture = await prisma.invoice.create({
    data: {
      clientId: a.clientId,
      objet: "Travaux",
      organizationId: a.organizationId,
      lignes: {
        create: {
          libelle: "Main-d'œuvre",
          quantiteMilli: 2500,
          prixUnitaireCents: 6000,
          tauxTvaCentiemes: 2000,
          ordre: 0,
          organizationId: a.organizationId,
        },
      },
    },
    select: { id: true },
  });
  return facture.id;
}

decrire("immuabilité de la facture émise", () => {
  let a: Artisan;
  let b: Artisan;

  beforeAll(async () => {
    a = await creerArtisan("ImmA");
    b = await creerArtisan("ImmB");
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { nom: { contains: suffixe } } });
    await prisma.user.deleteMany({ where: { email: { contains: suffixe } } });
    await prisma.$disconnect();
  });

  it("émet une facture : numéro, totaux figés et empreinte", async () => {
    jetonCourant = a.jeton;
    const id = await creerFactureAvecLigne(a);

    await expect(emettreFacture(form({ id }))).rejects.toBeInstanceOf(RedirectionAppelee);

    const facture = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true, lignes: true },
    });
    expect(facture?.statut).toBe("EMISE");
    expect(facture?.numero).toMatch(/^FAC-\d{4}-\d{3}$/);
    // 2,5 h × 60,00 € = 150,00 € HT, TVA 20 % = 30,00 €, TTC = 180,00 €
    expect(facture?.totalHtCents).toBe(15000);
    expect(facture?.totalTvaCents).toBe(3000);
    expect(facture?.totalTtcCents).toBe(18000);
    expect(facture?.empreinte).toMatch(/^[0-9a-f]{64}$/);
    expect(verifierIntegrite(facture!)).toBe(true);
  });

  /*
   * LE test de la phase. L'action est appelée directement avec des données
   * forgées — exactement ce que ferait quelqu'un qui contourne l'interface.
   * Aucune écriture ne doit aboutir.
   */
  it("refuse toute modification d'une facture émise, même par action forgée", async () => {
    jetonCourant = a.jeton;
    const id = await creerFactureAvecLigne(a);
    await expect(emettreFacture(form({ id }))).rejects.toBeInstanceOf(RedirectionAppelee);

    const avant = await prisma.invoice.findUnique({
      where: { id },
      include: { lignes: true },
    });

    // Ajout de ligne
    const ajout = await ajouterLigneFacture(
      {},
      form({ invoiceId: id, libelle: "Ligne pirate", quantite: "1", prix: "999,00", tauxTva: "2000" }),
    );
    expect(ajout.erreur).toContain("émise");

    // Modification d'en-tête
    const entete = await modifierEnteteFacture({}, form({ id, objet: "Objet modifié" }));
    expect(entete.erreur).toContain("émise");

    // Suppression de ligne
    await supprimerLigneFacture(form({ id: avant!.lignes[0]!.id, invoiceId: id }));

    const apres = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true, lignes: true },
    });

    expect(apres?.lignes).toHaveLength(1);
    expect(apres?.objet).toBe("Travaux");
    expect(apres?.totalTtcCents).toBe(18000);
    // L'empreinte reste valide : rien n'a bougé.
    expect(verifierIntegrite(apres!)).toBe(true);
  });

  /*
   * Les totaux sont FIGÉS : même si les lignes étaient altérées directement en
   * base, la facture continuerait d'afficher ce qu'elle affichait à l'émission
   * — et l'empreinte signalerait l'altération.
   */
  it("garde ses totaux figés et détecte une altération directe en base", async () => {
    jetonCourant = a.jeton;
    const id = await creerFactureAvecLigne(a);
    await expect(emettreFacture(form({ id }))).rejects.toBeInstanceOf(RedirectionAppelee);

    // Altération hors application, comme le ferait un accès direct à la base.
    await prisma.invoiceLine.updateMany({
      where: { invoiceId: id },
      data: { prixUnitaireCents: 1 },
    });

    const facture = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true, lignes: true },
    });

    // Le total affiché ne bouge pas : il est figé.
    expect(totalTtc(facture!)).toBe(18000);
    // Mais l'empreinte ne correspond plus : l'altération est DÉTECTÉE.
    expect(verifierIntegrite(facture!)).toBe(false);
  });

  it("refuse d'encaisser sur un brouillon", async () => {
    jetonCourant = a.jeton;
    const id = await creerFactureAvecLigne(a);

    const resultat = await enregistrerPaiement({}, form({ invoiceId: id, montant: "50,00" }));
    expect(resultat.erreur).toContain("Émettez la facture");
    expect(await prisma.payment.count({ where: { invoiceId: id } })).toBe(0);
  });

  it("suit les paiements partiels puis le solde", async () => {
    jetonCourant = a.jeton;
    const id = await creerFactureAvecLigne(a);
    await expect(emettreFacture(form({ id }))).rejects.toBeInstanceOf(RedirectionAppelee);

    await enregistrerPaiement({}, form({ invoiceId: id, montant: "80,00", moyen: "VIREMENT" }));
    let facture = await prisma.invoice.findUnique({ where: { id } });
    expect(facture?.statut).toBe("PARTIELLEMENT_PAYEE");

    await enregistrerPaiement({}, form({ invoiceId: id, montant: "100,00", moyen: "CHEQUE" }));
    facture = await prisma.invoice.findUnique({ where: { id } });
    expect(facture?.statut).toBe("PAYEE");
  });

  it("réduit le montant dû par un avoir, sans toucher à la facture", async () => {
    jetonCourant = a.jeton;
    const id = await creerFactureAvecLigne(a);
    await expect(emettreFacture(form({ id }))).rejects.toBeInstanceOf(RedirectionAppelee);

    const resultat = await creerAvoir({}, form({ invoiceId: id, montant: "30,00", motif: "Geste commercial" }));
    expect(resultat.succes).toContain("AV-");

    const facture = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true, lignes: true, paiements: true, avoirs: true },
    });

    // La facture d'origine est INTACTE.
    expect(facture?.totalTtcCents).toBe(18000);
    expect(verifierIntegrite(facture!)).toBe(true);

    // Seul le montant dû baisse.
    const solde = calculerSolde(totalTtc(facture!), facture!.paiements, facture!.avoirs);
    expect(solde.duCents).toBe(15000);
  });

  it("refuse un avoir supérieur au montant dû", async () => {
    jetonCourant = a.jeton;
    const id = await creerFactureAvecLigne(a);
    await expect(emettreFacture(form({ id }))).rejects.toBeInstanceOf(RedirectionAppelee);

    const resultat = await creerAvoir({}, form({ invoiceId: id, montant: "500,00" }));
    expect(resultat.erreur).toContain("dépasser");
    expect(await prisma.creditNote.count({ where: { invoiceId: id } })).toBe(0);
  });

  it("refuse d'écrire dans la facture d'un autre artisan", async () => {
    const id = await creerFactureAvecLigne(b);
    // On agit depuis la session de A sur la facture de B.
    jetonCourant = a.jeton;

    const ajout = await ajouterLigneFacture(
      {},
      form({ invoiceId: id, libelle: "Pirate", quantite: "1", prix: "10,00", tauxTva: "2000" }),
    );
    expect(ajout.erreur).toBeTruthy();
    expect(await prisma.invoiceLine.count({ where: { invoiceId: id } })).toBe(1);
  });

  /*
   * Réserve inscrite en Phase 2, honorée ici : un client porteur de pièces
   * comptables ne peut plus être supprimé.
   */
  it("refuse de supprimer un client porteur d'une facture émise", async () => {
    jetonCourant = a.jeton;
    const client = await prisma.client.create({
      data: { nomAffichage: `AvecFacture ${suffixe}`, organizationId: a.organizationId },
    });
    const facture = await prisma.invoice.create({
      data: { clientId: client.id, organizationId: a.organizationId },
      select: { id: true },
    });
    await prisma.invoiceLine.create({
      data: {
        libelle: "Prestation",
        quantiteMilli: 1000,
        prixUnitaireCents: 10000,
        invoiceId: facture.id,
        organizationId: a.organizationId,
      },
    });
    await expect(emettreFacture(form({ id: facture.id }))).rejects.toBeInstanceOf(RedirectionAppelee);

    const resultat = await supprimerClient(
      {},
      form({ id: client.id, confirmation: `AvecFacture ${suffixe}` }),
    );
    expect(resultat.erreur).toContain("conservées");
    expect(await prisma.client.count({ where: { id: client.id } })).toBe(1);
  });
});
