import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { ImportWizard } from "./ImportWizard";

export default async function ImportClientsPage() {
  await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/tableau-de-bord/clients" className="text-sm text-muted hover:text-brand">
          ← Clients
        </Link>
        <h1 className="text-2xl font-bold text-ink mt-1">Importer des clients</h1>
        <p className="text-muted">
          Depuis un export Excel : prévisualisez, repérez les doublons probables,
          puis choisissez ce qui doit être importé.
        </p>
      </div>
      <ImportWizard />
    </div>
  );
}
