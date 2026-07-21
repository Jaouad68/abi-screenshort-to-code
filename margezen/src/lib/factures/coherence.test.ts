import { describe, expect, it } from "vitest";
import { verifierCoherence } from "./coherence";

describe("verifierCoherence", () => {
  it("est cohérent quand la somme des lignes correspond au total déclaré", () => {
    const resultat = verifierCoherence(28450, [
      { totalHtCts: 4200 },
      { totalHtCts: 2500 },
      { totalHtCts: 22050 },
    ]);
    expect(resultat.coherent).toBe(true);
    expect(resultat.totalLignesCts).toBe(28750);
    expect(resultat.avertissement).toBeNull();
  });

  it("détecte un écart supérieur à 2 % et produit un avertissement explicite", () => {
    const resultat = verifierCoherence(10000, [{ totalHtCts: 12000 }]);
    expect(resultat.coherent).toBe(false);
    expect(resultat.ecartPct).toBe(20);
    expect(resultat.avertissement).toMatch(/validation/);
  });

  it("accepte un écart de tout juste 2 %", () => {
    const resultat = verifierCoherence(10000, [{ totalHtCts: 10200 }]);
    expect(resultat.coherent).toBe(true);
  });

  it("rejette un écart de 2,01 %", () => {
    const resultat = verifierCoherence(10000, [{ totalHtCts: 10201 }]);
    expect(resultat.coherent).toBe(false);
  });

  it("est cohérent sans total déclaré (absent de la facture)", () => {
    const resultat = verifierCoherence(null, [{ totalHtCts: 5000 }]);
    expect(resultat.coherent).toBe(true);
    expect(resultat.ecartPct).toBeNull();
  });

  it("traite les lignes sans total comme des zéros dans la somme", () => {
    const resultat = verifierCoherence(4200, [
      { totalHtCts: 4200 },
      { totalHtCts: null },
    ]);
    expect(resultat.totalLignesCts).toBe(4200);
    expect(resultat.coherent).toBe(true);
  });

  it("ne divise jamais par zéro quand le total déclaré est nul", () => {
    const resultat = verifierCoherence(0, [{ totalHtCts: 500 }]);
    expect(resultat.coherent).toBe(true);
    expect(resultat.ecartPct).toBeNull();
  });

  it("gère une facture sans aucune ligne", () => {
    const resultat = verifierCoherence(1000, []);
    expect(resultat.totalLignesCts).toBe(0);
    expect(resultat.coherent).toBe(false);
  });
});
