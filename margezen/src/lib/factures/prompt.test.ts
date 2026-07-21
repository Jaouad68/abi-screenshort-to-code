import { describe, expect, it } from "vitest";
import { PROMPT_EXTRACTION_FACTURE } from "./prompt";

describe("PROMPT_EXTRACTION_FACTURE", () => {
  it("exige un JSON seul, sans préambule ni balises de code", () => {
    expect(PROMPT_EXTRACTION_FACTURE).toContain("UNIQUEMENT un objet JSON valide");
    expect(PROMPT_EXTRACTION_FACTURE).toContain("sans balises de code");
  });

  it("impose le signal document_non_reconnu pour un document invalide", () => {
    expect(PROMPT_EXTRACTION_FACTURE).toContain("document_non_reconnu");
  });

  it("interdit l'invention de lignes ou de montants", () => {
    expect(PROMPT_EXTRACTION_FACTURE).toContain("N'invente jamais une ligne");
    expect(PROMPT_EXTRACTION_FACTURE).toContain("Ne calcule aucun montant absent");
  });

  it("fixe le seuil de confiance de validation humaine à 0.7", () => {
    expect(PROMPT_EXTRACTION_FACTURE).toContain("0.7");
  });
});
