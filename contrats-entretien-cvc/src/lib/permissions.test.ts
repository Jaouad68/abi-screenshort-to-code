import { describe, expect, it } from "vitest";
import { peutGererActivite, peutGererEquipe, estTechnicien } from "./permissions";

describe("permissions", () => {
  it("dirigeant et administratif peuvent gérer l'activité, pas le technicien", () => {
    expect(peutGererActivite("DIRIGEANT")).toBe(true);
    expect(peutGererActivite("ADMINISTRATIF")).toBe(true);
    expect(peutGererActivite("TECHNICIEN")).toBe(false);
  });

  it("seul le dirigeant gère l'équipe", () => {
    expect(peutGererEquipe("DIRIGEANT")).toBe(true);
    expect(peutGererEquipe("ADMINISTRATIF")).toBe(false);
    expect(peutGererEquipe("TECHNICIEN")).toBe(false);
  });

  it("estTechnicien ne concerne que le rôle Technicien", () => {
    expect(estTechnicien("TECHNICIEN")).toBe(true);
    expect(estTechnicien("DIRIGEANT")).toBe(false);
  });
});
