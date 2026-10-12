import { describe, expect, it } from "vitest";
import {
  CONSIGNES,
  IA_NON_CONFIGUREE,
  INTERDICTIONS,
  caviarder,
  iaDisponible,
  normaliserLignes,
} from "@/lib/ia";

/**
 * ASSISTANT IA (Phase 11).
 *
 * Le §22 interdit à l'IA de se substituer au diagnostic du plombier. Ces tests
 * rendent cette interdiction VÉRIFIABLE plutôt que déclarative.
 */

describe("garantie §22 : aucun diagnostic, aucun prix", () => {
  /*
   * Toute consigne envoyée au fournisseur porte les interdictions. Ajouter une
   * consigne sans elles fait échouer ce test — c'est là tout son intérêt.
   */
  it("porte les interdictions dans CHAQUE consigne", () => {
    expect(Object.keys(CONSIGNES).length).toBeGreaterThan(0);
    for (const [nom, consigne] of Object.entries(CONSIGNES)) {
      expect(consigne, `${nom} sans interdictions`).toContain(INTERDICTIONS);
    }
  });

  it("interdit explicitement le diagnostic, la cause et le prix", () => {
    expect(INTERDICTIONS).toMatch(/diagnostic/i);
    expect(INTERDICTIONS).toMatch(/cause d'une panne/i);
    expect(INTERDICTIONS).toMatch(/prix|tarif/i);
    expect(INTERDICTIONS).toMatch(/inventes? pas/i);
  });

  /*
   * Aucune consigne ne doit DEMANDER ce qui est interdit. Le test cherche les
   * formulations qui trahiraient une dérive au fil des modifications.
   */
  it("ne demande jamais un diagnostic ni une estimation", () => {
    const derives = [
      /propose\s+un\s+diagnostic/i,
      /identifie\s+la\s+cause/i,
      /estime\s+le\s+(prix|co[ûu]t)/i,
      /sugg[èe]re\s+un\s+tarif/i,
    ];
    for (const consigne of Object.values(CONSIGNES)) {
      for (const derive of derives) expect(derive.test(consigne)).toBe(false);
    }
  });

  /*
   * La garantie ne repose PAS sur l'espoir que la consigne soit respectée : le
   * prix est forcé à zéro dans le code, quoi que le fournisseur renvoie.
   */
  it("force le prix à zéro même si le fournisseur en propose un", () => {
    const lignes = normaliserLignes([
      { libelle: "Chauffe-eau 200L", quantiteMilli: 1000, unite: "u", prixUnitaireCents: 89000 },
      { libelle: "Pose", quantiteMilli: 3000, unite: "h", prixUnitaireCents: 4500 },
    ]);
    expect(lignes).toHaveLength(2);
    for (const l of lignes) expect(l.prixUnitaireCents).toBe(0);
  });
});

describe("normalisation des lignes proposées", () => {
  it("écarte ce qui n'est pas exploitable", () => {
    expect(normaliserLignes(null)).toEqual([]);
    expect(normaliserLignes("texte")).toEqual([]);
    expect(normaliserLignes([{ libelle: "" }, { libelle: "   " }])).toEqual([]);
  });

  it("comble les champs manquants sans inventer de libellé", () => {
    const lignes = normaliserLignes([{ libelle: "Joint" }]);
    expect(lignes[0]).toEqual({
      libelle: "Joint",
      quantiteMilli: 1000,
      unite: "u",
      prixUnitaireCents: 0,
    });
  });

  it("borne le nombre de lignes et la longueur des libellés", () => {
    const beaucoup = Array.from({ length: 200 }, () => ({ libelle: "x".repeat(500) }));
    const lignes = normaliserLignes(beaucoup);
    expect(lignes.length).toBeLessThanOrEqual(50);
    expect(lignes[0]!.libelle.length).toBeLessThanOrEqual(200);
  });

  it("refuse une quantité négative", () => {
    expect(normaliserLignes([{ libelle: "Joint", quantiteMilli: -5000 }])[0]!.quantiteMilli).toBe(0);
  });
});

describe("caviardage avant envoi", () => {
  it("retire téléphone, e-mail, code postal et IBAN", () => {
    const texte =
      "Client joignable au 06 12 34 56 78 ou anne@exemple.fr, 69001 Lyon, " +
      "IBAN FR76 3000 6000 0112 3456 7890 189.";
    const propre = caviarder(texte);

    expect(propre).not.toContain("06 12 34 56 78");
    expect(propre).not.toContain("anne@exemple.fr");
    expect(propre).not.toContain("69001");
    expect(propre).not.toContain("3000 6000");
    expect(propre).toContain("[téléphone]");
    expect(propre).toContain("[e-mail]");
  });

  it("reconnaît plusieurs formats de téléphone", () => {
    for (const numero of ["0612345678", "06.12.34.56.78", "+33 6 12 34 56 78"]) {
      expect(caviarder(`Appeler ${numero}`)).toContain("[téléphone]");
    }
  });

  it("laisse intact le texte technique", () => {
    const technique = "Fuite au niveau du raccord sous l'évier, joint torique à remplacer.";
    expect(caviarder(technique)).toBe(technique);
  });

  /*
   * Le caviardage ne garantit AUCUN anonymat : un nom de famille y survit. Ce
   * test fige cette limite plutôt que de laisser croire l'inverse — c'est ce
   * que l'interface doit dire à l'artisan.
   */
  it("ne prétend pas anonymiser : un nom propre survit", () => {
    expect(caviarder("Intervention chez Madame Durand")).toContain("Durand");
  });
});

describe("indisponibilité", () => {
  it("est refusée explicitement, sans configuration", () => {
    // Aucune variable d'IA n'est définie dans l'environnement de test.
    expect(iaDisponible()).toBe(false);
    expect(IA_NON_CONFIGUREE).toMatch(/IA_FOURNISSEUR/);
    expect(IA_NON_CONFIGUREE).toMatch(/pas disponible/i);
  });
});
