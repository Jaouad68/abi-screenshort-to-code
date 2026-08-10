import { pdfDocument, type TypeDocument } from "@/lib/document-pdf";

/**
 * PDF d'un devis ou d'une facture, produit côté serveur.
 *
 * Comme pour les documents versés, aucune URL publique : `pdfDocument` passe par
 * le DAL, qui vérifie session, organisation et permission. Une pièce d'un autre
 * artisan répond 404, indiscernable d'un identifiant inexistant.
 */
export async function GET(_requete: Request, contexte: RouteContext<"/api/pdf/[type]/[id]">) {
  const { type, id } = await contexte.params;

  // Liste blanche : le segment d'URL ne choisit jamais librement une table.
  if (type !== "devis" && type !== "facture") {
    return new Response("Type inconnu", { status: 404 });
  }

  const pdf = await pdfDocument(type as TypeDocument, id);
  if (!pdf) return new Response("Introuvable", { status: 404 });

  return new Response(new Uint8Array(pdf.octets), {
    headers: {
      "Content-Type": "application/pdf",
      // `inline` : contrairement aux pièces versées, ce PDF est produit par
      // Plombéo à partir de ses propres données — aucun contenu tiers à isoler.
      "Content-Disposition": `inline; filename="${pdf.nom}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store, private",
    },
  });
}
