import { describe, expect, it } from "vitest";
import {
  calculerEmpreinte,
  calculerSolde,
  estEnRetard,
  formaterNumeroFacture,
  statutSelonPaiements,
  type ContenuFacture,
} from "@/lib/facturation";
import { transitionFactureAutorisee } from "@/lib/etats";
import type { FactureStatut } from "@/generated/prisma/enums";

const TOUS: FactureStatut[] = [
  "BROUILLON",
  "EMISE",
  "ENVOYEE",
  "PARTIELLEMENT_PAYEE",
  "PAYEE",
];

/* -------------------------------------------------------------------------- */
/* Empreinte d'intégrité                                                      */
/* -------------------------------------------------------------------------- */

const contenu: ContenuFacture = {
  numero: "FAC-2026-001",
  dateFacture: new Date("2026-03-01T10:00:00Z"),
  clientNom: "Luc Bernard",
  totalHtCents: 15000,
  totalTvaCents: 3000,
  totalTtcCents: 18000,
  lignes: [
    { libelle: "Main-d'œuvre", quantiteMilli: 2500, prixUnitaireCents: 6000, tauxTvaCentiemes: 2000 },
  ],
};

describe("empreinte d'intégrité", () => {
  it("est déterministe", () => {
    expect(calculerEmpreinte(contenu)).toBe(calculerEmpreinte(contenu));
  });

  it("produit un condensé SHA-256", () => {
    expect(calculerEmpreinte(contenu)).toMatch(/^[0-9a-f]{64}$/);
  });

  /*
   * Cœur du mécanisme : TOUTE modification du contenu doit changer l'empreinte.
   * Un champ oublié dans la sérialisation laisserait passer une altération.
   */
  it("change dès qu'un élément du contenu change", () => {
    const reference = calculerEmpreinte(contenu);

    const variantes: ContenuFacture[] = [
      { ...contenu, numero: "FAC-2026-002" },
      { ...contenu, dateFacture: new Date("2026-03-02T10:00:00Z") },
      { ...contenu, clientNom: "Luc Bernardo" },
      { ...contenu, totalHtCents: 15001 },
      { ...contenu, totalTvaCents: 3001 },
      { ...contenu, totalTtcCents: 18001 },
      // Modification d'une ligne : le montant total pourrait rester identique
      // tout en changeant la composition.
      { ...contenu, lignes: [{ ...contenu.lignes[0]!, libelle: "Main d'oeuvre" }] },
      { ...contenu, lignes: [{ ...contenu.lignes[0]!, quantiteMilli: 2501 }] },
      { ...contenu, lignes: [{ ...contenu.lignes[0]!, prixUnitaireCents: 6001 }] },
      { ...contenu, lignes: [{ ...contenu.lignes[0]!, tauxTvaCentiemes: 1000 }] },
      // Ajout ou suppression de ligne.
      { ...contenu, lignes: [] },
      { ...contenu, lignes: [...contenu.lignes, ...contenu.lignes] },
    ];

    for (const variante of variantes) {
      expect(calculerEmpreinte(variante)).not.toBe(reference);
    }
  });

  it("distingue deux lignes échangées", () => {
    const a: ContenuFacture = {
      ...contenu,
      lignes: [
        { libelle: "A", quantiteMilli: 1000, prixUnitaireCents: 100, tauxTvaCentiemes: 2000 },
        { libelle: "B", quantiteMilli: 1000, prixUnitaireCents: 200, tauxTvaCentiemes: 2000 },
      ],
    };
    const b: ContenuFacture = { ...a, lignes: [a.lignes[1]!, a.lignes[0]!] };
    expect(calculerEmpreinte(a)).not.toBe(calculerEmpreinte(b));
  });
});

/* -------------------------------------------------------------------------- */
/* Soldes                                                                     */
/* -------------------------------------------------------------------------- */

describe("calculerSolde", () => {
  it("calcule un solde sans paiement", () => {
    const s = calculerSolde(12000, []);
    expect(s.resteCents).toBe(12000);
    expect(s.paiementsCents).toBe(0);
    expect(s.surPaye).toBe(false);
  });

  it("additionne les paiements partiels", () => {
    const s = calculerSolde(12000, [{ montantCents: 4000 }, { montantCents: 3000 }]);
    expect(s.paiementsCents).toBe(7000);
    expect(s.resteCents).toBe(5000);
  });

  it("solde une facture entièrement payée", () => {
    const s = calculerSolde(12000, [{ montantCents: 12000 }]);
    expect(s.resteCents).toBe(0);
    expect(s.surPaye).toBe(false);
  });

  // Une saisie en trop doit être visible, pas absorbée en silence.
  it("signale un sur-paiement", () => {
    const s = calculerSolde(12000, [{ montantCents: 13000 }]);
    expect(s.surPaye).toBe(true);
    expect(s.resteCents).toBe(-1000);
  });

  it("déduit les avoirs du montant dû", () => {
    const s = calculerSolde(12000, [], [{ montantTtcCents: 2000 }]);
    expect(s.avoirsCents).toBe(2000);
    expect(s.duCents).toBe(10000);
    expect(s.resteCents).toBe(10000);
  });

  it("combine avoirs et paiements", () => {
    const s = calculerSolde(12000, [{ montantCents: 5000 }], [{ montantTtcCents: 2000 }]);
    expect(s.duCents).toBe(10000);
    expect(s.resteCents).toBe(5000);
  });

  // Un avoir total annule la créance ; il ne la rend pas négative.
  it("ne rend jamais le montant dû négatif", () => {
    const s = calculerSolde(12000, [], [{ montantTtcCents: 20000 }]);
    expect(s.duCents).toBe(0);
    expect(s.resteCents).toBe(0);
  });
});

