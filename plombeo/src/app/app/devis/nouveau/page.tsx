import { exigerPermission } from "@/lib/dal";
import { listerClients } from "@/lib/crm";
import { FormulaireDevis } from "./FormulaireDevis";

export const metadata = { title: "Nouveau devis — Plombéo" };

export default async function PageNouveauDevis() {
  await exigerPermission("devis:modifier");
  const clients = await listerClients();

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Nouveau devis</h1>
        <p className="text-attenue mt-1">
          Vous ajouterez les lignes ensuite, depuis votre catalogue ou à la main.
        </p>
      </header>

      <FormulaireDevis clients={clients.map((c) => ({ id: c.id, nom: c.nomAffichage }))} />
    </div>
  );
}
