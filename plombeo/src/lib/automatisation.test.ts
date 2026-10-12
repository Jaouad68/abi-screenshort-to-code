import { describe, expect, it } from "vitest";
import {
  DELAI_MIN_ENTRE_RELANCES_JOURS,
  MAX_RELANCES,
  cleIdempotence,
  dansFenetreEnvoi,
  joursEcoules,
  MODELES_PAR_DEFAUT,
  relanceAutorisee,
  remplir,
} from "@/lib/automatisation";
import { adressePlausible } from "@/lib/email";

/**
 * GARDE-FOUS D'AUTOMATISATION (Phase 7).
 *
 * Le §84 identifie les « automatisations mal calibrées (relances trop
 * agressives) » comme un risque majeur. Une garantie qu'on ne peut pas tester
 * exhaustivement n'en est pas une : tout ce qui protège la relation client de
 * l'artisan est vérifié ici.
 */

/* -------------------------------------------------------------------------- */

describe("clé d'idempotence", () => {
  it("est déterministe", () => {
    expect(cleIdempotence("FACTURE_ECHUE", "cm1", 7)).toBe(
      cleIdempotence("FACTURE_ECHUE", "cm1", 7),
    );
  });

  /*
   * Discriminante sur les TROIS composantes : c'est ce qui distingue deux
   * échéances légitimes du même échéancier d'une double relance.
   */
  it("distingue déclencheur, entité et occurrence", () => {
    const base = cleIdempotence("FACTURE_ECHUE", "cm1", 7);
    expect(cleIdempotence("DEVIS_SANS_REPONSE", "cm1", 7)).not.toBe(base);
    expect(cleIdempotence("FACTURE_ECHUE", "cm2", 7)).not.toBe(base);
    expect(cleIdempotence("FACTURE_ECHUE", "cm1", 14)).not.toBe(base);
  });

  it("ne confond pas deux entités dont les identifiants se ressemblent", () => {
    expect(cleIdempotence("FACTURE_ECHUE", "cm1", 17)).not.toBe(
      cleIdempotence("FACTURE_ECHUE", "cm1:1", 7),
    );
  });
});

/* -------------------------------------------------------------------------- */

describe("fenêtre d'envoi", () => {
  // 2026-08-10 est un lundi.
  const lundi = (h: number) => new Date(2026, 7, 10, h, 0, 0);

  it("accepte les heures ouvrables en semaine", () => {
    expect(dansFenetreEnvoi(lundi(8))).toBe(true);
    expect(dansFenetreEnvoi(lundi(12))).toBe(true);
    expect(dansFenetreEnvoi(lundi(19))).toBe(true);
  });

  /*
   * Un e-mail de relance un dimanche à 6 h abîme une relation que l'artisan a
   * mis des années à construire.
   */
  it("refuse la nuit", () => {
    expect(dansFenetreEnvoi(lundi(7))).toBe(false);
    expect(dansFenetreEnvoi(lundi(20))).toBe(false);
    expect(dansFenetreEnvoi(lundi(3))).toBe(false);
  });

  it("refuse le week-end, même en pleine journée", () => {
    expect(dansFenetreEnvoi(new Date(2026, 7, 15, 14, 0))).toBe(false); // samedi
    expect(dansFenetreEnvoi(new Date(2026, 7, 16, 14, 0))).toBe(false); // dimanche
  });
});

describe("jours écoulés", () => {
  it("compte des jours entiers", () => {
    const a = new Date(2026, 7, 1, 10, 0);
    expect(joursEcoules(a, new Date(2026, 7, 8, 10, 0))).toBe(7);
    // 6 j et 23 h ne font pas 7 jours : le seuil ne se franchit pas en avance.
    expect(joursEcoules(a, new Date(2026, 7, 8, 9, 0))).toBe(6);
  });
});

/* -------------------------------------------------------------------------- */

