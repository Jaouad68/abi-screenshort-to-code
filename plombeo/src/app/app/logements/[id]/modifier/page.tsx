import { notFound } from "next/navigation";
import { lireLogement } from "@/lib/crm";
import { exigerPermission } from "@/lib/dal";
import { FormulaireLogement } from "../../../clients/FormulaireLogement";
import { mettreAJourLogement } from "../../../clients/actions";

export const metadata = { title: "Modifier le logement — Plombéo" };

export default async function PageModifierLogement(
  props: PageProps<"/app/logements/[id]/modifier">,
) {
  await exigerPermission("client:modifier");
  const { id } = await props.params;

  const logement = await lireLogement(id);
  if (!logement) notFound();

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Modifier le logement</h1>
        <p className="text-attenue mt-1">{logement.client.nomAffichage}</p>
      </header>

      <FormulaireLogement
        action={mettreAJourLogement}
        valeurs={{
          id: logement.id,
          libelle: logement.libelle,
          type: logement.type,
          adresse: logement.adresse,
          complement: logement.complement,
          codePostal: logement.codePostal,
          ville: logement.ville,
          etage: logement.etage,
          digicode: logement.digicode,
          interphone: logement.interphone,
          instructionsAcces: logement.instructionsAcces,
          anneeConstruction: logement.anneeConstruction?.toString() ?? "",
          notes: logement.notes,
        }}
        libelleBouton="Enregistrer"
        annulerVers={`/app/logements/${logement.id}`}
      />
    </div>
  );
}
