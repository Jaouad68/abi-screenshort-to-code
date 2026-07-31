import { requireUser } from "@/lib/auth";
import { ParametresForm } from "./ParametresForm";
import { LogoField } from "./LogoField";

export default async function ParametresPage() {
  const { company } = await requireUser();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Réglages</h1>
      <p className="text-muted mb-6">
        Ces informations apparaissent dans l’en-tête de vos devis et factures PDF.
      </p>
      <div className="mb-6">
        <LogoField nom={company.nom} logoDataUrl={company.logoDataUrl} />
      </div>
      <ParametresForm company={company} />
    </div>
  );
}
