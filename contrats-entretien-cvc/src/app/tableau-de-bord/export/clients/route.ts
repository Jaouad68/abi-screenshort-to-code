import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv, dateCsv } from "@/lib/csv";

export async function GET() {
  const { company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);

  const clients = await prisma.client.findMany({
    where: { companyId: company.id },
    orderBy: { nom: "asc" },
    include: { _count: { select: { contrats: true, equipements: true } } },
  });

  const csv = toCsv([
    ["Nom", "Adresse", "Code postal", "Ville", "Téléphone", "Email", "Nb contrats", "Nb équipements", "Notes", "Importé le"],
    ...clients.map((c) => [
      c.nom,
      c.adresse,
      c.codePostal,
      c.ville,
      c.telephone,
      c.email,
      String(c._count.contrats),
      String(c._count.equipements),
      c.notes,
      dateCsv(c.importeLe),
    ]),
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clients.csv"`,
    },
  });
}
