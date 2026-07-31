import { requireUser } from "@/lib/auth";
import { ParametresForm } from "./ParametresForm";

export default async function ParametresPage() {
  const { company } = await requireUser();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Réglages</h1>
      <p className="text-muted mb-6">
        Ces informations apparaissent dans l’en-tête de vos devis PDF.
      </p>
      <ParametresForm company={company} />
    </div>
  );
}
