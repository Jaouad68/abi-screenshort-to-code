import { describe, expect, it } from "vitest";
import { confianceEffective, estFoncierSur, joursAvantReverification, niveauFoncier, type InfoFonciere } from "./foncier";

const JOUR = "2026-10-06";
const verifie = (date: string | null): InfoFonciere => ({ statutTf: "tf_mere", confianceTf: "verifie", dateVerificationTf: date });

describe("vérification foncière", () => {
  it("reste valable 90 jours, puis redevient déclarative", () => {
    expect(confianceEffective(verifie("2026-07-08"), JOUR)).toBe("verifie"); // 90 jours pile
    expect(confianceEffective(verifie("2026-07-07"), JOUR)).toBe("declaratif"); // 91 jours
    expect(joursAvantReverification(verifie("2026-09-28"), JOUR)).toBe(82);
  });

  it("une vérification sans date ne compte pas", () => {
    expect(confianceEffective(verifie(null), JOUR)).toBe("declaratif");
    expect(estFoncierSur(verifie(null), JOUR)).toBe(false);
  });

  it("n'accepte que les titres mère ou individuels vérifiés", () => {
    expect(estFoncierSur(verifie("2026-09-01"), JOUR)).toBe(true);
    expect(estFoncierSur({ ...verifie("2026-09-01"), statutTf: "tf_individuel" }, JOUR)).toBe(true);
    expect(estFoncierSur({ ...verifie("2026-09-01"), statutTf: "en_cours" }, JOUR)).toBe(false);
    expect(estFoncierSur({ ...verifie("2026-09-01"), confianceTf: "declaratif" }, JOUR)).toBe(false);
  });

  it("classe chaque programme pour les badges et la carte", () => {
    expect(niveauFoncier(verifie("2026-09-01"), JOUR)).toBe("sur");
    expect(niveauFoncier(verifie("2026-01-01"), JOUR)).toBe("declare");
    expect(niveauFoncier({ statutTf: "en_cours", confianceTf: "declaratif", dateVerificationTf: null }, JOUR)).toBe("en_cours");
    expect(niveauFoncier({ statutTf: "non_communique", confianceTf: "inconnu", dateVerificationTf: null }, JOUR)).toBe("risque");
  });
});
