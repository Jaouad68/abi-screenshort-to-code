import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * MOTEUR DE RELANCES — intégration (Phase 7).
 *
 * Le risque de cette phase est la DOUBLE RELANCE : un client relancé deux fois
 * pour la même facture, c'est la confiance de l'artisan perdue d'un coup. Ces
 * tests exercent le moteur contre une vraie base, parce que la garantie repose
 * sur une contrainte d'unicité en base — pas sur du code applicatif.
 *
 * Validation par mutation : retirer `@unique` sur `cleIdempotence`, ou déplacer
 * la réservation après l'envoi, doit faire échouer ces tests.
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
const { balayer, viderFileEmails } = await import("@/lib/moteur");

const suffixe = `relance-${Date.now()}`;

/** Lundi 10 août 2026, 10 h : dans la fenêtre d'envoi. */
const MAINTENANT = new Date(2026, 7, 10, 10, 0);
/** 30 jours plus tôt. */
const ECHEANCE = new Date(2026, 6, 11, 10, 0);

type Jeu = { organizationId: string; clientId: string; factureId: string; ruleId: string };

async function creerJeu(nom: string, options: { email?: string } = {}): Promise<Jeu> {
  const organisation = await prisma.organization.create({ data: { nom: `${nom} ${suffixe}` } });

  const client = await prisma.client.create({
    data: {
      nomAffichage: `Client ${nom}`,
      nom: `Client ${nom}`,
      email: options.email ?? `client-${nom.toLowerCase()}-${suffixe}@exemple.fr`,
      organizationId: organisation.id,
    },
  });

  const facture = await prisma.invoice.create({
    data: {
      numero: `FAC-2026-${nom === "Alpha" ? "001" : "002"}`,
      statut: "EMISE",
      dateFacture: new Date(2026, 6, 1),
      dateEcheance: ECHEANCE,
      totalHtCents: 15000,
      totalTvaCents: 3000,
      totalTtcCents: 18000,
      clientId: client.id,
      organizationId: organisation.id,
      lignes: {
        create: {
          libelle: "Main-d'œuvre",
          quantiteMilli: 2500,
          unite: "h",
          prixUnitaireCents: 6000,
          tauxTvaCentiemes: 2000,
          ordre: 0,
          organizationId: organisation.id,
        },
      },
    },
  });

  const regle = await prisma.automationRule.create({
    data: {
      active: true,
      declencheur: "FACTURE_ECHUE",
      action: "ENVOYER_EMAIL",
      delaiJours: 7,
      libelle: "Relance à 7 jours",
      organizationId: organisation.id,
    },
  });

  return {
    organizationId: organisation.id,
    clientId: client.id,
    factureId: facture.id,
    ruleId: regle.id,
  };
}

async function nettoyer() {
  await prisma.organization.deleteMany({ where: { nom: { contains: suffixe } } });
}

