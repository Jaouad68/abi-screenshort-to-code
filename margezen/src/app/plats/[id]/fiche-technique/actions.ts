"use server";

import { revalidatePath } from "next/cache";
import { normaliserNomIngredient } from "@/lib/ingredients/normalisation";
import { creerClientServeur } from "@/lib/supabase/server";

export interface LigneFicheAValider {
  /** null si l'ingrédient n'existait pas encore et doit être créé. */
  ingredientId: string | null;
  nomIngredient: string;
  quantite: number;
  unite: "kg" | "L" | "piece";
  /** Prix saisi par l'utilisateur si l'ingrédient n'en avait pas — jamais deviné. */
  prixUnitaireCts: number | null;
}

/**
 * Persiste la fiche technique corrigée : crée les ingrédients qui
 * n'existaient pas encore, met à jour le prix des ingrédients existants
 * si l'utilisateur en a saisi un, puis enregistre chaque ligne de la
 * fiche technique. Chaque prix vient d'une saisie explicite — jamais
 * d'estimation silencieuse.
 */
export async function validerFicheTechnique(
  platId: string,
  etablissementId: string,
  lignes: LigneFicheAValider[],
): Promise<void> {
  const supabase = await creerClientServeur();

  for (const ligne of lignes) {
    let ingredientId = ligne.ingredientId;

    if (ingredientId) {
      if (ligne.prixUnitaireCts !== null) {
        const { error } = await supabase
          .from("ingredient")
          .update({ prix_unitaire_cts: ligne.prixUnitaireCts })
          .eq("id", ingredientId);

        if (error) {
          throw new Error(
            `Échec de la mise à jour du prix de l'ingrédient : ${error.message}`,
          );
        }
      }
    } else {
      const { data: nouvelIngredient, error } = await supabase
        .from("ingredient")
        .insert({
          etablissement_id: etablissementId,
          nom_normalise: normaliserNomIngredient(ligne.nomIngredient),
          unite_ref: ligne.unite,
          prix_unitaire_cts: ligne.prixUnitaireCts,
          source: "manuel",
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(
          `Échec de la création de l'ingrédient « ${ligne.nomIngredient} » : ${error.message}`,
        );
      }
      ingredientId = nouvelIngredient.id;
    }

    const { error: erreurFiche } = await supabase.from("fiche_technique").upsert(
      {
        plat_id: platId,
        ingredient_id: ingredientId,
        quantite: ligne.quantite,
        unite: ligne.unite,
      },
      { onConflict: "plat_id,ingredient_id" },
    );

    if (erreurFiche) {
      throw new Error(
        `Échec de l'enregistrement de la fiche technique : ${erreurFiche.message}`,
      );
    }
  }

  revalidatePath(`/plats/${platId}/fiche-technique`);
}
