import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hacherJeton, signerSession } from "@/lib/session";
import { transitionDevisAutorisee } from "@/lib/etats";
import { formaterNumeroDevis, dateExpiration, estDepasse } from "@/lib/devis";

/**
 * NUMÉROTATION, ISOLATION ET FIGEAGE DES DEVIS (Phase 4).
 *
 * Un numéro de devis attribué deux fois, ou un devis modifié après émission,
 * sont des défauts qui se voient chez le client. D'où des tests sur base réelle
 * plutôt que sur simulacre.
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
const { attribuerNumero, lireDevis, listerDevis, listerPrestations } = await import("@/lib/devis");

const suffixe = `devis-${Date.now()}`;

type Artisan = { organizationId: string; jeton: string; clientId: string; quoteId: string };

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
  await prisma.service.create({
    data: {
      libelle: `Prestation ${nom}`,
      prixUnitaireCents: 6000,
      organizationId: organisation.id,
    },
  });
  const devis = await prisma.quote.create({
    data: {
      clientId: client.id,
      objet: `Devis ${nom}`,
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
              prixUnitaireCents: 6000,
              tauxTvaCentiemes: 2000,
              organizationId: organisation.id,
            },
          },
        },
      },
    },
    select: { id: true },
  });

  return {
    organizationId: organisation.id,
    jeton,
    clientId: client.id,
    quoteId: devis.id,
  };
}

describe("numérotation — format et validité (fonctions pures)", () => {
  it("formate le numéro sur trois chiffres", () => {
    expect(formaterNumeroDevis(2026, 1)).toBe("DEV-2026-001");
    expect(formaterNumeroDevis(2026, 42)).toBe("DEV-2026-042");
    expect(formaterNumeroDevis(2026, 999)).toBe("DEV-2026-999");
    // Au-delà de 999, on ne tronque pas : mieux vaut un numéro plus long qu'un doublon.
    expect(formaterNumeroDevis(2026, 1000)).toBe("DEV-2026-1000");
  });

  it("calcule la date d'expiration", () => {
    expect(dateExpiration(new Date("2026-03-01T10:00:00Z"), 30).toISOString().slice(0, 10)).toBe(
      "2026-03-31",
    );
  });

  it("ne signale comme dépassé qu'un devis prêt ou envoyé", () => {
    const vieux = { dateDevis: new Date("2020-01-01"), validiteJours: 30 };
    expect(estDepasse({ ...vieux, statut: "ENVOYE" })).toBe(true);
    expect(estDepasse({ ...vieux, statut: "PRET" })).toBe(true);
    // Un brouillon n'expire pas, un devis accepté non plus.
    expect(estDepasse({ ...vieux, statut: "BROUILLON" })).toBe(false);
    expect(estDepasse({ ...vieux, statut: "ACCEPTE" })).toBe(false);
  });
});

describe("machine à états du devis", () => {
  it("suit le chemin nominal", () => {
    expect(transitionDevisAutorisee("BROUILLON", "PRET")).toBe(true);
    expect(transitionDevisAutorisee("PRET", "ENVOYE")).toBe(true);
    expect(transitionDevisAutorisee("ENVOYE", "ACCEPTE")).toBe(true);
  });

  // L'artisan relit son devis prêt, voit une erreur, corrige.
  it("permet de repasser en brouillon tant que le devis n'est pas parti", () => {
    expect(transitionDevisAutorisee("PRET", "BROUILLON")).toBe(true);
    expect(transitionDevisAutorisee("ENVOYE", "BROUILLON")).toBe(false);
  });

  it("interdit de sauter l'étape « prêt »", () => {
    expect(transitionDevisAutorisee("BROUILLON", "ENVOYE")).toBe(false);
    expect(transitionDevisAutorisee("BROUILLON", "ACCEPTE")).toBe(false);
  });

  /*
   * Un devis accepté deviendra facturable (Phase 5) : le rouvrir permettrait de
   * modifier après coup ce qui a été vendu. Une correction passera par un
   * nouveau devis.
   */
  it("fige un devis accepté ou refusé", () => {
    for (const vers of ["BROUILLON", "PRET", "ENVOYE", "ANNULE"] as const) {
      expect(transitionDevisAutorisee("ACCEPTE", vers)).toBe(false);
      expect(transitionDevisAutorisee("REFUSE", vers)).toBe(false);
    }
  });

  // Cas réel : le client revient après la date, l'artisan prolonge son offre.
  it("permet de renvoyer un devis expiré", () => {
    expect(transitionDevisAutorisee("EXPIRE", "ENVOYE")).toBe(true);
  });
});

decrire("numérotation et isolation sur base réelle", () => {
  let a: Artisan;
  let b: Artisan;

  beforeAll(async () => {
    a = await creerArtisan("DevisA");
    b = await creerArtisan("DevisB");
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { nom: { contains: suffixe } } });
    await prisma.user.deleteMany({ where: { email: { contains: suffixe } } });
    await prisma.$disconnect();
  });

  it("attribue des numéros successifs", async () => {
    const premier = await attribuerNumero(a.organizationId, new Date("2026-05-01"));
    const second = await attribuerNumero(a.organizationId, new Date("2026-05-02"));
    expect(premier).toBe("DEV-2026-001");
    expect(second).toBe("DEV-2026-002");
  });

  /*
   * Deux devis passés en « prêt » au même instant ne doivent JAMAIS obtenir le
   * même numéro. Un compteur lu puis réécrit en deux temps produirait des
   * doublons dès la moindre concurrence ; l'incrément atomique en base l'évite.
   */
  it("ne délivre jamais deux fois le même numéro, même en concurrence", async () => {
    const numeros = await Promise.all(
      Array.from({ length: 20 }, () => attribuerNumero(b.organizationId, new Date("2026-05-01"))),
    );
    expect(new Set(numeros).size).toBe(20);
  });

  it("tient une séquence indépendante par organisation et par année", async () => {
    const org = await prisma.organization.create({ data: { nom: `Neuve ${suffixe}` } });
    expect(await attribuerNumero(org.id, new Date("2026-01-15"))).toBe("DEV-2026-001");
    // Chaque année repart à 1.
    expect(await attribuerNumero(org.id, new Date("2027-01-15"))).toBe("DEV-2027-001");
    expect(await attribuerNumero(org.id, new Date("2026-06-15"))).toBe("DEV-2026-002");
  });

  it("ne laisse pas lire le devis d'un autre artisan", async () => {
    jetonCourant = a.jeton;
    expect(await lireDevis(b.quoteId)).toBeNull();
    expect(await lireDevis(a.quoteId)).not.toBeNull();
  });

  it("ne liste que ses propres devis et son propre catalogue", async () => {
    jetonCourant = a.jeton;
    const devis = await listerDevis();
    expect(devis.map((d) => d.id)).toEqual([a.quoteId]);

    const prestations = await listerPrestations();
    expect(prestations).toHaveLength(1);
    expect(prestations[0]?.libelle).toBe("Prestation DevisA");
  });

  it("calcule les totaux du devis listé", async () => {
    jetonCourant = a.jeton;
    const devis = await listerDevis();
    // 2 h × 60,00 € = 120,00 € HT, TVA 20 % = 24,00 €, TTC = 144,00 €
    expect(devis[0]?.totaux.totalHtCents).toBe(12000);
    expect(devis[0]?.totaux.totalTvaCents).toBe(2400);
    expect(devis[0]?.totaux.totalTtcCents).toBe(14400);
  });
});