describe("statutSelonPaiements", () => {
  it("laisse un brouillon en brouillon, quels que soient les paiements", () => {
    const solde = calculerSolde(12000, [{ montantCents: 12000 }]);
    expect(statutSelonPaiements("BROUILLON", solde)).toBe("BROUILLON");
  });

  it("passe en partiellement payée dès le premier encaissement", () => {
    const solde = calculerSolde(12000, [{ montantCents: 4000 }]);
    expect(statutSelonPaiements("ENVOYEE", solde)).toBe("PARTIELLEMENT_PAYEE");
  });

  it("passe en payée au solde complet", () => {
    const solde = calculerSolde(12000, [{ montantCents: 12000 }]);
    expect(statutSelonPaiements("PARTIELLEMENT_PAYEE", solde)).toBe("PAYEE");
  });

  it("considère payée une facture entièrement avoirée", () => {
    const solde = calculerSolde(12000, [], [{ montantTtcCents: 12000 }]);
    expect(statutSelonPaiements("ENVOYEE", solde)).toBe("PAYEE");
  });

  // Retirer un paiement saisi par erreur doit faire revenir la facture en arrière.
  it("revient en arrière si les paiements sont retirés", () => {
    const solde = calculerSolde(12000, []);
    expect(statutSelonPaiements("PAYEE", solde)).toBe("EMISE");
    expect(statutSelonPaiements("PARTIELLEMENT_PAYEE", solde)).toBe("EMISE");
  });

  it("conserve l'état d'envoi tant qu'aucun paiement n'est enregistré", () => {
    const solde = calculerSolde(12000, []);
    expect(statutSelonPaiements("ENVOYEE", solde)).toBe("ENVOYEE");
    expect(statutSelonPaiements("EMISE", solde)).toBe("EMISE");
  });
});

describe("estEnRetard", () => {
  const hier = new Date(Date.now() - 86400_000);
  const demain = new Date(Date.now() + 86400_000);

  it("signale une facture échue et impayée", () => {
    expect(estEnRetard({ statut: "ENVOYEE", dateEcheance: hier }, 5000)).toBe(true);
  });

  it("ne signale pas une facture payée ni un brouillon", () => {
    expect(estEnRetard({ statut: "PAYEE", dateEcheance: hier }, 0)).toBe(false);
    expect(estEnRetard({ statut: "BROUILLON", dateEcheance: hier }, 5000)).toBe(false);
  });

  it("ne signale pas une échéance à venir, ni une facture sans échéance", () => {
    expect(estEnRetard({ statut: "ENVOYEE", dateEcheance: demain }, 5000)).toBe(false);
    expect(estEnRetard({ statut: "ENVOYEE", dateEcheance: null }, 5000)).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Machine à états                                                            */
/* -------------------------------------------------------------------------- */

describe("machine à états de la facture", () => {
  it("permet l'émission puis l'envoi", () => {
    expect(transitionFactureAutorisee("BROUILLON", "EMISE")).toBe(true);
    expect(transitionFactureAutorisee("EMISE", "ENVOYEE")).toBe(true);
  });

  /*
   * LE point de la phase (§14). Une facture émise ne redevient JAMAIS un
   * brouillon : ce serait rouvrir une pièce comptable. La correction passe par
   * un avoir.
   */
  it("ne permet jamais de revenir à l'état brouillon", () => {
    for (const de of TOUS.filter((s) => s !== "BROUILLON")) {
      expect(transitionFactureAutorisee(de, "BROUILLON")).toBe(false);
    }
  });

  // Contrairement au devis, il n'existe aucun état « annulée » après émission.
  it("n'offre aucune sortie depuis les états postérieurs à l'envoi", () => {
    for (const de of ["ENVOYEE", "PARTIELLEMENT_PAYEE", "PAYEE"] as const) {
      for (const vers of TOUS) {
        expect(transitionFactureAutorisee(de, vers)).toBe(false);
      }
    }
  });

  // PARTIELLEMENT_PAYEE et PAYEE sont dérivés des paiements : on ne doit pas
  // pouvoir les choisir à la main, sinon le suivi des impayés ne vaut rien.
  it("n'autorise aucune transition manuelle vers un état de paiement", () => {
    for (const de of TOUS) {
      expect(transitionFactureAutorisee(de, "PAYEE")).toBe(false);
      expect(transitionFactureAutorisee(de, "PARTIELLEMENT_PAYEE")).toBe(false);
    }
  });
});

describe("numérotation", () => {
  it("distingue les séries facture et avoir", () => {
    expect(formaterNumeroFacture("FACTURE", 2026, 1)).toBe("FAC-2026-001");
    expect(formaterNumeroFacture("AVOIR", 2026, 1)).toBe("AV-2026-001");
  });

  it("complète sur trois chiffres sans tronquer au-delà", () => {
    expect(formaterNumeroFacture("FACTURE", 2026, 42)).toBe("FAC-2026-042");
    expect(formaterNumeroFacture("FACTURE", 2026, 1234)).toBe("FAC-2026-1234");
  });
});
