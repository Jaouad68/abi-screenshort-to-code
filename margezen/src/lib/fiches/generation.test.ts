import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
  genererFicheTechniqueAvecRetry,
  parserReponseFicheTechnique,
} from "./generation";
import { construirePromptFicheTechnique } from "./prompt";

function lireFixture(nom: string): string {
  return fs.readFileSync(path.join(__dirname, "__fixtures__", nom), "utf-8");
}

const NOMINALE = lireFixture("nominale.txt");
const JSON_MALFORME = lireFixture("json-malforme.txt");

describe("parserReponseFicheTechnique", () => {
  it("extrait une composition avec plusieurs ingrédients", () => {
    const resultat = parserReponseFicheTechnique(NOMINALE);
    expect(resultat.type).toBe("proposition");
    if (resultat.type !== "proposition") throw new Error("type inattendu");
    expect(resultat.donnees.ingredients).toHaveLength(6);
    expect(resultat.donnees.note).toContain("frites");
  });

  it("échoue proprement sur un JSON malformé", () => {
    const resultat = parserReponseFicheTechnique(JSON_MALFORME);
    expect(resultat.type).toBe("echec");
  });

  it("rejette une unité hors énumération kg|L|piece", () => {
    const resultat = parserReponseFicheTechnique(
      JSON.stringify({
        ingredients: [{ nom: "beurre", quantite: 0.02, unite: "g" }],
        note: null,
      }),
    );
    expect(resultat.type).toBe("echec");
  });

  it("rejette une quantité négative", () => {
    const resultat = parserReponseFicheTechnique(
      JSON.stringify({
        ingredients: [{ nom: "beurre", quantite: -1, unite: "kg" }],
        note: null,
      }),
    );
    expect(resultat.type).toBe("echec");
  });

  it("accepte une liste d'ingrédients vide (cas limite)", () => {
    const resultat = parserReponseFicheTechnique(
      JSON.stringify({ ingredients: [], note: "Aucun ingrédient identifiable." }),
    );
    expect(resultat.type).toBe("proposition");
  });
});

describe("genererFicheTechniqueAvecRetry", () => {
  it("réussit dès le premier appel", async () => {
    let appels = 0;
    const resultat = await genererFicheTechniqueAvecRetry(async () => {
      appels += 1;
      return NOMINALE;
    });
    expect(resultat.type).toBe("proposition");
    expect(appels).toBe(1);
  });

  it("bascule en saisie manuelle après deux échecs", async () => {
    let appels = 0;
    const resultat = await genererFicheTechniqueAvecRetry(async () => {
      appels += 1;
      return JSON_MALFORME;
    });
    expect(resultat.type).toBe("echec_definitif");
    expect(appels).toBe(2);
  });
});

describe("construirePromptFicheTechnique", () => {
  it("interpole le nom, le prix et le type de cuisine", () => {
    const prompt = construirePromptFicheTechnique(
      { nom: "Entrecôte grillée", description: "Sauce au poivre", prixTtcCts: 2450 },
      "traditionnel",
    );
    expect(prompt).toContain('Plat : "Entrecôte grillée"');
    expect(prompt).toContain("24.50 € TTC");
    expect(prompt).toContain("traditionnel");
    expect(prompt).toContain("Sauce au poivre");
  });

  it("affiche 'non renseigné(e)' pour un prix ou une description absents", () => {
    const prompt = construirePromptFicheTechnique(
      { nom: "Plat du jour", description: null, prixTtcCts: null },
      "traditionnel",
    );
    expect(prompt).toContain("non renseigné");
    expect(prompt).toContain("non renseignée");
  });
});
