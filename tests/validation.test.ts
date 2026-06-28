import { describe, it, expect } from "vitest";
import { registerSchema, equipementSchema, releveSchema } from "@/lib/validation";

describe("registerSchema", () => {
  it("rejette un mot de passe trop court", () => {
    const r = registerSchema.safeParse({
      etablissementNom: "Bistrot",
      nom: "Camille",
      email: "a@b.fr",
      password: "court",
    });
    expect(r.success).toBe(false);
  });
  it("normalise l'email en minuscules", () => {
    const r = registerSchema.safeParse({
      etablissementNom: "Bistrot",
      nom: "Camille",
      email: "Camille@Bistrot.FR",
      password: "motdepasse",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("camille@bistrot.fr");
  });
});

describe("equipementSchema", () => {
  it("refuse min >= max", () => {
    const r = equipementSchema.safeParse({ nom: "F", type: "FRIGO_POSITIF", tempMin: 4, tempMax: 0 });
    expect(r.success).toBe(false);
  });
  it("accepte une plage valide et coerce les nombres", () => {
    const r = equipementSchema.safeParse({ nom: "F", type: "FRIGO_POSITIF", tempMin: "0", tempMax: "4" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.tempMax).toBe(4);
  });
  it("rejette un type inconnu", () => {
    const r = equipementSchema.safeParse({ nom: "F", type: "INCONNU", tempMin: 0, tempMax: 4 });
    expect(r.success).toBe(false);
  });
});

describe("releveSchema", () => {
  it("coerce la valeur en nombre", () => {
    const r = releveSchema.safeParse({ equipementId: "x", valeur: "3.5" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.valeur).toBe(3.5);
  });
  it("exige un équipement", () => {
    const r = releveSchema.safeParse({ equipementId: "", valeur: "3" });
    expect(r.success).toBe(false);
  });
});