describe("éligibilité d'une relance", () => {
  // Lundi 10 août 2026, 10 h : dans la fenêtre d'envoi.
  const maintenant = new Date(2026, 7, 10, 10, 0);
  const echeance = new Date(2026, 6, 20, 10, 0); // 21 jours plus tôt

  const facture = {
    resteCents: 18000,
    dateEcheance: echeance as Date | null,
    clientRelancesDesactivees: false,
    clientEmail: "client@exemple.fr",
    relancesDejaEnvoyees: 0,
    derniereRelanceLe: null as Date | null,
  };

  it("autorise une facture échue et impayée", () => {
    expect(relanceAutorisee(facture, 7, maintenant).eligible).toBe(true);
  });

  /*
   * LE contrôle le plus important : relancer un client qui a déjà payé est la
   * faute qui coûte le plus cher en confiance. Il passe donc en tête, avant
   * même le contrôle d'échéance.
   */
  it("s'arrête dès que la facture est soldée", () => {
    const soldee = relanceAutorisee({ ...facture, resteCents: 0 }, 7, maintenant);
    expect(soldee.eligible).toBe(false);
    if (!soldee.eligible) expect(soldee.motif).toContain("soldée");

    // Y compris en cas de trop-perçu.
    expect(relanceAutorisee({ ...facture, resteCents: -500 }, 7, maintenant).eligible).toBe(false);
  });

  it("respecte le plafond de relances", () => {
    expect(
      relanceAutorisee({ ...facture, relancesDejaEnvoyees: MAX_RELANCES - 1 }, 7, maintenant)
        .eligible,
    ).toBe(true);

    const plafond = relanceAutorisee(
      { ...facture, relancesDejaEnvoyees: MAX_RELANCES },
      7,
      maintenant,
    );
    expect(plafond.eligible).toBe(false);
    if (!plafond.eligible) expect(plafond.motif).toContain("téléphone");
  });

  it("respecte le délai minimum entre deux relances", () => {
    const recente = new Date(maintenant.getTime() - 3 * 24 * 3600 * 1000);
    const trop = relanceAutorisee({ ...facture, derniereRelanceLe: recente }, 7, maintenant);
    expect(trop.eligible).toBe(false);

    const ancienne = new Date(
      maintenant.getTime() - (DELAI_MIN_ENTRE_RELANCES_JOURS + 1) * 24 * 3600 * 1000,
    );
    expect(relanceAutorisee({ ...facture, derniereRelanceLe: ancienne }, 7, maintenant).eligible)
      .toBe(true);
  });

  it("respecte l'exclusion d'un client", () => {
    const exclu = relanceAutorisee({ ...facture, clientRelancesDesactivees: true }, 7, maintenant);
    expect(exclu.eligible).toBe(false);
    if (!exclu.eligible) expect(exclu.motif).toContain("désactivées");
  });

  it("refuse sans adresse e-mail, en le disant", () => {
    const sansEmail = relanceAutorisee({ ...facture, clientEmail: "   " }, 7, maintenant);
    expect(sansEmail.eligible).toBe(false);
    if (!sansEmail.eligible) expect(sansEmail.motif).toContain("e-mail");
  });

  it("attend que le délai de la règle soit atteint", () => {
    // Échéance dépassée de 21 j : une règle à 30 j n'a pas encore lieu d'être.
    expect(relanceAutorisee(facture, 30, maintenant).eligible).toBe(false);
    expect(relanceAutorisee(facture, 21, maintenant).eligible).toBe(true);
  });

  it("refuse une facture sans échéance plutôt que d'en inventer une", () => {
    expect(relanceAutorisee({ ...facture, dateEcheance: null }, 7, maintenant).eligible).toBe(false);
  });

  it("n'envoie rien hors de la fenêtre", () => {
    const dimanche = new Date(2026, 7, 16, 10, 0);
    const nuit = new Date(2026, 7, 10, 5, 0);
    expect(relanceAutorisee(facture, 7, dimanche).eligible).toBe(false);
    expect(relanceAutorisee(facture, 7, nuit).eligible).toBe(false);
  });

  it("donne toujours un motif lisible en cas de refus", () => {
    const refus = relanceAutorisee({ ...facture, resteCents: 0 }, 7, maintenant);
    expect(refus.eligible).toBe(false);
    if (!refus.eligible) {
      expect(refus.motif.length).toBeGreaterThan(5);
      // Un motif destiné à l'artisan : pas de nom technique.
      expect(refus.motif).not.toMatch(/undefined|null|Error/);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe("modèles de message", () => {
  it("remplace les variables connues", () => {
    expect(remplir("Bonjour {{client}}, {{montant}}.", { client: "Anne", montant: "180,00 €" }))
      .toBe("Bonjour Anne, 180,00 €.");
  });

  /*
   * Une variable inconnue reste VISIBLE : un artisan qui se trompe de nom doit
   * le voir dans son aperçu, pas découvrir un trou dans l'e-mail reçu par son
   * client.
   */
  it("laisse une variable inconnue telle quelle", () => {
    expect(remplir("Bonjour {{clientt}}.", { client: "Anne" })).toBe("Bonjour {{clientt}}.");
  });

  it("n'invente aucune notion juridique dans les textes par défaut", () => {
    // [À VÉRIFIER — SOURCE OFFICIELLE] : intérêts de retard, indemnité
    // forfaitaire et mise en demeure ont un régime précis. Un texte par défaut
    // donnerait à l'artisan un faux sentiment de couverture (§15, §54).
    const interdits = [
      /int[ée]r[êe]ts? de retard/i,
      /indemnit[ée] forfaitaire/i,
      /mise en demeure/i,
      /p[ée]nalit[ée]s?/i,
      /contentieux/i,
      /recouvrement/i,
      /huissier/i,
    ];

    for (const [cle, modele] of Object.entries(MODELES_PAR_DEFAUT)) {
      const texte = `${modele.sujet}\n${modele.corps}`;
      for (const motif of interdits) {
        expect(motif.test(texte), `${cle} contient ${motif}`).toBe(false);
      }
    }
  });

  it("propose un modèle pour chaque usage livré", () => {
    for (const cle of ["relance_facture", "envoi_devis", "envoi_facture"]) {
      expect(MODELES_PAR_DEFAUT[cle]).toBeDefined();
    }
  });

  /*
   * Le ton compte autant que le fond : une relance qui accuse un client ayant
   * déjà payé est un incident commercial.
   */
  it("laisse au client le bénéfice du doute", () => {
    expect(MODELES_PAR_DEFAUT["relance_facture"]!.corps).toContain("Sauf erreur");
  });
});

/* -------------------------------------------------------------------------- */

describe("plausibilité d'une adresse", () => {
  it("accepte des adresses ordinaires", () => {
    for (const a of ["anne@exemple.fr", "a.b+c@sous.domaine.co.uk"]) {
      expect(adressePlausible(a)).toBe(true);
    }
  });

  it("écarte ce qui ne peut manifestement pas être une adresse", () => {
    for (const a of ["", "   ", "anne", "anne@", "@exemple.fr", "anne@exemple", "a b@c.fr", "a@b.c@d.fr"]) {
      expect(adressePlausible(a), a).toBe(false);
    }
  });
});
