import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PrestationForm } from "../PrestationForm";
import { creerPrestation } from "../actions";

export default async function NouvellePrestationPage() {
  await requireUser();

  return (
    <div>
      <Link href="/tableau-de-bord/prestations" className="text-sm text-muted hover:text-brand">
        ← Catalogue
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">Nouvelle prestation</h1>
      <PrestationForm action={creerPrestation} submitLabel="Ajouter au catalogue" />
    </div>
  );
}
