import { notFound } from "next/navigation";
import { exigerPermission } from "@/lib/dal";
import { listerClients } from "@/lib/crm";
import { lireDemande } from "@/lib/terrain";
import { FormulaireRendezVous } from "./FormulaireRendezVous";

export const metadata = { title: "Nouveau rendez-vous — Plombéo" };

export default async function PageNouveauRendezVous(
  props: PageProps<"/app/agenda/nouveau">,
) {
  await exigerPermission("intervention:modifier");
  const parametres = await props.searchParams;

  const clients = await listerClients();

  // Création depuis une demande : on préremplit pour éviter la ressaisie (US-5).
  const leadId = typeof parametres["demande"] === "string" ? parametres["demande"] : "";
  const demande = leadId ? await lireDemande(leadId) : null;
  if (leadId && !demande) notFound();

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Nouveau rendez-vous</h1>
        {demande && (
          <p className="text-attenue mt-1">
            Depuis la demande : {demande.description.slice(0, 80)}
            {demande.description.length > 80 ? "…" : ""}
          </p>
        )}
      </header>

      <FormulaireRendezVous
        clients={clients.map((c) => ({ id: c.id, nom: c.nomAffichage }))}
        leadId={demande?.id ?? ""}
        clientInitial={demande?.client?.id ?? ""}
        urgenceInitiale={demande?.urgence ?? "NORMAL"}
        titreInitial={demande ? demande.description.slice(0, 120) : ""}
      />
    </div>
  );
}
