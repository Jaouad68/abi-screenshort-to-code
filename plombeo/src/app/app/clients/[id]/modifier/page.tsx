import { notFound } from "next/navigation";
import { lireClient } from "@/lib/crm";
import { exigerPermission } from "@/lib/dal";
import { FormulaireClient } from "../../FormulaireClient";
import { mettreAJourClient } from "../../actions";

export const metadata = { title: "Modifier le client — Plombéo" };

export default async function PageModifierClient(
  props: PageProps<"/app/clients/[id]/modifier">,
) {
  await exigerPermission("client:modifier");
  const { id } = await props.params;

  const client = await lireClient(id);
  if (!client) notFound();

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Modifier</h1>
        <p className="text-attenue mt-1">{client.nomAffichage}</p>
      </header>

      <FormulaireClient
        action={mettreAJourClient}
        valeurs={{
          id: client.id,
          type: client.type,
          civilite: client.civilite,
          prenom: client.prenom,
          nom: client.nom,
          raisonSociale: client.raisonSociale,
          siret: client.siret,
          tvaIntracommunautaire: client.tvaIntracommunautaire,
          contactNom: client.contactNom,
          email: client.email,
          telephone: client.telephone,
          telephoneSecondaire: client.telephoneSecondaire,
          adresse: client.adresse,
          codePostal: client.codePostal,
          ville: client.ville,
          notes: client.notes,
        }}
        libelleBouton="Enregistrer"
        annulerVers={`/app/clients/${client.id}`}
      />
    </div>
  );
}
