import { requireRole } from "@/lib/auth";
import { carte } from "@/lib/ui";
import { ClientForm } from "../ClientForm";
import { creerClient } from "../actions";

export default async function NouveauClientPage() {
  await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);

  return (
    <div className="flex flex-col gap-5 max-w-xl">
      <h1 className="text-2xl font-bold text-ink">Nouveau client</h1>
      <div className={carte}>
        <ClientForm action={creerClient} />
      </div>
    </div>
  );
}
