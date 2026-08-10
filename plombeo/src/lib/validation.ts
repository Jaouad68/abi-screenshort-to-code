import { z } from "zod";

/** Longueur minimale du mot de passe. Choix produit, pas une obligation légale. */
export const LONGUEUR_MIN_MOT_DE_PASSE = 12;

/** Normalise un e-mail avant comparaison et stockage (unicité fiable). */
export function normaliserEmail(email: string): string {
  return email.trim().toLowerCase();
}

const email = z
  .string()
  .trim()
  .min(1, "L'adresse e-mail est obligatoire.")
  .email("Cette adresse e-mail n'est pas valide.")
  .transform(normaliserEmail);

const motDePasse = z
  .string()
  .min(
    LONGUEUR_MIN_MOT_DE_PASSE,
    `Le mot de passe doit contenir au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`,
  )
  // Borne haute : bcrypt ignore silencieusement les octets au-delà de 72.
  .max(200, "Le mot de passe est trop long.");

export const schemaInscription = z.object({
  email,
  motDePasse,
  nomEntreprise: z
    .string()
    .trim()
    .min(1, "Le nom de votre entreprise est obligatoire.")
    .max(120, "Le nom de votre entreprise est trop long."),
});

export const schemaConnexion = z.object({
  email,
  // Pas de contrainte de longueur ici : la règle de robustesse s'applique à la
  // création du mot de passe, pas à sa saisie. L'imposer ici révélerait le format
  // attendu et ferait échouer les comptes créés sous une règle antérieure.
  motDePasse: z.string().min(1, "Le mot de passe est obligatoire."),
});

/**
 * SIRET : validation de FORME uniquement (14 chiffres).
 *
 * [À VÉRIFIER — SOURCE OFFICIELLE] La validité réelle d'un SIRET (clé de contrôle,
 * existence de l'établissement) relève de l'INSEE / des sources officielles. On ne
 * la déduit pas ici : refuser un SIRET réel à cause d'une règle mal reproduite
 * serait plus grave que d'en accepter un erroné, corrigeable par l'artisan.
 */
const siret = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{14}$/.test(v), "Un SIRET comporte 14 chiffres.");

const codePostal = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{5}$/.test(v), "Un code postal comporte 5 chiffres.");

export const schemaOrganisation = z.object({
  nom: z
    .string()
    .trim()
    .min(1, "Le nom de votre entreprise est obligatoire.")
    .max(120, "Le nom de votre entreprise est trop long."),
  formeJuridique: z.string().trim().max(80).default(""),
  siret,
  adresse: z.string().trim().max(200).default(""),
  codePostal,
  ville: z.string().trim().max(100).default(""),
  telephone: z.string().trim().max(30).default(""),
  email: z
    .string()
    .trim()
    .max(160)
    .refine(
      (v) => v === "" || z.string().email().safeParse(v).success,
      "Cette adresse e-mail n'est pas valide.",
    ),
});

/** Premier message d'erreur d'un résultat Zod, pour l'affichage à l'artisan. */
export function premiereErreur(erreur: z.ZodError): string {
  return erreur.issues[0]?.message ?? "Les informations saisies ne sont pas valides.";
}

/* -------------------------------------------------------------------------- */
/* Phase 2 — CRM                                                              */
/* -------------------------------------------------------------------------- */

const emailFacultatif = z
  .string()
  .trim()
  .max(160)
  .refine(
    (v) => v === "" || z.string().email().safeParse(v).success,
    "Cette adresse e-mail n'est pas valide.",
  );

/**
 * Nom affiché dans les listes et les documents.
 *
 * Dérivé du type : c'est la raison sociale pour un professionnel, « Prénom Nom »
 * pour un particulier. Calculé côté serveur plutôt que saisi, pour ne pas
 * dépendre d'un champ caché que le client pourrait falsifier.
 */
export function calculerNomAffichage(saisie: {
  type: "PARTICULIER" | "PROFESSIONNEL";
  prenom?: string;
  nom?: string;
  raisonSociale?: string;
}): string {
  if (saisie.type === "PROFESSIONNEL") return (saisie.raisonSociale ?? "").trim();
  return [saisie.prenom, saisie.nom]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

const siretFacultatif = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{14}$/.test(v), "Un SIRET comporte 14 chiffres.");

const codePostalFacultatif = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{5}$/.test(v), "Un code postal comporte 5 chiffres.");

export const schemaClient = z
  .object({
    type: z.enum(["PARTICULIER", "PROFESSIONNEL"]),
    civilite: z.string().trim().max(10).default(""),
    prenom: z.string().trim().max(80).default(""),
    nom: z.string().trim().max(80).default(""),
    raisonSociale: z.string().trim().max(120).default(""),
    siret: siretFacultatif,
    tvaIntracommunautaire: z.string().trim().max(20).default(""),
    contactNom: z.string().trim().max(120).default(""),
    email: emailFacultatif,
    telephone: z.string().trim().max(30).default(""),
    telephoneSecondaire: z.string().trim().max(30).default(""),
    adresse: z.string().trim().max(200).default(""),
    codePostal: codePostalFacultatif,
    ville: z.string().trim().max(100).default(""),
    notes: z.string().trim().max(5000).default(""),
  })
  // Un seul champ réellement obligatoire : de quoi nommer le client. Le reste
  // peut être complété plus tard — une fiche saisie sur chantier n'a souvent
  // qu'un nom et un téléphone.
  .refine((v) => calculerNomAffichage(v).length > 0, {
    message: "Indiquez au moins un nom (ou une raison sociale pour un professionnel).",
    path: ["nom"],
  });

export const schemaLogement = z.object({
  libelle: z.string().trim().max(120).default(""),
  type: z.enum(["MAISON", "APPARTEMENT", "LOCAL_COMMERCIAL", "IMMEUBLE", "AUTRE"]),
  adresse: z.string().trim().max(200).default(""),
  complement: z.string().trim().max(200).default(""),
  codePostal: codePostalFacultatif,
  ville: z.string().trim().max(100).default(""),
  etage: z.string().trim().max(40).default(""),
  digicode: z.string().trim().max(40).default(""),
  interphone: z.string().trim().max(80).default(""),
  instructionsAcces: z.string().trim().max(2000).default(""),
  anneeConstruction: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (/^\d{4}$/.test(v) && Number(v) >= 1700 && Number(v) <= new Date().getFullYear() + 1),
      "Indiquez une année à 4 chiffres.",
    ),
  notes: z.string().trim().max(5000).default(""),
});

/** Date facultative au format d'un champ `<input type="date">`. */
const dateFacultative = z
  .string()
  .trim()
  .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Cette date n'est pas valide.");

export const schemaEquipement = z.object({
  categorie: z.enum([
    "CHAUDIERE",
    "CHAUFFE_EAU",
    "POMPE_A_CHALEUR",
    "CLIMATISATION",
    "ADOUCISSEUR",
    "VMC",
    "SANITAIRE",
    "ROBINETTERIE",
    "CANALISATION",
    "AUTRE",
  ]),
  marque: z.string().trim().max(80).default(""),
  modele: z.string().trim().max(120).default(""),
  numeroSerie: z.string().trim().max(80).default(""),
  localisation: z.string().trim().max(120).default(""),
  datePose: dateFacultative,
  finGarantie: dateFacultative,
  prochainEntretien: dateFacultative,
  notes: z.string().trim().max(5000).default(""),
});

/** Convertit une saisie de date facultative en `Date` ou `null` pour Prisma. */
export function versDate(valeur: string): Date | null {
  const v = valeur.trim();
  return v === "" ? null : new Date(v);
}
