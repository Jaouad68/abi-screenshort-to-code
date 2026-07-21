import { z } from "zod";

export const uniteIngredientSchema = z.enum(["kg", "L", "piece"]);

export const ingredientProposeSchema = z.object({
  nom: z.string().min(1),
  quantite: z.number().nonnegative(),
  unite: uniteIngredientSchema,
});

export const propositionFicheTechniqueSchema = z.object({
  ingredients: z.array(ingredientProposeSchema),
  note: z.string().nullable(),
});

export type UniteIngredient = z.infer<typeof uniteIngredientSchema>;
export type IngredientPropose = z.infer<typeof ingredientProposeSchema>;
export type PropositionFicheTechnique = z.infer<
  typeof propositionFicheTechniqueSchema
>;
