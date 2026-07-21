import { notFound } from "next/navigation";
import { creerClientServeur } from "@/lib/supabase/server";
import { ValidationLignes, type LigneFactureRow } from "./ValidationLignes";

interface FactureAvecFournisseur {
  id: string;
  statut: string;
  fournisseur: { nom: string } | null;
}

export default async function ValiderFacturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await creerClientServeur();

  const { data: facture } = await supabase
    .from("facture")
    .select("id, statut, fournisseur:fournisseur_id (nom)")
    .eq("id", id)
    .maybeSingle<FactureAvecFournisseur>();

  if (!facture) {
    notFound();
  }

  const { data: lignes } = await supabase
    .from("ligne_facture")
    .select("id, libelle_brut, quantite, unite, prix_unitaire_cts, confiance_ocr")
    .eq("facture_id", id)
    .returns<LigneFactureRow[]>();

  return (
    <ValidationLignes
      factureId={facture.id}
      fournisseur={facture.fournisseur?.nom ?? null}
      lignesInitiales={lignes ?? []}
    />
  );
}
