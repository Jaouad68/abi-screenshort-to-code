import { requireRole } from "@/lib/auth";
import { carte, btnPrimaire } from "@/lib/ui";

export default async function ExportPage() {
  await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);

  return (
    <div className="flex flex-col gap-5 max-w-md">
      <div>
        <h1 className="text-2xl font-bold text-ink">Export des données</h1>
        <p className="text-muted">Fichiers CSV compatibles Excel (séparateur « ; »).</p>
      </div>

      <div className={`${carte} flex flex-col gap-3`}>
        <a href="/tableau-de-bord/export/clients" className={btnPrimaire}>
          Exporter les clients
        </a>
        <a href="/tableau-de-bord/export/contrats" className={btnPrimaire}>
          Exporter les contrats
        </a>
        <a href="/tableau-de-bord/export/interventions" className={btnPrimaire}>
          Exporter les interventions
        </a>
      </div>
    </div>
  );
}
