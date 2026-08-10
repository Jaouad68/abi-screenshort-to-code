import { notFound } from "next/navigation";
import { lireClient } from "@/lib/crm";
import { exigerPermission } from "@/lib/dal";
import { FormulaireLogement } from "../../../FormulaireLogement";
import { creerLogement } from "../../../actions";

export const metadata = { title: "Nouveau logement — Plombéo" };

export default async function PageNouveauLogement(
  props: PageProps<"/app/clients/[id]/logements/nouveau">,
) {
  await exigerPermission("client:modifier");
  const { id } = await props.params;

  const client = await lireClient(id);
  if (!client) notFound();

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Nouveau logement</h1>
        <p className="text-attenue mt-1">Pour {client.nomAffichage}</p>
      </header>

      <FormulaireLogement
        action={creerLogement}
        valeurs={{
          clientId: client.id,
          libelle: "",
          type: "MAISON",
          // L'adresse du client est pré-remplie : dans la majorité des cas, le
          // particulier fait intervenir chez lui.
          adresse: client.adresse,
          complement: "",
          codePostal: client.codePostal,
          ville: client.ville,
          etage: "",
          digicode: "",
          interphone: "",
          instructionsAcces: "",
          anneeConstruction: "",
          notes: "",
        }}
        libelleBouton="Ajouter le logement"
        annulerVers={`/app/clients/${client.id}`}
      />
    </div>
  );
}
