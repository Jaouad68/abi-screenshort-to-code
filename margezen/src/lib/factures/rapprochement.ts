import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Rapprochement d'un libellé fournisseur brut avec un ingrédient connu.
 * Ordre de priorité : correspondance exacte dans alias_ingredient, puis
 * similarité trigramme (pg_trgm) au-dessus du seuil, puis proposition de
 * création d'un nouvel ingrédient. Chaque rapprochement accepté par le
 * restaurateur crée un alias — l'app devient plus rapide à chaque facture.
 */

export const SEUIL_SIMILARITE_TRIGRAMME = 0.4;

export type OrigineCandidat = "alias" | "trigramme";

export interface CandidatRapprochement {
  ingredientId: string;
  nomNormalise: string;
  score: number;
  origine: OrigineCandidat;
}

export type DecisionRapprochement =
  | {
      type: "rapproche";
      ingredientId: string;
      nomNormalise: string;
      score: number;
      origine: OrigineCandidat;
    }
  | { type: "proposition_creation" };

/**
 * Fonction pure : décide quoi faire à partir d'une liste de candidats déjà
 * récupérés en base (recherche exacte d'alias + similarité trigramme).
 * Un candidat d'origine "alias" est toujours prioritaire sur un candidat
 * trigramme, quel que soit son score.
 */
export function decidirRapprochement(
  candidats: readonly CandidatRapprochement[],
): DecisionRapprochement {
  const matchExact = candidats.find((candidat) => candidat.origine === "alias");
  if (matchExact) {
    return {
      type: "rapproche",
      ingredientId: matchExact.ingredientId,
      nomNormalise: matchExact.nomNormalise,
      score: matchExact.score,
      origine: "alias",
    };
  }

  const meilleurTrigramme = [...candidats]
    .filter(
      (candidat) =>
        candidat.origine === "trigramme" &&
        candidat.score >= SEUIL_SIMILARITE_TRIGRAMME,
    )
    .sort((a, b) => b.score - a.score)[0];

  if (meilleurTrigramme) {
    return {
      type: "rapproche",
      ingredientId: meilleurTrigramme.ingredientId,
      nomNormalise: meilleurTrigramme.nomNormalise,
      score: meilleurTrigramme.score,
      origine: "trigramme",
    };
  }

  return { type: "proposition_creation" };
}

interface LigneAlias {
  ingredient_id: string;
  ingredient: { nom_normalise: string } | null;
}

interface LigneTrigramme {
  ingredient_id: string;
  nom_normalise: string;
  score: number;
}

/**
 * Récupère les candidats en base (alias exact puis RPC trigramme) et
 * applique `decidirRapprochement`. La RPC `rechercher_ingredients_similaires`
 * est définie dans supabase/migrations/0002_rapprochement.sql.
 */
export async function rapprocherLigneFacture(
  supabase: SupabaseClient,
  etablissementId: string,
  libelleBrut: string,
  fournisseurId: string | null,
): Promise<DecisionRapprochement> {
  const candidats: CandidatRapprochement[] = [];

  // Sans fournisseur identifié (non lu par l'extraction), la recherche
  // d'alias exact — scopée par fournisseur — n'est pas possible : on se
  // rabat directement sur la similarité trigramme, moins précise mais
  // toujours valable.
  const aliasExact = fournisseurId
    ? (
        await supabase
          .from("alias_ingredient")
          .select("ingredient_id, ingredient:ingredient_id (nom_normalise)")
          .eq("fournisseur_id", fournisseurId)
          .eq("libelle_fournisseur", libelleBrut)
          .limit(1)
          .maybeSingle<LigneAlias>()
      ).data
    : null;

  if (aliasExact) {
    candidats.push({
      ingredientId: aliasExact.ingredient_id,
      nomNormalise: aliasExact.ingredient?.nom_normalise ?? "",
      score: 1,
      origine: "alias",
    });
  }

  const { data: candidatsTrigramme } = await supabase.rpc(
    "rechercher_ingredients_similaires",
    {
      p_etablissement_id: etablissementId,
      p_libelle: libelleBrut,
      p_seuil: SEUIL_SIMILARITE_TRIGRAMME,
    },
  );

  for (const candidat of (candidatsTrigramme ?? []) as LigneTrigramme[]) {
    candidats.push({
      ingredientId: candidat.ingredient_id,
      nomNormalise: candidat.nom_normalise,
      score: candidat.score,
      origine: "trigramme",
    });
  }

  return decidirRapprochement(candidats);
}
