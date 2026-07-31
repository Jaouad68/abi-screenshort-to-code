import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ClientForm } from "../ClientForm";
import { creerClient } from "../actions";

export default async function NouveauClientPage() {
  await requireUser();

  return (
    <div>
      <Link href="/tableau-de-bord/clients" className="text-sm text-muted hover:text-brand">
        ← Clients
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">Nouveau client</h1>
      <ClientForm action={creerClient} submitLabel="Créer le client" />
    </div>
  );
}
