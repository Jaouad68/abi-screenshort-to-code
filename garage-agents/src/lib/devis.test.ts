import { describe, expect, it } from "vitest";
import { devisDoitEtreRelance, devisDoitProposerPaiementFractionne, joursEcoules } from "./devis";

describe("joursEcoules", () => {
  it("compte les jours pleins écoulés", () => {
    expect(joursEcoules(new Date("2026-04-15"), new Date("2026-08-15"))).toBe(122);
  });

  it("ne renvoie jamais une valeur négative", () => {
    expect(joursEcoules(new Date("2026-08-20"), new Date("2026-08-15"))).toBe(0);
  });
});

describe("devisDoitEtreRelance", () => {
  it("ne relance pas avant le délai configuré", () => {
    expect(
      devisDoitEtreRelance({
        emisLe: new Date("2026-08-01"),
        derniereRelanceLe: null,
        relanceApresJours: 30,
        statut: "EN_ATTENTE",
        aujourdHui: new Date("2026-08-15"),
      })
    ).toBe(false);
  });

  it("relance une fois le délai écoulé depuis l'émission", () => {
    expect(
      devisDoitEtreRelance({
        emisLe: new Date("2026-04-01"),
        derniereRelanceLe: null,
        relanceApresJours: 30,
        statut: "EN_ATTENTE",
        aujourdHui: new Date("2026-08-15"),
      })
    ).toBe(true);
  });

  it("compte depuis la dernière relance, pas l'émission d'origine", () => {
    expect(
      devisDoitEtreRelance({
        emisLe: new Date("2026-01-01"),
        derniereRelanceLe: new Date("2026-08-01"),
        relanceApresJours: 30,
        statut: "RELANCE",
        aujourdHui: new Date("2026-08-15"),
      })
    ).toBe(false);
  });

  it("ne relance jamais un devis signé ou perdu", () => {
    expect(
      devisDoitEtreRelance({
        emisLe: new Date("2026-01-01"),
        derniereRelanceLe: null,
        relanceApresJours: 30,
        statut: "SIGNE",
        aujourdHui: new Date("2026-08-15"),
      })
    ).toBe(false);
    expect(
      devisDoitEtreRelance({
        emisLe: new Date("2026-01-01"),
        derniereRelanceLe: null,
        relanceApresJours: 30,
        statut: "PERDU",
        aujourdHui: new Date("2026-08-15"),
      })
    ).toBe(false);
  });
});

describe("devisDoitProposerPaiementFractionne", () => {
  it("propose le paiement fractionné une fois le seuil dépassé", () => {
    expect(
      devisDoitProposerPaiementFractionne({
        emisLe: new Date("2026-06-01"),
        paiementFractionneApresJours: 60,
        dejaPropose: false,
        statut: "RELANCE",
        aujourdHui: new Date("2026-08-15"),
      })
    ).toBe(true);
  });

  it("ne propose pas deux fois", () => {
    expect(
      devisDoitProposerPaiementFractionne({
        emisLe: new Date("2026-06-01"),
        paiementFractionneApresJours: 60,
        dejaPropose: true,
        statut: "RELANCE",
        aujourdHui: new Date("2026-08-15"),
      })
    ).toBe(false);
  });

  it("ne propose rien sur un devis déjà signé", () => {
    expect(
      devisDoitProposerPaiementFractionne({
        emisLe: new Date("2026-06-01"),
        paiementFractionneApresJours: 60,
        dejaPropose: false,
        statut: "SIGNE",
        aujourdHui: new Date("2026-08-15"),
      })
    ).toBe(false);
  });
});
