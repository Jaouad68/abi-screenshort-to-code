import { describe, it, expect } from "vitest";
import { buildDossierPdf, type DossierData } from "@/lib/pdf";

const base: DossierData = {
  etablissement: { nom: "Le Bistrot du Marché", adresse: "Paris", siret: "123" },
  periode: { from: new Date("2026-05-20"), to: new Date("2026-06-19") },
  genereLe: new Date("2026-06-19T10:00:00Z"),
  generePar: "Camille",
  releves: [],
  validations: [],
  receptions: [],
  produits: [],
  nonConformites: [],
};

describe("buildDossierPdf", () => {
  it("génère un PDF valide même sans données", async () => {
    const pdf = await buildDossierPdf(base);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(800);
  });

  it("intègre des relevés (dont un hors plage) sans planter", async () => {
    const data: DossierData = {
      ...base,
      releves: [
        {
          createdAt: new Date("2026-06-01T09:00:00Z"),
          valeur: 3,
          conforme: true,
          equipement: { nom: "Frigo 1", type: "FRIGO_POSITIF", tempMin: 0, tempMax: 4 },
          utilisateur: { nom: "Sofia" },
        },
        {
          createdAt: new Date("2026-06-01T18:00:00Z"),
          valeur: 9,
          conforme: false,
          equipement: { nom: "Frigo 1", type: "FRIGO_POSITIF", tempMin: 0, tempMax: 4 },
          utilisateur: { nom: "Sofia" },
        },
      ],
      nonConformites: [
        {
          createdAt: new Date("2026-06-01T18:00:00Z"),
          resolvedAt: null,
          type: "Température hors plage",
          description: "Frigo 1 à 9 °C",
          actionCorrective: null,
          responsable: null,
          statut: "OUVERT",
          utilisateur: { nom: "Sofia" },
        },
      ],
    };
    const pdf = await buildDossierPdf(data);
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
