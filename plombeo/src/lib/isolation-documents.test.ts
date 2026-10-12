import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hacherJeton, signerSession } from "@/lib/session";

/**
 * ISOLATION ET INTÉGRITÉ DOCUMENTAIRE (Phase 6).
 *
 * Deux garanties sont vérifiées ici :
 *
 *  1. l'artisan A n'atteint aucune pièce ni signature de l'artisan B, y compris
 *     en connaissant l'identifiant exact — c'est le scénario réaliste, un
 *     identifiant fuitant bien plus facilement qu'un mot de passe ;
 *  2. l'empreinte d'une signature porte sur ce que la BASE contient, jamais sur
 *     un texte fourni par le navigateur.
 *
 * Validation par mutation : retirer `organizationId` du filtre de
 * `lireDocument`, ou reprendre le champ `resume` du formulaire dans
 * `signerIntervention`, doit faire échouer ces tests.
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
  headers: async () => new Headers({ "user-agent": "Vitest/1.0" }),
}));

class RedirectionAppelee extends Error {}
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new RedirectionAppelee();
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { prisma } = await import("@/lib/prisma");
const { listerDocuments, lireDocument, listerSignatures } = await import("@/lib/documents");
const { signerIntervention } = await import("@/app/app/documents/actions");

const suffixe = `doc-${Date.now()}`;

type Artisan = {
  organizationId: string;
  jeton: string;
  clientId: string;
  interventionId: string;
  documentId: string;
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

  const client = await prisma.client.create({
    data: {
      nomAffichage: `Client de ${nom}`,
      nom: `Client de ${nom}`,
      ville: "Lyon",
      organizationId: organisation.id,
    },
  });

  const intervention = await prisma.intervention.create({
    data: {
      statut: "TERMINEE",
      probleme: "Fuite sous évier",
      diagnostic: `Diagnostic de ${nom}`,
      compteRendu: `Travaux de ${nom}`,
      clientId: client.id,
      organizationId: organisation.id,
      temps: { create: { minutes: 45, organizationId: organisation.id } },
      fournitures: {
        create: {
          libelle: "Joint 12mm",
          quantiteMilli: 2000,
          unite: "u",
          organizationId: organisation.id,
        },
      },
    },
  });

  const document = await prisma.document.create({
    data: {
      categorie: "PHOTO",
      moment: "AVANT",
      nomFichier: "chantier.jpg",
      mimeType: "image/jpeg",
      tailleOctets: 1234,
      cheminStockage: `${organisation.id}/abcdef.jpg`,
      legende: "Fuite constatée à Lyon",
      tags: ["chantier"],
      clientId: client.id,
      interventionId: intervention.id,
      organizationId: organisation.id,
    },
  });

  return {
    organizationId: organisation.id,
    jeton,
    clientId: client.id,
    interventionId: intervention.id,
    documentId: document.id,
  };
}

decrire("isolation et intégrité documentaire", () => {
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

  /*
   * Le cœur : l'identifiant de B est parfaitement valide, mais consulté depuis
   * la session de A. La réponse doit être indiscernable d'un identifiant
   * inexistant — sans quoi elle confirmerait l'existence d'une pièce chez un
   * autre artisan. C'est aussi ce que vérifie `/api/documents/[id]`, qui n'a pas
   * d'autre contrôle que celui-ci.
   */
  it("traite la pièce d'un autre artisan comme inexistante", async () => {
    jetonCourant = a.jeton;
    expect(await lireDocument(b.documentId)).toBeNull();
    expect(await lireDocument("identifiant-qui-n-existe-pas")).toBeNull();
    expect(await lireDocument(a.documentId)).not.toBeNull();
  });

  it("ne liste que ses propres pièces, y compris en recherche", async () => {
    jetonCourant = a.jeton;
    expect((await listerDocuments()).map((d) => d.id)).toEqual([a.documentId]);

    // Ces termes décrivent les pièces des DEUX organisations.
    for (const terme of ["chantier", "Lyon", "chantier.jpg", "Fuite"]) {
      const resultats = await listerDocuments({}, terme);
      expect(resultats.every((d) => d.id !== b.documentId)).toBe(true);
    }

    jetonCourant = b.jeton;
    expect((await listerDocuments()).map((d) => d.id)).toEqual([b.documentId]);
  });

  it("ne rattache pas une pièce d'un autre artisan à une intervention", async () => {
    jetonCourant = a.jeton;
    // L'intervention de B existe, mais son dossier reste vide vu depuis A.
    expect(await listerDocuments({ interventionId: b.interventionId })).toHaveLength(0);
    expect(await listerDocuments({ interventionId: a.interventionId })).toHaveLength(1);
  });

  it("refuse de signer l'intervention d'un autre artisan", async () => {
    jetonCourant = a.jeton;
    const resultat = await signerIntervention({}, formulaireSignature(b.interventionId));

    expect(resultat.erreur).toBeTruthy();
    expect(await prisma.signature.count({ where: { interventionId: b.interventionId } })).toBe(0);
  });

  /*
   * Une empreinte calculée sur un texte venu du navigateur n'attesterait que de
   * ce que le client a bien voulu envoyer. Ici on envoie sciemment un résumé
   * mensonger : le serveur doit l'ignorer et figer ce que la base contient.
   */
  it("fige l'empreinte du contenu tel que le serveur le connaît", async () => {
    jetonCourant = a.jeton;

    const donnees = formulaireSignature(a.interventionId);
    donnees.set("resume", "Travaux offerts, aucun montant dû, aucune fourniture");

    const resultat = await signerIntervention({}, donnees);
    expect(resultat.succes).toBeTruthy();

    const [signature] = await listerSignatures(a.interventionId);
    expect(signature).toBeDefined();
    expect(signature!.resumeContenu).toContain("Travaux de Alpha");
    expect(signature!.resumeContenu).toContain("45 minutes");
    expect(signature!.resumeContenu).toContain("Joint 12mm");
    expect(signature!.resumeContenu).not.toContain("Travaux offerts");

    // L'empreinte porte bien sur ce résumé-là.
    const { empreinteContenu } = await import("@/lib/documents");
    expect(signature!.empreinteContenu).toBe(empreinteContenu(signature!.resumeContenu));
  });

  it("ne fait pas remonter la signature de A dans le dossier de B", async () => {
    jetonCourant = b.jeton;
    expect(await listerSignatures(a.interventionId)).toHaveLength(0);
  });

  it("refuse un tracé vide plutôt que d'enregistrer un accord illusoire", async () => {
    jetonCourant = a.jeton;

    const sansTrace = formulaireSignature(a.interventionId);
    sansTrace.set("trace", "");
    expect((await signerIntervention({}, sansTrace)).erreur).toBeTruthy();

    const sansNom = formulaireSignature(a.interventionId);
    sansNom.set("signataireNom", "   ");
    expect((await signerIntervention({}, sansNom)).erreur).toBeTruthy();
  });

  it("n'enregistre aucune adresse IP avec la signature", async () => {
    jetonCourant = a.jeton;
    const signatures = await listerSignatures(a.interventionId);
    for (const s of signatures) {
      expect(s.appareil).not.toMatch(/\d{1,3}(\.\d{1,3}){3}/);
      expect(s.appareil.length).toBeLessThanOrEqual(180);
    }
  });
});

/** Formulaire de signature valide, base de chaque variation. */
function formulaireSignature(interventionId: string): FormData {
  const donnees = new FormData();
  donnees.set("interventionId", interventionId);
  donnees.set("signataireNom", "Madame Dupont");
  donnees.set("trace", `data:image/png;base64,${"A".repeat(300)}`);
  return donnees;
}
