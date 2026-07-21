import { z } from "zod";

export const categoriePlatSchema = z.enum(["entree", "plat", "dessert", "boisson"]);

export const platExtraitSchema = z.object({
  nom: z.string().min(1),
  description: z.string().nullable(),
  categorie: categoriePlatSchema,
  prix_ttc: z.number().nullable(),
});

export const carteExtraiteSchema = z.object({
  plats: z.array(platExtraitSchema),
});

export type PlatExtrait = z.infer<typeof platExtraitSchema>;
export type CarteExtraite = z.infer<typeof carteExtraiteSchema>;
