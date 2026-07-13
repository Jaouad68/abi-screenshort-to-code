import { describe, expect, it } from "vitest";
import { analyserSms } from "./segments";
import {
  formatDateSmsFr,
  smsAccuseAnnulationClient,
  smsConfirmationClient,
  smsNotifGerantCreneauLibere,
  smsNotifGerantNouveauRdv,
  smsRappelJ2,
} from "./templates";

const infos = {
  salonNom: "Sandrine",
  clientPrenom: "Amelie",
  serviceNom: "Coupe femme",
  dateISO: "2026-07-14", // a Tuesday
  heure: "14:30",
  lien: "https://resazen.fr/b/9kmituvw",
};

describe("formatDateSmsFr", () => {
  it("spells out the French date without any accent", () => {
    expect(formatDateSmsFr("2026-07-14")).toBe("mardi 14 juillet");
  });

  it("never produces an accented month name (fevrier, aout, decembre)", () => {
    expect(formatDateSmsFr("2026-02-01")).toContain("fevrier");
    expect(formatDateSmsFr("2026-08-01")).toContain("aout");
    expect(formatDateSmsFr("2026-12-01")).toContain("decembre");
  });
});

describe("SMS templates", () => {
  const gabarits = [
    smsConfirmationClient(infos),
    smsRappelJ2(infos),
    smsAccuseAnnulationClient(infos),
    smsNotifGerantNouveauRdv(infos),
    smsNotifGerantCreneauLibere(infos),
  ];

  it("fit in a single GSM7 segment with realistic data", () => {
    for (const message of gabarits) {
      const { encodage, segments } = analyserSms(message);
      expect(encodage).toBe("GSM7");
      expect(segments).toBe(1);
    }
  });

  it("includes the cancellation link in the client-facing templates", () => {
    expect(smsConfirmationClient(infos)).toContain(infos.lien);
    expect(smsRappelJ2(infos)).toContain(infos.lien);
  });
});
