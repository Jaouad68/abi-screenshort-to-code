import { describe, expect, it } from "vitest";
import { calculerBilan, type AppointmentPourBilan } from "./bilan";

function rdv(overrides: Partial<AppointmentPourBilan>): AppointmentPourBilan {
  return {
    debutAt: new Date("2026-07-14T09:00:00.000Z"),
    finAt: new Date("2026-07-14T09:45:00.000Z"),
    statut: "HONORE",
    source: "EN_LIGNE",
    acompteCents: 0,
    acompteStatut: "AUCUN",
    prixCents: 3500,
    ...overrides,
  };
}

describe("calculerBilan", () => {
  it("counts a cancelled slot that was genuinely rebooked as recovered money", () => {
    const annule = rdv({ statut: "ANNULE", prixCents: 3500 });
    const remplacant = rdv({ statut: "HONORE", prixCents: 5000 }); // same time window
    const bilan = calculerBilan([annule, remplacant]);

    expect(bilan.creneauxRepriseCount).toBe(1);
    expect(bilan.creneauxRepriseCents).toBe(5000); // the replacement's price, not the original
    expect(bilan.creneauxNonReprisCount).toBe(0);
    expect(bilan.recupereCents).toBe(5000);
  });

  it("counts a cancelled slot nobody took as zero, but still reports it", () => {
    const annule = rdv({ statut: "ANNULE" });
    const bilan = calculerBilan([annule]);

    expect(bilan.creneauxNonReprisCount).toBe(1);
    expect(bilan.creneauxRepriseCount).toBe(0);
    expect(bilan.recupereCents).toBe(0);
  });

  it("does not match a cancelled slot against an appointment at a different time", () => {
    const annule = rdv({ statut: "ANNULE" });
    const ailleurs = rdv({
      statut: "HONORE",
      debutAt: new Date("2026-07-14T14:00:00.000Z"),
      finAt: new Date("2026-07-14T14:45:00.000Z"),
    });
    const bilan = calculerBilan([annule, ailleurs]);

    expect(bilan.creneauxNonReprisCount).toBe(1);
    expect(bilan.creneauxRepriseCount).toBe(0);
  });

  it("never double-counts the same replacement for two cancelled slots", () => {
    const annule1 = rdv({ statut: "ANNULE" });
    const annule2 = rdv({ statut: "ANNULE" });
    const remplacant = rdv({ statut: "HONORE", prixCents: 4000 });
    const bilan = calculerBilan([annule1, annule2, remplacant]);

    expect(bilan.creneauxRepriseCount).toBe(1);
    expect(bilan.creneauxNonReprisCount).toBe(1);
    expect(bilan.creneauxRepriseCents).toBe(4000);
  });

  it("sums kept deposits into the recovered total, alongside reprised slots", () => {
    const conserve = rdv({ statut: "NON_VENU", acompteStatut: "CONSERVE", acompteCents: 1500 });
    const bilan = calculerBilan([conserve]);

    expect(bilan.acomptesConservesCents).toBe(1500);
    expect(bilan.recupereCents).toBe(1500);
  });

  it("ignores deposits that were only requested, refunded, or never required", () => {
    const bilan = calculerBilan([
      rdv({ acompteStatut: "DEMANDE", acompteCents: 1000 }),
      rdv({ acompteStatut: "REMBOURSE", acompteCents: 1000 }),
      rdv({ acompteStatut: "REGLE", acompteCents: 1000 }),
      rdv({ acompteStatut: "AUCUN" }),
    ]);
    expect(bilan.acomptesConservesCents).toBe(0);
  });

  it("computes the no-show rate only among concluded appointments", () => {
    const bilan = calculerBilan([
      rdv({ statut: "HONORE" }),
      rdv({ statut: "HONORE" }),
      rdv({ statut: "NON_VENU" }),
      rdv({ statut: "RESERVE" }), // not concluded yet, excluded
      rdv({ statut: "ANNULE" }), // not a no-show, excluded
    ]);
    expect(bilan.tauxNonVenue).toBeCloseTo(1 / 3);
  });

  it("computes the online-booking share excluding cancelled appointments", () => {
    const bilan = calculerBilan([
      rdv({ source: "EN_LIGNE" }),
      rdv({ source: "EN_LIGNE" }),
      rdv({ source: "TELEPHONE" }),
      rdv({ source: "TELEPHONE", statut: "ANNULE" }), // excluded
    ]);
    expect(bilan.pourcentageEnLigne).toBeCloseTo(2 / 3);
  });

  it("returns zeroed KPIs for an empty month", () => {
    const bilan = calculerBilan([]);
    expect(bilan.tauxNonVenue).toBe(0);
    expect(bilan.pourcentageEnLigne).toBe(0);
    expect(bilan.recupereCents).toBe(0);
  });
});
