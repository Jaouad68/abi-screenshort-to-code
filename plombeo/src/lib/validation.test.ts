import { describe, expect, it } from "vitest";
import {
  LONGUEUR_MIN_MOT_DE_PASSE,
  normaliserEmail,
  schemaConnexion,
  schemaInscription,
  schemaOrganisation,
} from "@/lib/validation";

describe("normaliserEmail", () => {
  it("met en minuscules et supprime les espaces", () => {
    expect(normaliserEmail("  Jean.Martin@Exemple.FR ")).toBe("jean.martin@exemple.fr");
  });
});

describe("schemaInscription", () => {
  const valide = {
    email: "plombier@exemple.fr",
    motDePasse: "unMotDePasseAssezLong",
    nomEntreprise: "Plomberie Martin",
  };

  it("accepte une inscription valide et normalise l'e-mail", () => {
    const resultat = schemaInscription.safeParse({ ...valide, email: "Plombier@Exemple.FR" });
    expect(resultat.success).toBe(true);
    if (resultat.success) expect(resultat.data.email).toBe("plombier@exemple.fr");
  });

  it("refuse un mot de passe trop court", () => {
    const court = "a".repeat(LONGUEUR_MIN_MOT_DE_PASSE - 1);
    expect(schemaInscription.safeParse({ ...valide, motDePasse: court }).success).toBe(false);
  });

  it("refuse un e-mail mal formé", () => {
    expect(schemaInscription.safeParse({ ...valide, email: "pas-un-email" }).success).toBe(false);
  });

  it("refuse un nom d'entreprise vide", () => {
    expect(schemaInscription.safeParse({ ...valide, nomEntreprise: "   " }).success).toBe(false);
  });
});

describe("schemaConnexion", () => {
  // La contrainte de longueur ne s'applique qu'à la création : l'imposer à la
  // connexion révélerait le format attendu et casserait les comptes anciens.
  it("accepte un mot de passe court à la connexion", () => {
    const resultat = schemaConnexion.safeParse({ email: "a@b.fr", motDePasse: "court" });
    expect(resultat.success).toBe(true);
  });

  it("refuse un mot de passe vide", () => {
    expect(schemaConnexion.safeParse({ email: "a@b.fr", motDePasse: "" }).success).toBe(false);
  });
});

describe("schemaOrganisation", () => {
  const base = {
    nom: "Plomberie Martin",
    formeJuridique: "",
    siret: "",
    adresse: "",
    codePostal: "",
    ville: "",
    telephone: "",
    email: "",
  };

  it("accepte des champs facultatifs vides", () => {
    expect(schemaOrganisation.safeParse(base).success).toBe(true);
  });

  it("accepte un SIRET de 14 chiffres", () => {
    expect(schemaOrganisation.safeParse({ ...base, siret: "12345678901234" }).success).toBe(true);
  });

  it("refuse un SIRET dont la forme est incorrecte", () => {
    expect(schemaOrganisation.safeParse({ ...base, siret: "123" }).success).toBe(false);
    expect(schemaOrganisation.safeParse({ ...base, siret: "1234567890123A" }).success).toBe(false);
  });

  it("refuse un code postal mal formé mais accepte un champ vide", () => {
    expect(schemaOrganisation.safeParse({ ...base, codePostal: "7500" }).success).toBe(false);
    expect(schemaOrganisation.safeParse({ ...base, codePostal: "75000" }).success).toBe(true);
    expect(schemaOrganisation.safeParse({ ...base, codePostal: "" }).success).toBe(true);
  });
});
