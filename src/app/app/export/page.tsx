import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ExportForm } from "./ExportForm";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "GERANT") redirect("/app");

  return (
    <div>
      <PageHeader
        title="Export PDF"
        subtitle="Générez votre dossier de conformité horodaté pour un contrôle DDPP."
      />
      <ExportForm />

      <div className="card mt-5 p-5">
        <h2 className="font-bold text-slate-800">Contenu du dossier</h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          <li>🌡️ Relevés de température (avec écarts signalés)</li>
          <li>🧽 Validations du plan de nettoyage</li>
          <li>📦 Contrôles à réception</li>
          <li>🏷️ Traçabilité / DLC secondaires</li>
          <li>⚠️ Non-conformités et actions correctives</li>
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          En-tête établissement, période et horodatage de génération inclus. Données conservées au
          moins 12 mois glissants.
        </p>
      </div>
    </div>
  );
}
