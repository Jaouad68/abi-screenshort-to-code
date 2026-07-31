import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const lienClasses =
  "inline-flex items-center gap-2 rounded-control border border-line bg-white px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-l min-h-[40px]";

function LigneExport({ libelle, annee }: { libelle: string; annee?: number }) {
  const q = annee ? `?annee=${annee}` : "";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-card px-4 py-3">
      <span className="font-semibold">{libelle}</span>
      <div className="flex gap-2">
        <a className={lienClasses} href={`/tableau-de-bord/export/devis${q}`}>
          Devis (CSV)
        </a>
        <a className={lienClasses} href={`/tableau-de-bord/export/factures${q}`}>
          Factures (CSV)
        </a>
      </div>
    </div>
  );
}

export default async function ExportPage() {
  const { user } = await requireUser();

  // Années présentes dans les données (devis + factures).
  const [devisDates, factureDates] = await Promise.all([
    prisma.devis.findMany({ where: { userId: user.id }, select: { dateDevis: true } }),
    prisma.facture.findMany({ where: { userId: user.id }, select: { dateFacture: true } }),
  ]);

  const annees = [
    ...new Set([
      ...devisDates.map((d) => d.dateDevis.getFullYear()),
      ...factureDates.map((f) => f.dateFacture.getFullYear()),
      new Date().getFullYear(),
    ]),
  ].sort((a, b) => b - a);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Export comptable</h1>
      <p className="text-muted mb-6">
        Téléchargez le journal des devis et des factures au format CSV (compatible
        Excel / LibreOffice) pour votre comptable.
      </p>

      <div className="grid gap-2">
        <LigneExport libelle="Toutes les années" />
        {annees.map((a) => (
          <LigneExport key={a} libelle={`Année ${a}`} annee={a} />
        ))}
      </div>
    </div>
  );
}
