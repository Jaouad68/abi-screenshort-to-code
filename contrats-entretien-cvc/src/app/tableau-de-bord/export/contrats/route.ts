import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv, montantCsv, dateCsv } from "@/lib/csv";
import { PERIODICITE_LABEL } from "@/lib/echeance";

const STATUT_LABEL: Record<string, string> = {
  A_CONTACTER: "À contacter",
  CONTACTE: "Contacté",
  RENOUVELE: "Renouvelé",
  PERDU: "Perdu",
};

export async function GET() {
  const { company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);

  const contrats = await prisma.contrat.findMany({
    where: { companyId: company.id },
    orderBy: { dateEcheance: "asc" },
    include: { client: true, equipement: true },
  });

  const csv = toCsv([
    [
      "Référence",
      "Client",
      "Équipement",
      "Type",
      "Périodicité",
      "Montant (€)",
      "Date de début",
      "Date d'échéance",
      "Statut",
      "Actif",
    ],
    ...contrats.map((c) => [
      c.reference,
      c.client.nom,
      c.equipement?.type ?? "",
      c.type,
      PERIODICITE_LABEL[c.periodicite],
      montantCsv(c.montantCents),
      dateCsv(c.dateDebut),
      dateCsv(c.dateEcheance),
      STATUT_LABEL[c.statut] ?? c.statut,
      c.actif ? "Oui" : "Non",
    ]),
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contrats.csv"`,
    },
  });
}
