import { NextResponse } from "next/server";
import { proposerFicheTechniquePourPlat } from "@/lib/fiches/proposer";
import { creerClientServeur } from "@/lib/supabase/server";

/**
 * POST /api/plats/{id}/fiche-technique/proposer
 *
 * Propose une composition pour un plat existant (étape 2 de
 * l'onboarding). Ne persiste rien : la proposition est affichée à
 * l'écran de correction (étape 3), où chaque grammage est ajusté avant
 * validation explicite (« Cette fiche est bonne »).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: platId } = await params;
  const supabase = await creerClientServeur();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erreur: "non_authentifie" }, { status: 401 });
  }

  const resultat = await proposerFicheTechniquePourPlat(supabase, platId);

  if (resultat.mode === "plat_introuvable") {
    return NextResponse.json({ erreur: "plat_introuvable" }, { status: 404 });
  }

  if (resultat.mode === "manuel") {
    return NextResponse.json({ mode: "manuel" }, { status: 422 });
  }

  return NextResponse.json(
    { mode: "proposition", note: resultat.note, ingredients: resultat.ingredients },
    { status: 200 },
  );
}
