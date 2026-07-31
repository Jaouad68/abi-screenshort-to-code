import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv, montantCsv, dateCsv, filtreAnnee } from "@/lib/csv";
import { FACTURE_STATUT_LABEL } from "@/lib/statut";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const annee = url.searchParams.get("annee");
  const periode = filtreAnnee(annee);

  const factures = await prisma.facture.findMany({
    where: {
      userId: session.userId,
      ...(periode ? { dateFacture: periode } : {}),
    },
    orderBy: { dateFacture: "asc" },
    include: { client: { select: { nom: true } } },
  });

  const rows: string[][] = [
    ["Numéro", "Date", "Client", "Objet", "N° commande", "Statut", "HT", "TVA", "TTC", "Payée le"],
    ...factures.map((f) => [
      f.numero,
      dateCsv(f.dateFacture),
      f.client.nom,
      f.objet,
      f.numeroCommande,
      FACTURE_STATUT_LABEL[f.statut],
      montantCsv(f.totalHtCents),
      montantCsv(f.totalTvaCents),
      montantCsv(f.totalTtcCents),
      dateCsv(f.datePaiement),
    ]),
  ];

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="factures-${annee ?? "tout"}.csv"`,
    },
  });
}
