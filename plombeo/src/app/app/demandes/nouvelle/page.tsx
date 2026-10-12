import { exigerPermission } from "@/lib/dal";
import { listerClients } from "@/lib/crm";
import { FormulaireDemande } from "./FormulaireDemande";

export const metadata = { title: "Nouvelle demande — Plombéo" };

export default async function PageNouvelleDemande() {
  await exigerPermission("intervention:modifier");
  const clients = await listerClients();

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Nouvelle demande</h1>
        <p className="text-attenue mt-1">
          Notez l&apos;appel maintenant, vous compléterez plus tard.
        </p>
      </header>

      <FormulaireDemande clients={clients.map((c) => ({ id: c.id, nom: c.nomAffichage }))} />
    </div>
  );
}
