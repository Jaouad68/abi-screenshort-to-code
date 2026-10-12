import { lireDocument } from "@/lib/documents";
import { lire } from "@/lib/stockage";

/**
 * Accès à un fichier — JAMAIS public (§46).
 *
 * Le fichier n'est servi qu'après vérification de la session, de
 * l'organisation et de la permission : `lireDocument` filtre sur
 * l'organisation, donc un identifiant valide chez un autre artisan se comporte
 * comme un identifiant inexistant.
 *
 * Aucun bucket public, aucune URL devinable : c'est cette route qui fait
 * autorité sur l'accès.
 */
export async function GET(
  _requete: Request,
  contexte: RouteContext<"/api/documents/[id]">,
) {
  const { id } = await contexte.params;

  const document = await lireDocument(id);
  if (!document) return new Response("Introuvable", { status: 404 });

  const contenu = await lire(document.cheminStockage);
  if (!contenu) return new Response("Fichier indisponible", { status: 404 });

  return new Response(new Uint8Array(contenu), {
    headers: {
      "Content-Type": document.mimeType,
      // `attachment` + `nosniff` : un fichier versé ne doit jamais s'exécuter
      // dans le navigateur, quel que soit son contenu réel.
      "Content-Disposition": `attachment; filename="${encodeURIComponent(document.nomFichier)}"`,
      "X-Content-Type-Options": "nosniff",
      // Contient des données personnelles : aucun cache partagé.
      "Cache-Control": "no-store, private",
    },
  });
}
