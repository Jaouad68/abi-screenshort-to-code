import { describe, expect, it } from "vitest";
import { debutFenetre, FENETRE_MINUTES, MAX_TENTATIVES, tentativeAutorisee } from "@/lib/securite";

describe("tentativeAutorisee", () => {
  it("autorise tant que le seuil n'est pas atteint", () => {
    expect(tentativeAutorisee(0)).toBe(true);
    expect(tentativeAutorisee(MAX_TENTATIVES - 1)).toBe(true);
  });

  it("bloque à partir du seuil", () => {
    expect(tentativeAutorisee(MAX_TENTATIVES)).toBe(false);
    expect(tentativeAutorisee(MAX_TENTATIVES + 5)).toBe(false);
  });
});

describe("debutFenetre", () => {
  it("recule de la durée de la fenêtre glissante", () => {
    const maintenant = new Date("2026-08-10T12:00:00.000Z");
    expect(debutFenetre(maintenant).toISOString()).toBe(
      new Date(maintenant.getTime() - FENETRE_MINUTES * 60_000).toISOString(),
    );
  });
});
