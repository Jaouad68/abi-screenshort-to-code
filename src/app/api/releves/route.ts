import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createReleve } from "@/lib/releves";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * API JSON d'enregistrement d'un relevé — utilisée par la file d'attente
 * hors-ligne (le service worker / client rejoue les saisies à la reconnexion).
 * L'horodatage qui fait foi reste createdAt (serveur) ; `saisiAt` conserve
 * l'heure de saisie déclarée côté cuisine.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const equipementId = typeof b.equipementId === "string" ? b.equipementId : "";
  const valeur = Number(b.valeur);
  if (!equipementId || !Number.isFinite(valeur)) {
    return NextResponse.json({ error: "equipementId ou valeur manquant/invalide" }, { status: 400 });
  }

  const saisiAt =
    typeof b.saisiAt === "string" && !Number.isNaN(Date.parse(b.saisiAt))
      ? new Date(b.saisiAt)
      : null;

  const res = await createReleve({
    userId: user.id,
    etablissementId: user.etablissementId,
    equipementId,
    valeur,
    commentaire: typeof b.commentaire === "string" ? b.commentaire : null,
    saisiAt,
    horsLigne: Boolean(b.horsLigne),
  });

  if (!res.ok) return NextResponse.json({ error: "Équipement introuvable" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    conforme: res.conforme,
    equipement: res.equipement,
    releveId: res.releveId,
  });
}
