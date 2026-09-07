import { describe, expect, it } from "vitest";
import { parseClientsCsv, cleDoublonPour, parseDateFlexible, parsePeriodicite } from "./import";

describe("parseClientsCsv", () => {
  it("reconnaît les en-têtes accentués et détecte les erreurs", () => {
    const csv = [
      "Nom;Téléphone;Email;Date d'échéance",
      "Dupont Jean;0601020304;jean@email.fr;01/03/2026",
      ";0600000000;;",
      "Martin Paul;0602030405;pas-un-email;31/13/2026",
    ].join("\n");

    const { lignes, entetesInconnues } = parseClientsCsv(csv);
    expect(entetesInconnues).toEqual([]);
    expect(lignes).toHaveLength(3);

    expect(lignes[0].erreurs).toEqual([]);
    expect(lignes[0].valeurs.nom).toBe("Dupont Jean");

    expect(lignes[1].erreurs).toContain("Nom du client manquant.");

    expect(lignes[2].erreurs).toContain("E-mail invalide.");
  });

  it("ignore les colonnes inconnues sans planter", () => {
    const csv = "Nom;Colonne Mystère\nDupont;valeur";
    const { lignes, entetesInconnues } = parseClientsCsv(csv);
    expect(lignes).toHaveLength(1);
    expect(entetesInconnues).toEqual(["Colonne Mystère"]);
  });
});

describe("cleDoublonPour", () => {
  it("utilise l'email en priorité, insensible à la casse", () => {
    expect(cleDoublonPour("Jean Dupont", "Jean@Email.fr", "0601020304")).toBe(
      cleDoublonPour("Autre Nom", "jean@email.fr", "0699999999"),
    );
  });

  it("retombe sur nom + téléphone sans email", () => {
    expect(cleDoublonPour("Jean Dupont", "", "06 01 02 03 04")).toBe(
      cleDoublonPour("jean dupont", "", "0601020304"),
    );
  });
});

describe("parseDateFlexible", () => {
  it("accepte jj/mm/aaaa", () => {
    const d = parseDateFlexible("05/03/2026");
    expect(d?.getDate()).toBe(5);
    expect(d?.getMonth()).toBe(2);
    expect(d?.getFullYear()).toBe(2026);
  });

  it("accepte aaaa-mm-jj", () => {
    const d = parseDateFlexible("2026-03-05");
    expect(d?.getDate()).toBe(5);
  });

  it("rejette un format illisible", () => {
    expect(parseDateFlexible("pas une date")).toBeNull();
  });
});

describe("parsePeriodicite", () => {
  it("reconnaît les libellés usuels sans tenir compte des accents/casse", () => {
    expect(parsePeriodicite("Mensuelle")).toBe("MENSUELLE");
    expect(parsePeriodicite("annuel")).toBe("ANNUELLE");
    expect(parsePeriodicite("BIENNALE")).toBe("BIENNALE");
  });

  it("retombe sur ANNUELLE si non reconnu ou absent", () => {
    expect(parsePeriodicite("???")).toBe("ANNUELLE");
    expect(parsePeriodicite(undefined)).toBe("ANNUELLE");
  });
});
