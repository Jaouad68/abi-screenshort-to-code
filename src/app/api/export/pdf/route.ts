import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { buildDossierPdf, type DossierData } from "@/lib/pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseDate(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Non authentifié", { status: 401 });
  if (user.role !== "GERANT") return new NextResponse("Accès réservé au gérant", { status: 403 });

  const sp = req.nextUrl.searchParams;
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  const from = parseDate(sp.get("from"), defaultFrom);
  from.setHours(0, 0, 0, 0);
  const to = parseDate(sp.get("to"), now);
  to.setHours(23, 59, 59, 999);

  const etabId = user.etablissementId;
  const range = { gte: from, lte: to };

  const [etablissement, releves, validations, receptions, produits, nonConformites] =
    await Promise.all([
      prisma.etablissement.findUnique({ where: { id: etabId } }),
      prisma.releveTemperature.findMany({
        where: { equipement: { etablissementId: etabId }, createdAt: range },
        include: { equipement: true, utilisateur: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.validationNettoyage.findMany({
        where: { tache: { etablissementId: etabId }, createdAt: range },
        include: { tache: true, utilisateur: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.reception.findMany({
        where: { etablissementId: etabId, createdAt: range },
        include: { utilisateur: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.produitOuvert.findMany({
        where: { etablissementId: etabId, dateOuverture: range },
        include: { utilisateur: true },
        orderBy: { dateOuverture: "asc" },
      }),
      prisma.nonConformite.findMany({
        where: { etablissementId: etabId, createdAt: range },
        include: { utilisateur: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  if (!etablissement) return new NextResponse("Établissement introuvable", { status: 404 });

  const data: DossierData = {
    etablissement: {
      nom: etablissement.nom,
      adresse: etablissement.adresse,
      siret: etablissement.siret,
    },
    periode: { from, to },
    genereLe: now,
    generePar: user.nom,
    releves,
    validations,
    receptions,
    produits,
    nonConformites,
  };

  const pdf = await buildDossierPdf(data);
  const filename = `dossier-conformite-${from.toISOString().slice(0, 10)}_${to
    .toISOString()
    .slice(0, 10)}.pdf`;

  return new NextResponse(pdf as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "no-store",
    },
  });
}
