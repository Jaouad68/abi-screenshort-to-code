import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv, montantCsv, dateCsv, filtreAnnee } from "@/lib/csv";
import { STATUT_LABEL } from "@/lib/statut";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const annee = url.searchParams.get("annee");
  const periode = filtreAnnee(annee);

  const devis = await prisma.devis.findMany({
    where: {
      userId: session.userId,
      ...(periode ? { dateDevis: periode } : {}),
    },
    orderBy: { dateDevis: "asc" },
    include: { client: { select: { nom: true } } },
  });

  const rows: string[][] = [
    ["Numéro", "Date", "Client", "Objet", "N° commande", "Statut", "HT", "TVA", "TTC"],
    ...devis.map((d) => [
      d.numero,
      dateCsv(d.dateDevis),
      d.client.nom,
      d.objet,
      d.numeroCommande,
      STATUT_LABEL[d.statut],
      montantCsv(d.totalHtCents),
      montantCsv(d.totalTvaCents),
      montantCsv(d.totalTtcCents),
    ]),
  ];

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="devis-${annee ?? "tout"}.csv"`,
    },
  });
}
