import { describe, expect, it } from "vitest";
import { acompteRequis, estAnnulationTardive, montantAcompteCents } from "./acompte";
import type { ReglagesAcompte } from "./horaires";

const reglages: ReglagesAcompte = {
  seuilNoShow: 2,
  seuilPardon: 3,
  montantType: "pourcentage",
  valeur: 30,
};

describe("acompteRequis", () => {
  it("does not require a deposit below the no-show threshold", () => {
    expect(acompteRequis({ noShowCount: 1, honoredCount: 0 }, reglages)).toBe(false);
  });

  it("requires a deposit once the no-show threshold is reached", () => {
    expect(acompteRequis({ noShowCount: 2, honoredCount: 0 }, reglages)).toBe(true);
  });

  it("still requires a deposit above the threshold, short of the pardon count", () => {
    expect(acompteRequis({ noShowCount: 5, honoredCount: 2 }, reglages)).toBe(true);
  });

  it("grants pardon once the client has honored enough appointments since", () => {
    expect(acompteRequis({ noShowCount: 5, honoredCount: 3 }, reglages)).toBe(false);
  });

  it("never requires a deposit for a client with no no-show history", () => {
    expect(acompteRequis({ noShowCount: 0, honoredCount: 0 }, reglages)).toBe(false);
  });
});

describe("montantAcompteCents", () => {
  it("computes a percentage of the service price", () => {
    expect(montantAcompteCents(reglages, 3500)).toBe(1050); // 30% of 35,00 €
  });

  it("rounds a percentage to the nearest cent", () => {
    expect(montantAcompteCents({ ...reglages, valeur: 33 }, 2500)).toBe(825); // 33% of 25,00 € = 8,25 €
  });

  it("computes a fixed amount regardless of the service price", () => {
    const fixe: ReglagesAcompte = { ...reglages, montantType: "fixe", valeur: 15 };
    expect(montantAcompteCents(fixe, 3500)).toBe(1500);
    expect(montantAcompteCents(fixe, 8500)).toBe(1500);
  });
});

describe("estAnnulationTardive", () => {
  const maintenant = new Date("2026-07-13T10:00:00.000Z");

  it("is late when cancelling less than 48h before the appointment", () => {
    const debutAt = new Date("2026-07-14T09:00:00.000Z"); // 23h away
    expect(estAnnulationTardive(debutAt, maintenant)).toBe(true);
  });

  it("is not late when cancelling more than 48h before the appointment", () => {
    const debutAt = new Date("2026-07-16T09:00:00.000Z"); // ~71h away
    expect(estAnnulationTardive(debutAt, maintenant)).toBe(false);
  });

  it("is late when cancelling after the appointment already started", () => {
    const debutAt = new Date("2026-07-13T09:00:00.000Z"); // 1h in the past
    expect(estAnnulationTardive(debutAt, maintenant)).toBe(true);
  });
});
