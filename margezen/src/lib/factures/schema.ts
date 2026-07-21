import { z } from "zod";

/**
 * Schéma strict de la réponse attendue de l'extraction de facture par
 * vision. Toute sortie LLM passe par ce schéma avant d'être utilisée —
 * jamais de donnée non validée en base.
 */

export const uniteLigneFactureSchema = z.enum(["kg", "L", "piece", "carton"]);

export const ligneExtractionSchema = z.object({
  libelle_brut: z.string().min(1),
  quantite: z.number().nullable(),
  unite: uniteLigneFactureSchema.nullable(),
  prix_unitaire_ht: z.number().nullable(),
  total_ht: z.number().nullable(),
  confiance: z.number().min(0).max(1),
});

export const factureExtraiteSchema = z.object({
  fournisseur: z.string().nullable(),
  date_facture: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date_facture doit être au format YYYY-MM-DD")
    .nullable(),
  total_ht: z.number().nullable(),
  lignes: z.array(ligneExtractionSchema),
});

export const documentNonReconnuSchema = z.object({
  erreur: z.literal("document_non_reconnu"),
});

export type LigneExtraction = z.infer<typeof ligneExtractionSchema>;
export type FactureExtraite = z.infer<typeof factureExtraiteSchema>;
