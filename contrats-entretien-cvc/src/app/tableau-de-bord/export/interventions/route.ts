import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

const STATUT_LABEL: Record<string, string> = {
  PLANIFIEE: "Planifiée",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

function dateHeureCsv(d: Date): string {
  const j = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${j}/${m}/${d.getFullYear()} ${h}:${mi}`;
}

export async function GET() {
  const { company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);

  const interventions = await prisma.intervention.findMany({
    where: { companyId: company.id },
    orderBy: { datePrevue: "asc" },
    include: { client: true, technicien: true },
  });

  const csv = toCsv([
    ["Titre", "Client", "Date prévue", "Technicien", "Statut", "Commentaires"],
    ...interventions.map((it) => [
      it.titre,
      it.client.nom,
      dateHeureCsv(it.datePrevue),
      it.technicien?.nom ?? "",
      STATUT_LABEL[it.statut] ?? it.statut,
      it.commentaires,
    ]),
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="interventions.csv"`,
    },
  });
}
