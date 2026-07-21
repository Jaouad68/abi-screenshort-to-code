import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { importerCarteAvecRetry, parserReponseCarte } from "./extraction";

function lireFixture(nom: string): string {
  return fs.readFileSync(path.join(__dirname, "__fixtures__", nom), "utf-8");
}

const NOMINALE = lireFixture("nominale.txt");
const VIDE = lireFixture("vide.txt");
const BALISES_CODE = lireFixture("balises-code.txt");
const JSON_MALFORME = lireFixture("json-malforme.txt");

describe("parserReponseCarte", () => {
  it("extrait plusieurs plats avec catégories variées", () => {
    const resultat = parserReponseCarte(NOMINALE);
    expect(resultat.type).toBe("carte");
    if (resultat.type !== "carte") throw new Error("type inattendu");
    expect(resultat.donnees.plats).toHaveLength(4);
    expect(resultat.donnees.plats[3]?.prix_ttc).toBeNull();
  });

  it("accepte une carte vide (aucun plat détecté)", () => {
    const resultat = parserReponseCarte(VIDE);
    expect(resultat.type).toBe("carte");
    if (resultat.type !== "carte") throw new Error("type inattendu");
    expect(resultat.donnees.plats).toEqual([]);
  });

  it("nettoie les balises de code parasites", () => {
    const resultat = parserReponseCarte(BALISES_CODE);
    expect(resultat.type).toBe("carte");
    if (resultat.type !== "carte") throw new Error("type inattendu");
    expect(resultat.donnees.plats[0]?.nom).toBe("Soupe à l'oignon gratinée");
  });

  it("échoue proprement sur un JSON malformé", () => {
    const resultat = parserReponseCarte(JSON_MALFORME);
    expect(resultat.type).toBe("echec");
  });

  it("rejette une catégorie hors énumération", () => {
    const resultat = parserReponseCarte(
      JSON.stringify({
        plats: [
          { nom: "X", description: null, categorie: "vin", prix_ttc: null },
        ],
      }),
    );
    expect(resultat.type).toBe("echec");
  });
});

describe("importerCarteAvecRetry", () => {
  it("réussit dès le premier appel", async () => {
    let appels = 0;
    const resultat = await importerCarteAvecRetry(async () => {
      appels += 1;
      return NOMINALE;
    });
    expect(resultat.type).toBe("carte");
    expect(appels).toBe(1);
  });

  it("relance une fois puis réussit", async () => {
    let appels = 0;
    const resultat = await importerCarteAvecRetry(async () => {
      appels += 1;
      return appels === 1 ? JSON_MALFORME : NOMINALE;
    });
    expect(resultat.type).toBe("carte");
    expect(appels).toBe(2);
  });

  it("bascule en saisie manuelle après deux échecs", async () => {
    let appels = 0;
    const resultat = await importerCarteAvecRetry(async () => {
      appels += 1;
      return JSON_MALFORME;
    });
    expect(resultat.type).toBe("echec_definitif");
    expect(appels).toBe(2);
  });
});