decrire("moteur de relances", () => {
  beforeEach(nettoyer);

  afterAll(async () => {
    await nettoyer();
    await prisma.$disconnect();
  });

  /*
   * LE test de cette phase. Le cron peut se rejouer — redémarrage, double
   * déclenchement, rattrapage de retard. Deux passages ne doivent produire
   * qu'une seule relance.
   */
  it("ne relance qu'une fois, même après plusieurs balayages", async () => {
    const a = await creerJeu("Alpha");

    const premier = await balayer(MAINTENANT, a.organizationId);
    expect(premier.executions).toBe(1);
    expect(premier.emailsEnFile).toBe(1);

    // Trois passages supplémentaires, comme un cron qui se rejoue.
    await balayer(MAINTENANT, a.organizationId);
    await balayer(new Date(MAINTENANT.getTime() + 3600_000), a.organizationId);
    const dernier = await balayer(new Date(MAINTENANT.getTime() + 7200_000), a.organizationId);
    expect(dernier.executions).toBe(0);

    const executions = await prisma.automationExecution.count({
      where: { organizationId: a.organizationId, entiteId: a.factureId, etat: "REUSSIE" },
    });
    expect(executions).toBe(1);

    const emails = await prisma.emailMessage.count({ where: { organizationId: a.organizationId } });
    expect(emails).toBe(1);
  });

  /*
   * Le test précédent est rattrapé par le DÉLAI MINIMUM : deux balayages
   * rapprochés sont écartés avant même d'atteindre la clé. Ici, les deux
   * balayages sont séparés de 30 jours, donc TOUS les garde-fous applicatifs
   * sont franchis — plafond non atteint, délai minimum dépassé, échéance
   * largement dépassée. Seule la contrainte d'unicité en base empêche encore la
   * seconde relance.
   *
   * C'est le test qui valide réellement le mécanisme d'idempotence : retirer
   * `@unique` sur `cleIdempotence` le fait échouer.
   */
  it("ne rejoue pas une occurrence déjà traitée, même longtemps après", async () => {
    const a = await creerJeu("Alpha");

    expect((await balayer(MAINTENANT, a.organizationId)).executions).toBe(1);

    // 30 jours plus tard : plus aucun garde-fou applicatif ne s'oppose.
    const bienPlusTard = new Date(2026, 8, 9, 10, 0);
    const second = await balayer(bienPlusTard, a.organizationId);
    expect(second.executions).toBe(0);

    expect(
      await prisma.automationExecution.count({
        where: { organizationId: a.organizationId, etat: "REUSSIE" },
      }),
    ).toBe(1);
    expect(await prisma.emailMessage.count({ where: { organizationId: a.organizationId } })).toBe(1);
  });

  /*
   * L'arbitrage se fait bien EN BASE, et non par une lecture préalable : deux
   * insertions de la même clé, la seconde doit être rejetée.
   *
   * Ce test remplace une tentative de balayages concurrents via `Promise.all`,
   * qui passait aussi bien avec que sans la contrainte — les appels se
   * sérialisaient. Un test incapable d'échouer donne une fausse assurance ;
   * mieux vaut viser directement le mécanisme.
   */
  it("rejette en base une clé d'idempotence déjà utilisée", async () => {
    const a = await creerJeu("Alpha");
    const cle = `FACTURE_ECHUE:${a.factureId}:7`;

    const ligne = {
      cleIdempotence: cle,
      ruleId: a.ruleId,
      organizationId: a.organizationId,
      entiteType: "Invoice",
      entiteId: a.factureId,
      etat: "REUSSIE" as const,
    };

    await prisma.automationExecution.create({ data: ligne });
    await expect(prisma.automationExecution.create({ data: ligne })).rejects.toThrow();

    expect(
      await prisma.automationExecution.count({ where: { cleIdempotence: cle } }),
    ).toBe(1);
  });

  /*
   * Relancer quelqu'un qui a payé est la faute la plus coûteuse du module.
   */
  it("n'envoie rien si la facture est déjà soldée", async () => {
    const a = await creerJeu("Alpha");
    await prisma.payment.create({
      data: {
        montantCents: 18000,
        moyen: "VIREMENT",
        datePaiement: new Date(2026, 6, 15),
        invoiceId: a.factureId,
        organizationId: a.organizationId,
      },
    });

    const bilan = await balayer(MAINTENANT, a.organizationId);
    expect(bilan.executions).toBe(0);
    expect(await prisma.emailMessage.count({ where: { organizationId: a.organizationId } })).toBe(0);

    // L'écart est TRACÉ, avec son motif : une automatisation muette est
    // indiscernable d'une automatisation en panne.
    const ecartee = await prisma.automationExecution.findFirst({
      where: { organizationId: a.organizationId, etat: "ECARTEE" },
    });
    expect(ecartee?.motif).toContain("soldée");
  });

  it("s'arrête dès qu'un paiement intervient entre deux relances", async () => {
    const a = await creerJeu("Alpha");

    await prisma.automationRule.create({
      data: {
        active: true,
        declencheur: "FACTURE_ECHUE",
        action: "ENVOYER_EMAIL",
        delaiJours: 21,
        organizationId: a.organizationId,
      },
    });

    // Première relance (règle à 7 j).
    const premier = await balayer(MAINTENANT, a.organizationId);
    expect(premier.executions).toBeGreaterThanOrEqual(1);

    await prisma.payment.create({
      data: {
        montantCents: 18000,
        moyen: "CHEQUE",
        datePaiement: MAINTENANT,
        invoiceId: a.factureId,
        organizationId: a.organizationId,
      },
    });

    // Bien après le délai minimum : sans le paiement, la règle à 21 j
    // partirait.
    const plusTard = new Date(2026, 7, 24, 10, 0);
    const second = await balayer(plusTard, a.organizationId);
    expect(second.executions).toBe(0);
  });

  it("respecte le délai minimum entre deux relances", async () => {
    const a = await creerJeu("Alpha");
    await prisma.automationRule.create({
      data: {
        active: true,
        declencheur: "FACTURE_ECHUE",
        action: "NOTIFIER",
        delaiJours: 8,
        organizationId: a.organizationId,
      },
    });

    // Les deux règles sont éligibles le même jour ; seule la première passe.
    const bilan = await balayer(MAINTENANT, a.organizationId);
    expect(bilan.executions).toBe(1);
  });

  it("écarte un client exclu des relances, en le disant", async () => {
    const a = await creerJeu("Alpha");
    await prisma.client.update({
      where: { id: a.clientId },
      data: { relancesDesactivees: true },
    });

    const bilan = await balayer(MAINTENANT, a.organizationId);
    expect(bilan.executions).toBe(0);

    const ecartee = await prisma.automationExecution.findFirst({
      where: { organizationId: a.organizationId, etat: "ECARTEE" },
    });
    expect(ecartee?.motif).toContain("désactivées");
  });

  it("écarte un client sans adresse e-mail, en le disant", async () => {
    const a = await creerJeu("Alpha", { email: "" });
    await balayer(MAINTENANT, a.organizationId);

    const ecartee = await prisma.automationExecution.findFirst({
      where: { organizationId: a.organizationId, etat: "ECARTEE" },
    });
    expect(ecartee?.motif).toContain("e-mail");
  });

  it("n'envoie rien la nuit ni le week-end, sans figer la décision", async () => {
    const a = await creerJeu("Alpha");

    const dimanche = new Date(2026, 7, 16, 10, 0);
    expect((await balayer(dimanche, a.organizationId)).executions).toBe(0);
    // Rien n'est tracé : le motif est temporaire, le figer bloquerait l'envoi
    // pour toujours.
    expect(
      await prisma.automationExecution.count({ where: { organizationId: a.organizationId } }),
    ).toBe(0);

    // Le lundi suivant, la relance part.
    expect((await balayer(new Date(2026, 7, 17, 10, 0), a.organizationId)).executions).toBe(1);
  });

  it("ne fait rien tant qu'aucune règle n'est active", async () => {
    const a = await creerJeu("Alpha");
    await prisma.automationRule.update({ where: { id: a.ruleId }, data: { active: false } });

    const bilan = await balayer(MAINTENANT, a.organizationId);
    expect(bilan.reglesEvaluees).toBe(0);
    expect(bilan.executions).toBe(0);
    expect(
      await prisma.automationExecution.count({ where: { organizationId: a.organizationId } }),
    ).toBe(0);
  });

  /*
   * Le balayage est la seule fonction du projet qui traverse les organisations.
   * Elle doit produire des effets STRICTEMENT rattachés à la bonne.
   */
  it("ne mélange jamais deux artisans", async () => {
    const a = await creerJeu("Alpha");
    const b = await creerJeu("Beta");

    // Sans filtre : c'est le balayage GLOBAL du cron qui est éprouvé ici.
    await balayer(MAINTENANT);

    for (const [jeu, autre] of [
      [a, b],
      [b, a],
    ] as const) {
      const executions = await prisma.automationExecution.findMany({
        where: { organizationId: jeu.organizationId },
      });
      expect(executions).toHaveLength(1);
      expect(executions[0]!.entiteId).toBe(jeu.factureId);
      expect(executions[0]!.entiteId).not.toBe(autre.factureId);

      const emails = await prisma.emailMessage.findMany({
        where: { organizationId: jeu.organizationId },
      });
      expect(emails).toHaveLength(1);
      // L'e-mail de A ne part jamais au client de B.
      expect(emails[0]!.destinataire).toContain(jeu === a ? "alpha" : "beta");

      const notifications = await prisma.notification.count({
        where: { organizationId: jeu.organizationId },
      });
      expect(notifications).toBe(1);
    }
  });

  it("désactiver la règle d'un artisan n'affecte pas celle de l'autre", async () => {
    const a = await creerJeu("Alpha");
    const b = await creerJeu("Beta");
    await prisma.automationRule.update({ where: { id: a.ruleId }, data: { active: false } });

    await balayer(MAINTENANT);

    expect(
      await prisma.automationExecution.count({ where: { organizationId: a.organizationId } }),
    ).toBe(0);
    expect(
      await prisma.automationExecution.count({ where: { organizationId: b.organizationId } }),
    ).toBe(1);
  });

  /*
   * §76 : sans serveur configuré, l'échec doit être VISIBLE. Un e-mail avalé en
   * silence ferait croire à l'artisan que son client a été relancé.
   */
  it("rend l'échec visible quand aucun serveur d'envoi n'est configuré", async () => {
    const a = await creerJeu("Alpha");
    await balayer(MAINTENANT, a.organizationId);

    const avant = await prisma.emailMessage.findFirst({
      where: { organizationId: a.organizationId },
    });
    expect(avant?.etat).toBe("EN_ATTENTE");

    await viderFileEmails(MAINTENANT);

    const apres = await prisma.emailMessage.findFirst({
      where: { organizationId: a.organizationId },
    });
    expect(apres?.etat).toBe("ECHOUE");
    expect(apres?.erreur).toContain("SMTP_HOST");
  });

  it("ne tente aucun envoi hors de la fenêtre", async () => {
    const a = await creerJeu("Alpha");
    await balayer(MAINTENANT, a.organizationId);

    const dimanche = new Date(2026, 7, 16, 10, 0);
    const bilan = await viderFileEmails(dimanche);
    expect(bilan.envoyes).toBe(0);
    expect(bilan.echoues).toBe(0);

    // Le message est TOUJOURS en attente : rien n'a été tenté ni marqué en échec.
    const message = await prisma.emailMessage.findFirst({
      where: { organizationId: a.organizationId },
    });
    expect(message?.etat).toBe("EN_ATTENTE");
    expect(message?.tentatives).toBe(0);
  });
});
