import { describe, expect, it } from "vitest";
import { computeDayStatus, computeWeek, type Report } from "./status";
import { addDays, currentWeekStart, defaultDay, isIsoDate, mondayOf, weekDays } from "./dates";

const NOW = Date.parse("2026-10-05T08:00:00Z");
const ago = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

describe("computeDayStatus", () => {
  it("retourne inconnu sans signalement", () => {
    const d = computeDayStatus("2026-10-05", [], null, NOW);
    expect(d.status).toBe("inconnu");
    expect(d.confidence).toBeNull();
  });

  it("un seul signalement est non confirmé", () => {
    const d = computeDayStatus("2026-10-05", [{ status: "bloque", createdAt: ago(1) }], null, NOW);
    expect(d.status).toBe("bloque");
    expect(d.confidence).toBe("non_confirme");
    expect(d.shares.bloque).toBe(100);
  });

  it("confirme à partir de 3 signalements concordants", () => {
    const d = computeDayStatus(
      "2026-10-05",
      [
        { status: "bloque", createdAt: ago(1) },
        { status: "bloque", createdAt: ago(0.5) },
        { status: "bloque", createdAt: ago(0.2) },
      ],
      null,
      NOW,
    );
    expect(d.confidence).toBe("confirme");
    expect(d.updatedAt).toBe(ago(0.2));
  });

  it("détecte les signalements contradictoires", () => {
    const d = computeDayStatus(
      "2026-10-05",
      [
        { status: "bloque", createdAt: ago(1) },
        { status: "normal", createdAt: ago(1) },
      ],
      null,
      NOW,
    );
    expect(d.confidence).toBe("contradictoire");
    // égalité : on retient le statut le plus prudent
    expect(d.status).toBe("bloque");
  });

  it("les signalements récents pèsent plus lourd", () => {
    const d = computeDayStatus(
      "2026-10-05",
      [
        { status: "bloque", createdAt: ago(24) },
        { status: "bloque", createdAt: ago(24) },
        { status: "normal", createdAt: ago(0.1) },
      ],
      null,
      NOW,
    );
    expect(d.status).toBe("normal");
  });

  it("le dernier signalement d'un référent l'emporte sur la foule", () => {
    const d = computeDayStatus(
      "2026-10-05",
      [
        { status: "bloque", createdAt: ago(0.1) },
        { status: "bloque", createdAt: ago(0.2) },
        { status: "bloque", createdAt: ago(0.3) },
        { status: "perturbe", createdAt: ago(3), referent: true },
        { status: "normal", createdAt: ago(1), referent: true },
      ],
      null,
      NOW,
    );
    expect(d.status).toBe("normal");
    expect(d.confidence).toBe("referent");
    expect(d.count).toBe(5);
  });

  it("une décision de modération l'emporte", () => {
    const d = computeDayStatus(
      "2026-10-05",
      [{ status: "bloque", createdAt: ago(1) }],
      { status: "normal", note: "Confirmé par la direction", updatedAt: ago(2) },
      NOW,
    );
    expect(d.status).toBe("normal");
    expect(d.confidence).toBe("officiel");
    expect(d.note).toBe("Confirmé par la direction");
    expect(d.updatedAt).toBe(ago(1));
  });
});

describe("computeWeek", () => {
  it("ne renvoie que les lycées ayant des données", () => {
    const days = weekDays("2026-10-05");
    const reports: Report[] = [{ id: "1", uai: "0950649P", date: "2026-10-06", status: "perturbe", createdAt: ago(1) }];
    const week = computeWeek(days, reports, [], NOW);
    expect(Object.keys(week)).toEqual(["0950649P"]);
    expect(week["0950649P"]).toHaveLength(6);
    expect(week["0950649P"][1].status).toBe("perturbe");
    expect(week["0950649P"][0].status).toBe("inconnu");
  });
});

describe("dates", () => {
  it("calcule le lundi et la semaine", () => {
    expect(mondayOf("2026-10-08")).toBe("2026-10-05");
    expect(weekDays("2026-10-05")).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
    ]);
  });

  it("le dimanche bascule sur la semaine suivante", () => {
    expect(currentWeekStart("2026-10-04")).toBe("2026-10-05");
    expect(defaultDay("2026-10-04")).toBe("2026-10-05");
    expect(currentWeekStart("2026-10-07")).toBe("2026-10-05");
  });

  it("gère le passage à l'heure d'hiver", () => {
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
  });

  it("valide les dates", () => {
    expect(isIsoDate("2026-10-05")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("05/10/2026")).toBe(false);
  });
});
