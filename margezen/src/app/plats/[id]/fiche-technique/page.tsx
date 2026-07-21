import { notFound } from "next/navigation";
import { proposerFicheTechniquePourPlat } from "@/lib/fiches/proposer";
import { creerClientServeur } from "@/lib/supabase/server";
import {
  CorrectionFicheTechnique,
  type LigneCorrigible,
} from "./CorrectionFicheTechnique";

interface PlatRow {
  id: string;
  nom: string;
  prix_vente_ttc_cts: number | null;
  taux_tva: number;
  etablissement_id: string;
}

export default async function FicheTechniquePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: platId } = await params;
  const supabase = await creerClientServeur();

  const { data: plat } = await supabase
    .from("plat")
    .select("id, nom, prix_vente_ttc_cts, taux_tva, etablissement_id")
    .eq("id", platId)
    .maybeSingle<PlatRow>();

  if (!plat) {
    notFound();
  }

  const { data: etablissement } = await supabase
    .from("etablissement")
    .select("marge_cible_solides_pct")
    .eq("id", plat.etablissement_id)
    .maybeSingle<{ marge_cible_solides_pct: number }>();

  const proposition = await proposerFicheTechniquePourPlat(supabase, platId);

  const lignesInitiales: LigneCorrigible[] =
    proposition.mode === "proposition"
      ? proposition.ingredients.map((ingredient, index) => ({
          cle: ingredient.ingredientExistant?.id ?? `nouveau-${index}`,
          ingredientId: ingredient.ingredientExistant?.id ?? null,
          nomIngredient: ingredient.ingredientExistant?.nomNormalise ?? ingredient.nomPropose,
          quantite: ingredient.quantite,
          unite: ingredient.unite,
          prixUnitaireCts: ingredient.ingredientExistant?.prixUnitaireCts ?? null,
        }))
      : [];

  // Plat suivant sans fiche technique dans le même établissement, pour
  // enchaîner l'onboarding plat après plat sans repasser par la liste.
  const { data: platsSansFiche } = await supabase
    .from("plat")
    .select("id, fiche_technique(count)")
    .eq("etablissement_id", plat.etablissement_id)
    .neq("id", platId)
    .order("cree_le", { ascending: true });

  const platSuivant = (
    platsSansFiche as unknown as { id: string; fiche_technique: { count: number }[] }[] | null
  )?.find((candidat) => (candidat.fiche_technique?.[0]?.count ?? 0) === 0);

  return (
    <CorrectionFicheTechnique
      platId={plat.id}
      etablissementId={plat.etablissement_id}
      platNom={plat.nom}
      prixVenteTtcCts={plat.prix_vente_ttc_cts}
      tauxTva={plat.taux_tva}
      margeCibleSolidesPct={etablissement?.marge_cible_solides_pct ?? 72}
      noteIA={proposition.mode === "proposition" ? proposition.note : null}
      lignesInitiales={lignesInitiales}
      platSuivantId={platSuivant?.id ?? null}
    />
  );
}
