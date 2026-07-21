"use server";

import { revalidatePath } from "next/cache";
import { creerClientServeur } from "@/lib/supabase/server";

export interface LigneModifiee {
  id: string;
  quantite: number | null;
  unite: string | null;
  prixUnitaireCts: number | null;
}

/**
 * Enregistre les corrections apportées lors de la validation, puis
 * marque la facture comme validée. Chaque champ modifié provient d'une
 * saisie utilisateur explicite — aucun recalcul silencieux d'un montant
 * absent.
 */
export async function validerFacture(
  factureId: string,
  lignesModifiees: LigneModifiee[],
): Promise<void> {
  const supabase = await creerClientServeur();

  for (const ligne of lignesModifiees) {
    const totalHtCts =
      ligne.quantite !== null && ligne.prixUnitaireCts !== null
        ? Math.round(ligne.quantite * ligne.prixUnitaireCts)
        : null;

    const { error } = await supabase
      .from("ligne_facture")
      .update({
        quantite: ligne.quantite,
        unite: ligne.unite,
        prix_unitaire_cts: ligne.prixUnitaireCts,
        total_ht_cts: totalHtCts,
      })
      .eq("id", ligne.id);

    if (error) {
      throw new Error(
        `Échec de la mise à jour de la ligne ${ligne.id} : ${error.message}`,
      );
    }
  }

  const { error: erreurFacture } = await supabase
    .from("facture")
    .update({ statut: "validee" })
    .eq("id", factureId);

  if (erreurFacture) {
    throw new Error(
      `Échec de la validation de la facture : ${erreurFacture.message}`,
    );
  }

  revalidatePath(`/factures/${factureId}`);
}
