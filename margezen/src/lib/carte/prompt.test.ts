import { describe, expect, it } from "vitest";
import { PROMPT_IMPORT_CARTE } from "./prompt";

describe("PROMPT_IMPORT_CARTE", () => {
  it("exige un JSON valide unique", () => {
    expect(PROMPT_IMPORT_CARTE).toContain("UNIQUEMENT un JSON valide");
  });

  it("interdit d'inventer un plat ou un prix", () => {
    expect(PROMPT_IMPORT_CARTE).toContain("N'invente aucun plat, aucun prix");
  });

  it("demande d'ignorer les mentions légales et coordonnées", () => {
    expect(PROMPT_IMPORT_CARTE).toContain("mentions légales");
  });
});
