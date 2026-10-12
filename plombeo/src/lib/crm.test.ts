import { describe, expect, it } from "vitest";
import { clauseRecherche } from "@/lib/crm";
import { calculerNomAffichage, schemaClient, schemaEquipement, schemaLogement } from "@/lib/validation";

describe("calculerNomAffichage", () => {
  it("assemble prénom et nom pour un particulier", () => {
    expect(calculerNomAffichage({ type: "PARTICULIER", prenom: "Jean", nom: "Martin" })).toBe(
      "Jean Martin",
    );
  });

  it("tolère un prénom ou un nom manquant", () => {
    expect(calculerNomAffichage({ type: "PARTICULIER", nom: "Martin" })).toBe("Martin");
    expect(calculerNomAffichage({ type: "PARTICULIER", prenom: "Jean" })).toBe("Jean");
  });

  it("utilise la raison sociale pour un professionnel", () => {
    expect(
      calculerNomAffichage({
        type: "PROFESSIONNEL",
        raisonSociale: "Syndic Duval",
        prenom: "Jean",
        nom: "Martin",
      }),
    ).toBe("Syndic Duval");
  });

  it("ignore les espaces superflus", () => {
    expect(calculerNomAffichage({ type: "PARTICULIER", prenom: "  Jean ", nom: " Martin " })).toBe(
      "Jean Martin",
    );
  });
});

describe("schemaClient", () => {
  const base = {
    type: "PARTICULIER" as const,
    civilite: "",
    prenom: "",
    nom: "",
    raisonSociale: "",
    siret: "",
    tvaIntracommunautaire: "",
    contactNom: "",
    email: "",
    telephone: "",
    telephoneSecondaire: "",
    adresse: "",
    codePostal: "",
    ville: "",
    notes: "",
  };

  it("accepte un particulier avec le seul nom", () => {
    expect(schemaClient.safeParse({ ...base, nom: "Martin" }).success).toBe(true);
  });

  // Le cahier des charges insiste sur la rapidité de saisie : une fiche prise
  // en urgence n'a souvent qu'un nom et un téléphone.
  it("n'exige aucun autre champ", () => {
    const r = schemaClient.safeParse({ ...base, nom: "Martin", telephone: "0612345678" });
    expect(r.success).toBe(true);
  });

  it("refuse un client sans aucun nom", () => {
    expect(schemaClient.safeParse(base).success).toBe(false);
  });

  it("refuse un professionnel sans raison sociale", () => {
    const r = schemaClient.safeParse({ ...base, type: "PROFESSIONNEL", nom: "Martin" });
    expect(r.success).toBe(false);
  });

  it("accepte un professionnel avec sa seule raison sociale", () => {
    const r = schemaClient.safeParse({
      ...base,
      type: "PROFESSIONNEL",
      raisonSociale: "Syndic Duval",
    });
    expect(r.success).toBe(true);
  });

  it("valide la forme du SIRET sans juger de sa validité réelle", () => {
    expect(schemaClient.safeParse({ ...base, nom: "M", siret: "12345678901234" }).success).toBe(true);
    expect(schemaClient.safeParse({ ...base, nom: "M", siret: "123" }).success).toBe(false);
    expect(schemaClient.safeParse({ ...base, nom: "M", siret: "" }).success).toBe(true);
  });

  it("refuse un e-mail mal formé mais accepte un champ vide", () => {
    expect(schemaClient.safeParse({ ...base, nom: "M", email: "pas-un-email" }).success).toBe(false);
    expect(schemaClient.safeParse({ ...base, nom: "M", email: "" }).success).toBe(true);
  });
});

describe("schemaLogement", () => {
  const base = {
    libelle: "",
    type: "MAISON" as const,
    adresse: "",
    complement: "",
    codePostal: "",
    ville: "",
    etage: "",
    digicode: "",
    interphone: "",
    instructionsAcces: "",
    anneeConstruction: "",
    notes: "",
  };

  it("accepte un logement entièrement vide", () => {
    expect(schemaLogement.safeParse(base).success).toBe(true);
  });

  it("valide l'année de construction", () => {
    expect(schemaLogement.safeParse({ ...base, anneeConstruction: "1975" }).success).toBe(true);
    expect(schemaLogement.safeParse({ ...base, anneeConstruction: "75" }).success).toBe(false);
    expect(schemaLogement.safeParse({ ...base, anneeConstruction: "1200" }).success).toBe(false);
    expect(schemaLogement.safeParse({ ...base, anneeConstruction: "3000" }).success).toBe(false);
  });
});

describe("schemaEquipement", () => {
  const base = {
    categorie: "CHAUDIERE" as const,
    marque: "",
    modele: "",
    numeroSerie: "",
    localisation: "",
    datePose: "",
    finGarantie: "",
    prochainEntretien: "",
    notes: "",
  };

  // Contrainte produit assumée : le matériel rencontré est trop divers pour
  // qu'on puisse exiger une marque ou un numéro de série sans produire du faux.
  it("n'exige rien d'autre que la catégorie", () => {
    expect(schemaEquipement.safeParse(base).success).toBe(true);
  });

  it("refuse une date invalide", () => {
    expect(schemaEquipement.safeParse({ ...base, datePose: "pas-une-date" }).success).toBe(false);
    expect(schemaEquipement.safeParse({ ...base, datePose: "2024-03-15" }).success).toBe(true);
    expect(schemaEquipement.safeParse({ ...base, datePose: "" }).success).toBe(true);
  });
});

describe("clauseRecherche", () => {
  it("ne filtre pas sur une recherche vide", () => {
    expect(clauseRecherche("")).toBeUndefined();
    expect(clauseRecherche("   ")).toBeUndefined();
  });

  it("cherche sur les champs du client et de ses logements", () => {
    const clause = clauseRecherche("martin");
    const champs = JSON.stringify(clause);
    expect(champs).toContain("nomAffichage");
    expect(champs).toContain("telephone");
    expect(champs).toContain("ville");
    // Un artisan cherche aussi bien un nom qu'une adresse d'intervention.
    expect(champs).toContain("properties");
  });

  it("est insensible à la casse et ignore les espaces superflus", () => {
    const clause = clauseRecherche("  Martin  ");
    expect(JSON.stringify(clause)).toContain('"contains":"Martin"');
    expect(JSON.stringify(clause)).toContain('"mode":"insensitive"');
  });
});
