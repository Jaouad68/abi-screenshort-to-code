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
