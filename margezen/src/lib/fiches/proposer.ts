import type { SupabaseClient } from "@supabase/supabase-js";
import { appellerGenerationFicheTechnique } from "../anthropic/genererFicheTechnique";
import { normaliserNomIngredient } from "../ingredients/normalisation";
import { genererFicheTechniqueAvecRetry } from "./generation";
import type { UniteIngredient } from "./schema";

interface PlatRow {
  id: string;
  nom: string;
  description: string | null;
  prix_vente_ttc_cts: number | null;
  etablissement_id: string;
}

interface IngredientConnuRow {
  id: string;
  nom_normalise: string;
  unite_ref: string;
  prix_unitaire_cts: number | null;
}

export interface IngredientExistant {
  id: string;
  nomNormalise: string;
  uniteRef: string;
  prixUnitaireCts: number | null;
}

export interface IngredientPropositionResultat {
  nomPropose: string;
  quantite: number;
  unite: UniteIngredient;
  ingredientExistant: IngredientExistant | null;
}

export type ResultatPropositionFiche =
  | {
      mode: "proposition";
      note: string | null;
      ingredients: IngredientPropositionResultat[];
    }
  | { mode: "manuel" }
  | { mode: "plat_introuvable" };

/**
 * Génère une proposition de fiche technique pour un plat et rapproche
 * chaque ingrédient proposé avec les ingrédients déjà connus de
 * l'établissement (par nom normalisé). Ne persiste rien : la création
 * effective des ingrédients et de la fiche technique n'a lieu qu'à la
 * validation explicite du restaurateur (« Cette fiche est bonne »).
 */
export async function proposerFicheTechniquePourPlat(
  supabase: SupabaseClient,
  platId: string,
): Promise<ResultatPropositionFiche> {
  const { data: plat, error: erreurPlat } = await supabase
    .from("plat")
    .select("id, nom, description, prix_vente_ttc_cts, etablissement_id")
    .eq("id", platId)
    .maybeSingle<PlatRow>();

  if (erreurPlat || !plat) {
    return { mode: "plat_introuvable" };
  }

  const { data: etablissement } = await supabase
    .from("etablissement")
    .select("type_cuisine")
    .eq("id", plat.etablissement_id)
    .maybeSingle<{ type_cuisine: string }>();

  const typeCuisine = etablissement?.type_cuisine ?? "traditionnel";

  const resultat = await genererFicheTechniqueAvecRetry((messageCorrection) =>
    appellerGenerationFicheTechnique(
      {
        nom: plat.nom,
        description: plat.description,
        prixTtcCts: plat.prix_vente_ttc_cts,
      },
      typeCuisine,
      messageCorrection,
    ),
  );

  if (resultat.type === "echec_definitif") {
    return { mode: "manuel" };
  }

  const { data: ingredientsConnus } = await supabase
    .from("ingredient")
    .select("id, nom_normalise, unite_ref, prix_unitaire_cts")
    .eq("etablissement_id", plat.etablissement_id)
    .returns<IngredientConnuRow[]>();

  const parNomNormalise = new Map(
    (ingredientsConnus ?? []).map((ingredient) => [
      ingredient.nom_normalise,
      ingredient,
    ]),
  );

  const ingredients: IngredientPropositionResultat[] =
    resultat.donnees.ingredients.map((ingredient) => {
      const connu = parNomNormalise.get(normaliserNomIngredient(ingredient.nom));
      return {
        nomPropose: ingredient.nom,
        quantite: ingredient.quantite,
        unite: ingredient.unite,
        ingredientExistant: connu
          ? {
              id: connu.id,
              nomNormalise: connu.nom_normalise,
              uniteRef: connu.unite_ref,
              prixUnitaireCts: connu.prix_unitaire_cts,
            }
          : null,
      };
    });

  return { mode: "proposition", note: resultat.donnees.note, ingredients };
}
