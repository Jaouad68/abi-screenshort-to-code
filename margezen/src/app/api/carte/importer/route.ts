import { NextResponse } from "next/server";
import { appellerImportCarte } from "@/lib/anthropic/importerCarte";
import type { MediaTypeVision } from "@/lib/anthropic/extraireFacture";
import { importerCarteAvecRetry } from "@/lib/carte/extraction";
import { validerImageFacture } from "@/lib/factures/validationImage";
import { eurosVersCentimes } from "@/lib/argent";
import { creerClientServeur } from "@/lib/supabase/server";

/**
 * POST /api/carte/importer
 *
 * Reçoit la photo d'une carte de restaurant, l'extrait via Claude en
 * vision, valide la réponse par schéma Zod (une relance sur échec), puis
 * crée un plat par ligne extraite. Aucun plat ni prix n'est inventé : un
 * prix absent sur la carte reste `null` en base (affiché « — » côté UI).
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
  const imageBase64 = Buffer.from(await fichier.arrayBuffer()).toString(
    "base64",
  );

  const resultat = await importerCarteAvecRetry((messageCorrection) =>
    appellerImportCarte(imageBase64, mediaType, messageCorrection),
  );

  if (resultat.type === "echec_definitif") {
    return NextResponse.json(
      { mode: "manuel", raison: "extraction_echouee" },
      { status: 422 },
    );
  }

  if (resultat.donnees.plats.length === 0) {
    return NextResponse.json(
      { mode: "manuel", raison: "aucun_plat_detecte" },
      { status: 422 },
    );
  }

  const platsAInserer = resultat.donnees.plats.map((plat) => ({
    etablissement_id: etablissementId,
    nom: plat.nom,
    description: plat.description,
    categorie: plat.categorie,
    prix_vente_ttc_cts:
      plat.prix_ttc !== null ? eurosVersCentimes(plat.prix_ttc) : null,
    actif: true,
  }));

  const { data: platsCrees, error } = await supabase
    .from("plat")
    .insert(platsAInserer)
    .select("id, nom, description, categorie, prix_vente_ttc_cts");

  if (error) {
    return NextResponse.json(
      { erreur: "insertion_echouee", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { mode: "importe", plats: platsCrees },
    { status: 201 },
  );
}
