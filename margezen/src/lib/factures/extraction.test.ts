import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
  extraireFactureAvecRetry,
  parserReponseExtraction,
} from "./extraction";

function lireFixture(nom: string): string {
  return fs.readFileSync(
    path.join(__dirname, "__fixtures__", nom),
    "utf-8",
  );
}

const NOMINALE = lireFixture("nominale.txt");
const VALEURS_NULLES = lireFixture("valeurs-nulles.txt");
const JSON_MALFORME = lireFixture("json-malforme.txt");
const BALISES_CODE = lireFixture("balises-code.txt");
const DOCUMENT_NON_RECONNU = lireFixture("document-non-reconnu.txt");

describe("parserReponseExtraction — 5 cas de fixtures LLM", () => {
  it("fixture nominale : facture complète et cohérente", () => {
    const resultat = parserReponseExtraction(NOMINALE);
    expect(resultat.type).toBe("facture");
    if (resultat.type !== "facture") throw new Error("type inattendu");
    expect(resultat.donnees.fournisseur).toBe("METRO Cash & Carry");
    expect(resultat.donnees.lignes).toHaveLength(4);
    expect(resultat.donnees.lignes[3]?.confiance).toBeLessThan(0.7);
  });

  it("fixture valeurs nulles : facture incomplète mais valide", () => {
    const resultat = parserReponseExtraction(VALEURS_NULLES);
    expect(resultat.type).toBe("facture");
    if (resultat.type !== "facture") throw new Error("type inattendu");
    expect(resultat.donnees.fournisseur).toBeNull();
    expect(resultat.donnees.total_ht).toBeNull();
    expect(resultat.donnees.lignes[0]?.quantite).toBeNull();
  });

  it("fixture JSON malformé : échec avec message de correction", () => {
    const resultat = parserReponseExtraction(JSON_MALFORME);
    expect(resultat.type).toBe("echec");
    if (resultat.type !== "echec") throw new Error("type inattendu");
    expect(resultat.messageCorrection).toContain("JSON valide");
  });

  it("fixture balises de code parasites : nettoyées puis parsées", () => {
    const resultat = parserReponseExtraction(BALISES_CODE);
    expect(resultat.type).toBe("facture");
    if (resultat.type !== "facture") throw new Error("type inattendu");
    expect(resultat.donnees.fournisseur).toBe("Pomona TerreAzur");
    expect(resultat.donnees.lignes).toHaveLength(2);
  });

  it("fixture document non reconnu", () => {
    const resultat = parserReponseExtraction(DOCUMENT_NON_RECONNU);
    expect(resultat.type).toBe("document_non_reconnu");
  });

  it("rejette une ligne avec une confiance hors bornes [0,1]", () => {
    const resultat = parserReponseExtraction(
      JSON.stringify({
        fournisseur: "Test",
        date_facture: null,
        total_ht: null,
        lignes: [
          {
            libelle_brut: "X",
            quantite: null,
            unite: null,
            prix_unitaire_ht: null,
            total_ht: null,
            confiance: 1.5,
          },
        ],
      }),
    );
    expect(resultat.type).toBe("echec");
  });
});

describe("extraireFactureAvecRetry — pipeline complet sans appel réseau", () => {
  it("réussit dès le premier appel sur une réponse nominale", async () => {
    const appels: (string | undefined)[] = [];
    const resultat = await extraireFactureAvecRetry(async (correction) => {
      appels.push(correction);
      return NOMINALE;
    });
    expect(resultat.type).toBe("facture");
    expect(appels).toHaveLength(1);
    expect(appels[0]).toBeUndefined();
  });

  it("bascule en document_non_reconnu sans relance", async () => {
    let nombreAppels = 0;
    const resultat = await extraireFactureAvecRetry(async () => {
      nombreAppels += 1;
      return DOCUMENT_NON_RECONNU;
    });
    expect(resultat.type).toBe("document_non_reconnu");
    expect(nombreAppels).toBe(1);
  });

  it("relance une fois sur JSON malformé puis réussit avec la correction", async () => {
    const appels: (string | undefined)[] = [];
    const resultat = await extraireFactureAvecRetry(async (correction) => {
      appels.push(correction);
      return appels.length === 1 ? JSON_MALFORME : NOMINALE;
    });
    expect(resultat.type).toBe("facture");
    expect(appels).toHaveLength(2);
    expect(appels[1]).toContain("JSON valide");
  });

  it("bascule en saisie manuelle si la relance échoue aussi", async () => {
    let nombreAppels = 0;
    const resultat = await extraireFactureAvecRetry(async () => {
      nombreAppels += 1;
      return JSON_MALFORME;
    });
    expect(resultat.type).toBe("echec_definitif");
    expect(nombreAppels).toBe(2);
  });
});
