import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { matchLycees, parseRss } from "./news-match";

describe("matchLycees", () => {
  const cases: [string, string[]][] = [
    ["Blocus au lycée Jean-Jaurès d'Argenteuil : « nous aussi, banlieusards »", ["0950641F"]],
    ["Cergy. Blocus au lycée Galilée, la police intervient dans le calme", ["0951637N"]],
    ["Au lycée Simone-de-Beauvoir de Garges, le blocus pacifiste des élèves", ["0951766D"]],
    ["Argenteuil : blocus contre le nouveau bac au lycée Léger", ["0951811C"]],
    ["Val-d'Oise. Incidents devant le lycée Pissarro de Pontoise", ["0950649P"]],
    ["Gonesse : cinq jours de blocage au lycée René-Cassin", ["0950646L"]],
    ["Bezons : blocages et manifestations au lycée Eugène-Ronceray", ["0952173W"]],
    ["Des incidents éclatent devant le lycée Jules-Verne à Cergy", ["0951756T"]],
    // Deux lycées Jean-Jacques Rousseau : la ville fait la différence.
    ["Sarcelles : blocus au lycée Jean-Jacques Rousseau", ["0950650R"]],
    ["Montmorency : le lycée Jean-Jacques-Rousseau bloqué ce matin", ["0950648N"]],
  ];
  it.each(cases)("%s", (title, expected) => {
    expect(matchLycees(title)).toEqual(expected);
  });

  it("ignore les articles sans mot-clé de mobilisation", () => {
    expect(matchLycees("Palmarès des lycées : le lycée Fragonard de L'Isle-Adam décroche la première place")).toEqual([]);
  });

  it("ignore un lycée homonyme hors du Val-d'Oise", () => {
    expect(matchLycees("Nantes : blocus au lycée Jules-Verne")).toEqual([]);
  });

  it("ignore les articles généraux", () => {
    expect(matchLycees("Blocus des lycées : 37 établissements fermés ce vendredi dans le Val-d'Oise")).toEqual([]);
  });
});

describe("parseRss", () => {
  it("lit un vrai flux Google Actualités", () => {
    const xml = readFileSync(new URL("./server/__fixtures__/google-news-blocus.xml", import.meta.url), "utf8");
    const items = parseRss(xml);
    expect(items.length).toBe(100);
    const jaures = items.find((i) => i.title.includes("Jean-Jaurès"));
    expect(jaures?.source).toBe("blast-info.fr");
    expect(jaures?.title.endsWith("blast-info.fr")).toBe(false);
    expect(jaures?.publishedAt).toBe("2026-10-01T16:15:00.000Z");
    expect(jaures?.url.startsWith("https://news.google.com/")).toBe(true);
    // Le flux réel contient plusieurs articles rattachables à un lycée précis.
    expect(items.filter((i) => matchLycees(i.title).length > 0).length).toBeGreaterThanOrEqual(5);
  });
});
