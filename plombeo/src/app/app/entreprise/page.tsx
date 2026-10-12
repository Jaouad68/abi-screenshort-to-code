import { organisationCourante, sessionCourante } from "@/lib/dal";
import { roleAutorise } from "@/lib/permissions";
import { FormulaireEntreprise } from "./FormulaireEntreprise";
import { Carte } from "@/components/ui";

export const metadata = { title: "Mon entreprise — Plombéo" };

export default async function PageEntreprise() {
  const organisation = await organisationCourante();
  const contexte = await sessionCourante();
  const modifiable = contexte ? roleAutorise(contexte.role, "organisation:modifier") : false;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Mon entreprise</h1>
        <p className="text-attenue mt-1">
          Ces informations figureront sur vos devis et vos factures.
        </p>
      </header>

      {modifiable ? (
        <FormulaireEntreprise
          organisation={{
            nom: organisation.nom,
            formeJuridique: organisation.formeJuridique,
            siret: organisation.siret,
            adresse: organisation.adresse,
            codePostal: organisation.codePostal,
            ville: organisation.ville,
            telephone: organisation.telephone,
            email: organisation.email,
          }}
        />
      ) : (
        <Carte>
          <p className="text-sm text-attenue">
            Vous n&apos;avez pas les droits nécessaires pour modifier ces informations.
          </p>
        </Carte>
      )}
    </div>
  );
}
