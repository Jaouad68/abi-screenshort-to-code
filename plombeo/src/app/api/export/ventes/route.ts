import { journaliser } from "@/lib/audit";
import { exigerPermission } from "@/lib/dal";
import { piecesVentes } from "@/lib/indicateurs";
import { anneeDe, ligneCsv, montantCsv } from "@/lib/pilotage";
import { totalTtc } from "@/lib/facturation";

/**
 * Journal des ventes — relevé de GESTION.
 *
 * Ce n'est pas un fichier des écritures comptables : le FEC répond à un format
 * normé et suppose un plan comptable, des numéros de compte et un journal
 * équilibré, choses que Plombéo n'a pas [À VÉRIFIER — SOURCE OFFICIELLE].
 */
export async function GET() {
  const { organizationId, userId } = await exigerPermission("client:exporter");
  const periode = anneeDe(new Date());
  const { factures, avoirs } = await piecesVentes(periode);

  const lignes = [
    ligneCsv(["Type", "Numéro", "Date", "Client", "Total HT", "TVA", "Total TTC", "Statut"]),
    ...factures.map((f) =>
      ligneCsv([
        "Facture",
        f.numero ?? "",
        f.dateFacture.toISOString().slice(0, 10),
        f.client.nomAffichage,
        montantCsv(f.totalHtCents),
        montantCsv(f.totalTvaCents),
        montantCsv(totalTtc(f)),
        f.statut,
      ]),
    ),
    // Les avoirs sortent en NÉGATIF : c'est ainsi qu'ils se lisent dans un
    // journal, et les additionner au positif fausserait tout total.
    //
    // Les colonnes HT et TVA restent VIDES : un avoir est enregistré pour son
    // montant TTC, et Plombéo n'en connaît pas la ventilation. La déduire d'un
    // taux supposé serait une invention — exactement ce que cette phase refuse.
    ...avoirs.map((a) =>
      ligneCsv([
        "Avoir",
        a.numero ?? "",
        a.dateAvoir.toISOString().slice(0, 10),
        a.invoice?.client.nomAffichage ?? "",
        "",
        "",
        montantCsv(-a.montantTtcCents),
        `Avoir sur ${a.invoice?.numero ?? ""}`,
      ]),
    ),
  ];

  await journaliser({
    action: "export.accounting_generated",
    organizationId,
    actorUserId: userId,
    metadata: { journal: "ventes", pieces: factures.length + avoirs.length },
  });

  // BOM UTF-8 : sans lui, un tableur français affiche « Ã© » à la place de « é ».
  return new Response(`﻿${lignes.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ventes-${periode.libelle}.csv"`,
      "Cache-Control": "no-store, private",
    },
  });
}
