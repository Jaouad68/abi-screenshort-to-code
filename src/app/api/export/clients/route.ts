import { requireSalon } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function echapperCsv(valeur: string): string {
  if (/[",\n]/.test(valeur)) {
    return `"${valeur.replace(/"/g, '""')}"`;
  }
  return valeur;
}

export async function GET() {
  const salon = await requireSalon();

  const clients = await prisma.client.findMany({
    where: { salonId: salon.id },
    orderBy: { prenom: "asc" },
  });

  const entetes = [
    "Prenom",
    "Telephone",
    "Consentement SMS",
    "Date consentement",
    "Non venues",
    "Honores",
  ];

  const lignes = clients.map((c) =>
    [
      c.prenom,
      c.telephone,
      c.consentementSms ? "oui" : "non",
      c.consentementDate ? c.consentementDate.toISOString().slice(0, 10) : "",
      String(c.noShowCount),
      String(c.honoredCount),
    ]
      .map(echapperCsv)
      .join(",")
  );

  const csv = [entetes.join(","), ...lignes].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clients-${salon.slug}.csv"`,
    },
  });
}
