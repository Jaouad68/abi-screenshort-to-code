import { describe, expect, it } from "vitest";
import { construireCsv, echapperChampCsv } from "@/lib/csv";

describe("echapperChampCsv", () => {
  it("encadre systématiquement de guillemets", () => {
    expect(echapperChampCsv("Martin")).toBe('"Martin"');
  });

  it("double les guillemets internes", () => {
    expect(echapperChampCsv('Plomberie "Le Robinet"')).toBe('"Plomberie ""Le Robinet"""');
  });

  it("conserve les séparateurs et retours à la ligne à l'intérieur du champ", () => {
    expect(echapperChampCsv("a;b")).toBe('"a;b"');
    expect(echapperChampCsv("ligne1\nligne2")).toBe('"ligne1\nligne2"');
  });

  /*
   * Injection de formule : sans neutralisation, un client nommé
   * `=1+1` — ou pire, `=cmd|...` — serait interprété comme une formule à
   * l'ouverture du fichier dans Excel ou LibreOffice.
   */
  it("neutralise les valeurs interprétables comme des formules", () => {
    expect(echapperChampCsv("=1+1")).toBe(`"'=1+1"`);
    expect(echapperChampCsv("+33612345678")).toBe(`"'+33612345678"`);
    expect(echapperChampCsv("-12")).toBe(`"'-12"`);
    expect(echapperChampCsv("@SUM(A1)")).toBe(`"'@SUM(A1)"`);
    expect(echapperChampCsv("\tvaleur")).toBe(`"'\tvaleur"`);
  });

  it("ne neutralise pas une valeur ordinaire contenant ces caractères ailleurs", () => {
    expect(echapperChampCsv("Jean-Pierre")).toBe('"Jean-Pierre"');
    expect(echapperChampCsv("a=b")).toBe('"a=b"');
  });
});

describe("construireCsv", () => {
  it("commence par un BOM UTF-8", () => {
    // Sans BOM, Excel en français lit le fichier en ANSI et casse les accents.
    expect(construireCsv(["Nom"], [["Rémi"]]).charCodeAt(0)).toBe(0xfeff);
  });

  it("sépare par des points-virgules et des CRLF", () => {
    const csv = construireCsv(["A", "B"], [["1", "2"]]);
    expect(csv).toBe('﻿"A";"B"\r\n"1";"2"');
  });

  it("accepte un tableau de lignes vide", () => {
    expect(construireCsv(["A"], [])).toBe('﻿"A"');
  });
});
