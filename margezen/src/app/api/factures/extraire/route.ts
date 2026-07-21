import { NextResponse } from "next/server";
import { eurosVersCentimes } from "@/lib/argent";
import {
  appellerExtractionFacture,
  type MediaTypeVision,
} from "@/lib/anthropic/extraireFacture";
import { verifierCoherence } from "@/lib/factures/coherence";
import { extraireFactureAvecRetry } from "@/lib/factures/extraction";
import { rapprocherLigneFacture } from "@/lib/factures/rapprochement";
import { validerImageFacture } from "@/lib/factures/validationImage";
import { creerClientServeur } from "@/lib/supabase/server";

/**
 * POST /api/factures/extraire
 *
 * Reçoit la photo d'une facture fournisseur (JPEG/PNG, déjà compressée et
 * convertie côté client — voir lib/images/compression.ts), l'extrait via
 * Claude en vision, contrôle sa cohérence, rapproche chaque ligne avec les
 * ingrédients connus, puis persiste facture + lignes en base.
 *
 * Le LLM n'écrit jamais directement en base : sa sortie passe par le
 * schéma Zod (lib/factures/schema.ts) et le pipeline de relance
 * (lib/factures/extraction.ts) avant tout `insert`.
 */
export async function POST(request: Request) {
  const supabase = await creerClientServeur();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erreur: "non_authentifie" }, { status: 401 });
  }

  const formData = await request.formData();
  const fichier = formData.get("image");
  const etablissementId = formData.get("etablissement_id");

  if (
    !(fichier instanceof File) ||
    typeof etablissementId !== "string" ||
    etablissementId.length === 0
  ) {
    return NextResponse.json(
      {
        erreur: "requete_invalide",
        message: "Champs 'image' et 'etablissement_id' requis.",
      },
      { status: 400 },
    );
  }

  const validation = validerImageFacture({
    type: fichier.type,
    size: fichier.size,
  });
  if (!validation.valide) {
    return NextResponse.json(
      { erreur: "image_invalide", message: validation.erreur },
      { status: 400 },
    );
  }

  const mediaType = fichier.type as MediaTypeVision;
  const octets = Buffer.from(await fichier.arrayBuffer());
  const imageBase64 = octets.toString("base64");

  const resultatExtraction = await extraireFactureAvecRetry((messageCorrection) =>
    appellerExtractionFacture(imageBase64, mediaType, messageCorrection),
  );

  if (resultatExtraction.type === "document_non_reconnu") {
    return NextResponse.json(
      { mode: "erreur", raison: "document_non_reconnu" },
      { status: 422 },
    );
  }

  // Au-delà de ce point (échec définitif ou extraction réussie), l'image
  // est bien une facture photographiée : on la conserve pour ne pas faire
  // retaper la photo, même si la lecture automatique a échoué.
  const extension = mediaType === "image/png" ? "png" : "jpg";
  const cheminImage = `${etablissementId}/${crypto.randomUUID()}.${extension}`;
  const { error: erreurUpload } = await supabase.storage
    .from("factures")
    .upload(cheminImage, octets, { contentType: mediaType });

  if (erreurUpload) {
    return NextResponse.json(
      { erreur: "upload_echoue", message: erreurUpload.message },
      { status: 500 },
    );
  }

  if (resultatExtraction.type === "echec_definitif") {
    const { data: facture, error } = await supabase
      .from("facture")
      .insert({
        etablissement_id: etablissementId,
        image_path: cheminImage,
        statut: "a_valider",
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json(
        { erreur: "insertion_echouee", message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { mode: "manuel", factureId: facture.id },
      { status: 201 },
    );
  }

  const { donnees } = resultatExtraction;

  const totalDeclareCts =
    donnees.total_ht !== null ? eurosVersCentimes(donnees.total_ht) : null;

  const lignesCts = donnees.lignes.map((ligne) => ({
    ...ligne,
    totalHtCts: ligne.total_ht !== null ? eurosVersCentimes(ligne.total_ht) : null,
    prixUnitaireHtCts:
      ligne.prix_unitaire_ht !== null
        ? eurosVersCentimes(ligne.prix_unitaire_ht)
        : null,
  }));

  const coherence = verifierCoherence(
    totalDeclareCts,
    lignesCts.map((ligne) => ({ totalHtCts: ligne.totalHtCts })),
  );

  // Résolution du fournisseur : recherche exacte par nom pour cet
  // établissement, sinon création. Si le nom n'a pas été lu par
  // l'extraction, aucun fournisseur n'est assigné — pas d'invention.
  let fournisseurId: string | null = null;
  if (donnees.fournisseur) {
    const { data: fournisseurExistant } = await supabase
      .from("fournisseur")
      .select("id")
      .eq("etablissement_id", etablissementId)
      .eq("nom", donnees.fournisseur)
      .maybeSingle();

    if (fournisseurExistant) {
      fournisseurId = fournisseurExistant.id;
    } else {
      const { data: nouveauFournisseur, error: erreurFournisseur } =
        await supabase
          .from("fournisseur")
          .insert({ etablissement_id: etablissementId, nom: donnees.fournisseur })
          .select("id")
          .single();

      if (erreurFournisseur) {
        return NextResponse.json(
          { erreur: "fournisseur_echoue", message: erreurFournisseur.message },
          { status: 500 },
        );
      }
      fournisseurId = nouveauFournisseur.id;
    }
  }

  const { data: facture, error: erreurFacture } = await supabase
    .from("facture")
    .insert({
      etablissement_id: etablissementId,
      fournisseur_id: fournisseurId,
      date_facture: donnees.date_facture,
      image_path: cheminImage,
      total_ht_cts: totalDeclareCts,
      statut: "a_valider",
    })
    .select("id")
    .single();

  if (erreurFacture) {
    return NextResponse.json(
      { erreur: "insertion_echouee", message: erreurFacture.message },
      { status: 500 },
    );
  }

  const lignesAvecRapprochement = await Promise.all(
    lignesCts.map(async (ligne) => {
      const decision = await rapprocherLigneFacture(
        supabase,
        etablissementId,
        ligne.libelle_brut,
        fournisseurId,
      );
      return {
        facture_id: facture.id,
        ingredient_id: decision.type === "rapproche" ? decision.ingredientId : null,
        libelle_brut: ligne.libelle_brut,
        quantite: ligne.quantite,
        unite: ligne.unite,
        prix_unitaire_cts: ligne.prixUnitaireHtCts,
        total_ht_cts: ligne.totalHtCts,
        confiance_ocr: ligne.confiance,
        statut_rapprochement:
          decision.type === "rapproche" ? "rapproche" : "nouvel_ingredient",
      };
    }),
  );

  const { error: erreurLignes } = await supabase
    .from("ligne_facture")
    .insert(lignesAvecRapprochement);

  if (erreurLignes) {
    return NextResponse.json(
      { erreur: "insertion_lignes_echouee", message: erreurLignes.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      mode: "extraction",
      factureId: facture.id,
      coherence,
      lignes: lignesAvecRapprochement,
    },
    { status: 201 },
  );
}
