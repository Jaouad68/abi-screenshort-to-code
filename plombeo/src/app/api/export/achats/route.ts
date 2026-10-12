import { journaliser } from "@/lib/audit";
import { exigerPermission } from "@/lib/dal";
import { piecesAchats } from "@/lib/indicateurs";
import { anneeDe, ligneCsv, montantCsv } from "@/lib/pilotage";

/** Journal des achats — relevé de gestion, pas un FEC (voir l'export ventes). */
export async function GET() {
  const { organizationId, userId } = await exigerPermission("achat:lire");
  const periode = anneeDe(new Date());
  const achats = await piecesAchats(periode);

  const lignes = [
    ligneCsv(["Date", "Fournisseur", "Référence", "Libellé", "Total HT", "TVA", "Total TTC"]),
    ...achats.map((a) =>
      ligneCsv([
        a.dateAchat.toISOString().slice(0, 10),
        a.supplier?.nom ?? "",
        a.referenceFournisseur,
        a.libelle,
        montantCsv(a.totalHtCents),
        montantCsv(a.totalTvaCents),
        montantCsv(a.totalTtcCents),
      ]),
    ),
  ];

  await journaliser({
    action: "export.accounting_generated",
    organizationId,
    actorUserId: userId,
    metadata: { journal: "achats", pieces: achats.length },
  });

  return new Response(`﻿${lignes.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="achats-${periode.libelle}.csv"`,
      "Cache-Control": "no-store, private",
    },
  });
}
