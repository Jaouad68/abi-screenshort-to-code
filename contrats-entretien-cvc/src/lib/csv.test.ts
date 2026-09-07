import { describe, expect, it } from "vitest";
import { toCsv, parseCsv, montantCsv, dateCsv } from "./csv";

describe("toCsv / parseCsv", () => {
  it("fait un aller-retour sur des valeurs avec point-virgule et guillemets", () => {
    const rows = [
      ["Nom", "Notes"],
      ["Dupont; Jean", 'Contient des "guillemets"'],
    ];
    const csv = toCsv(rows);
    const relu = parseCsv(csv);
    expect(relu).toEqual(rows);
  });

  it("détecte le séparateur virgule quand il n'y a pas de point-virgule", () => {
    const relu = parseCsv("Nom,Ville\nDupont,Paris");
    expect(relu).toEqual([
      ["Nom", "Ville"],
      ["Dupont", "Paris"],
    ]);
  });

  it("ignore les lignes vides", () => {
    const relu = parseCsv("Nom;Ville\nDupont;Paris\n\n");
    expect(relu).toHaveLength(2);
  });
});

describe("montantCsv / dateCsv", () => {
  it("formate un montant en centimes en euros virgule", () => {
    expect(montantCsv(158780)).toBe("1587,80");
  });

  it("formate une date en jj/mm/aaaa", () => {
    expect(dateCsv(new Date(2026, 2, 5))).toBe("05/03/2026");
  });

  it("renvoie une chaîne vide pour une date nulle", () => {
    expect(dateCsv(null)).toBe("");
  });
});
