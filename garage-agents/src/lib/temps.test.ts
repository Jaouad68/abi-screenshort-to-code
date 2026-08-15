import { describe, expect, it } from "vitest";
import { formaterTempsRelatif } from "./temps";

const maintenant = new Date("2026-08-15T12:00:00Z");

describe("formaterTempsRelatif", () => {
  it("affiche 'à l'instant' pour un écart de quelques secondes", () => {
    expect(formaterTempsRelatif(new Date("2026-08-15T11:59:45Z"), maintenant)).toBe("à l'instant");
  });

  it("affiche les minutes en dessous d'une heure", () => {
    expect(formaterTempsRelatif(new Date("2026-08-15T11:45:00Z"), maintenant)).toBe("il y a 15 min");
  });

  it("affiche les heures en dessous d'un jour", () => {
    expect(formaterTempsRelatif(new Date("2026-08-15T05:00:00Z"), maintenant)).toBe("il y a 7 h");
  });

  it("affiche les jours en dessous d'une semaine", () => {
    expect(formaterTempsRelatif(new Date("2026-08-11T12:00:00Z"), maintenant)).toBe("il y a 4 j");
  });

  it("affiche une date courte au-delà d'une semaine", () => {
    expect(formaterTempsRelatif(new Date("2026-07-20T12:00:00Z"), maintenant)).toBe("20 juil.");
  });
});
