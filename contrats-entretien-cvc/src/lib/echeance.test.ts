import { describe, expect, it } from "vitest";
import { classerEcheance, periodiciteMois, prochaineEcheance } from "./echeance";

describe("periodiciteMois", () => {
  it("retourne le bon nombre de mois pour chaque périodicité connue", () => {
    expect(periodiciteMois("MENSUELLE")).toBe(1);
    expect(periodiciteMois("TRIMESTRIELLE")).toBe(3);
    expect(periodiciteMois("SEMESTRIELLE")).toBe(6);
    expect(periodiciteMois("ANNUELLE")).toBe(12);
    expect(periodiciteMois("BIENNALE")).toBe(24);
  });

  it("retourne null pour AUTRE (non calculable automatiquement)", () => {
    expect(periodiciteMois("AUTRE")).toBeNull();
  });
});

describe("prochaineEcheance", () => {
  it("ajoute la bonne durée à la date de départ", () => {
    const depart = new Date(2026, 0, 15); // 15 janvier 2026
    const resultat = prochaineEcheance(depart, "ANNUELLE");
    expect(resultat).not.toBeNull();
    expect(resultat!.getFullYear()).toBe(2027);
    expect(resultat!.getMonth()).toBe(0);
    expect(resultat!.getDate()).toBe(15);
  });

  it("renvoie null pour la périodicité Autre", () => {
    expect(prochaineEcheance(new Date(), "AUTRE")).toBeNull();
  });
});

describe("classerEcheance", () => {
  const aujourdhui = new Date(2026, 5, 1); // 1 juin 2026

  function dans(jours: number): Date {
    const d = new Date(aujourdhui);
    d.setDate(d.getDate() + jours);
    return d;
  }

  it("classe une échéance passée comme en retard", () => {
    expect(classerEcheance(dans(-5), aujourdhui)).toBe("echu");
  });

  it("classe les bornes des fenêtres 30/60/90 correctement", () => {
    expect(classerEcheance(dans(0), aujourdhui)).toBe("30");
    expect(classerEcheance(dans(30), aujourdhui)).toBe("30");
    expect(classerEcheance(dans(31), aujourdhui)).toBe("60");
    expect(classerEcheance(dans(60), aujourdhui)).toBe("60");
    expect(classerEcheance(dans(61), aujourdhui)).toBe("90");
    expect(classerEcheance(dans(90), aujourdhui)).toBe("90");
    expect(classerEcheance(dans(91), aujourdhui)).toBe("hors-fenetre");
  });
});
