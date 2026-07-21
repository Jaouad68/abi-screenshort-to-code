import { describe, expect, it } from "vitest";
import { decidirRapprochement, type CandidatRapprochement } from "./rapprochement";

describe("decidirRapprochement", () => {
  it("propose la création quand aucun candidat n'est trouvé", () => {
    expect(decidirRapprochement([])).toEqual({ type: "proposition_creation" });
  });

  it("privilégie une correspondance exacte d'alias", () => {
    const candidats: CandidatRapprochement[] = [
      { ingredientId: "ing-1", nomNormalise: "beurre", score: 1, origine: "alias" },
    ];
    expect(decidirRapprochement(candidats)).toEqual({
      type: "rapproche",
      ingredientId: "ing-1",
      nomNormalise: "beurre",
      score: 1,
      origine: "alias",
    });
  });

  it("retient le meilleur candidat trigramme au-dessus du seuil", () => {
    const candidats: CandidatRapprochement[] = [
      { ingredientId: "ing-1", nomNormalise: "beurre doux", score: 0.45, origine: "trigramme" },
      { ingredientId: "ing-2", nomNormalise: "beurre", score: 0.62, origine: "trigramme" },
    ];
    const decision = decidirRapprochement(candidats);
    expect(decision).toEqual({
      type: "rapproche",
      ingredientId: "ing-2",
      nomNormalise: "beurre",
      score: 0.62,
      origine: "trigramme",
    });
  });

  it("ignore les candidats trigramme sous le seuil de 0.4", () => {
    const candidats: CandidatRapprochement[] = [
      { ingredientId: "ing-1", nomNormalise: "beurre", score: 0.39, origine: "trigramme" },
    ];
    expect(decidirRapprochement(candidats)).toEqual({ type: "proposition_creation" });
  });

  it("accepte un candidat trigramme exactement au seuil (0.4)", () => {
    const candidats: CandidatRapprochement[] = [
      { ingredientId: "ing-1", nomNormalise: "beurre", score: 0.4, origine: "trigramme" },
    ];
    const decision = decidirRapprochement(candidats);
    expect(decision.type).toBe("rapproche");
  });

  it("l'alias exact l'emporte même face à un meilleur score trigramme", () => {
    const candidats: CandidatRapprochement[] = [
      { ingredientId: "ing-2", nomNormalise: "beurre demi-sel", score: 0.95, origine: "trigramme" },
      { ingredientId: "ing-1", nomNormalise: "beurre", score: 1, origine: "alias" },
    ];
    const decision = decidirRapprochement(candidats);
    expect(decision).toEqual({
      type: "rapproche",
      ingredientId: "ing-1",
      nomNormalise: "beurre",
      score: 1,
      origine: "alias",
    });
  });
});
