import { describe, expect, it } from "vitest";
import { joursRestants, prochainPalierARelancer } from "./ct";

describe("joursRestants", () => {
  it("compte les jours pleins entre deux dates UTC", () => {
    expect(joursRestants(new Date("2026-09-01"), new Date("2026-08-15"))).toBe(17);
  });

  it("renvoie 0 le jour même de l'échéance", () => {
    expect(joursRestants(new Date("2026-08-15"), new Date("2026-08-15"))).toBe(0);
  });

  it("renvoie une valeur négative pour une échéance dépassée", () => {
    expect(joursRestants(new Date("2026-08-10"), new Date("2026-08-15"))).toBe(-5);
  });
});

describe("prochainPalierARelancer", () => {
  const paliers = [21, 10, 3];

  it("ne relance pas si aucun palier n'est encore atteint", () => {
    const palier = prochainPalierARelancer({
      ctEcheance: new Date("2026-09-15"),
      paliers,
      palierDejaEnvoyes: [],
      aujourdHui: new Date("2026-08-15"),
    });
    expect(palier).toBeNull();
  });

  it("déclenche le palier atteint le plus urgent quand plusieurs le sont", () => {
    // 5 jours restants : les seuils 21 et 10 sont déjà franchis, 3 pas encore.
    // Le plus urgent des deux franchis (10) doit être renvoyé.
    const palier = prochainPalierARelancer({
      ctEcheance: new Date("2026-08-20"),
      paliers,
      palierDejaEnvoyes: [],
      aujourdHui: new Date("2026-08-15"),
    });
    expect(palier).toBe(10);
  });

  it("ignore les paliers déjà envoyés", () => {
    // 2 jours restants : 21 et 10 sont franchis mais déjà envoyés, seul 3 reste dû.
    const palier = prochainPalierARelancer({
      ctEcheance: new Date("2026-08-17"),
      paliers,
      palierDejaEnvoyes: [21, 10],
      aujourdHui: new Date("2026-08-15"),
    });
    expect(palier).toBe(3);
  });

  it("renvoie null une fois tous les paliers envoyés", () => {
    const palier = prochainPalierARelancer({
      ctEcheance: new Date("2026-08-17"),
      paliers,
      palierDejaEnvoyes: [21, 10, 3],
      aujourdHui: new Date("2026-08-15"),
    });
    expect(palier).toBeNull();
  });

  it("ne relance plus une fois l'échéance dépassée", () => {
    const palier = prochainPalierARelancer({
      ctEcheance: new Date("2026-08-10"),
      paliers,
      palierDejaEnvoyes: [],
      aujourdHui: new Date("2026-08-15"),
    });
    expect(palier).toBeNull();
  });
});
