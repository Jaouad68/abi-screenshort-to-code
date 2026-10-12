import Link from "next/link";
import { FormulaireFournisseur } from "../FormulaireFournisseur";

export const metadata = { title: "Nouveau fournisseur — Plombéo" };

export default function PageNouveauFournisseur() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-sm text-attenue">
          <Link href="/app/achats/fournisseurs" className="underline">
            Fournisseurs
          </Link>
        </p>
        <h1 className="text-2xl font-bold mt-1">Nouveau fournisseur</h1>
      </header>
      <FormulaireFournisseur />
    </div>
  );
}
