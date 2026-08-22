import { exigerPermission } from "@/lib/dal";
import { FormulaireClient } from "../FormulaireClient";
import { creerClient } from "../actions";

export const metadata = { title: "Nouveau client — Plombéo" };

const VIDE = {
  type: "PARTICULIER" as const,
  civilite: "",
  prenom: "",
  nom: "",
  raisonSociale: "",
  siret: "",
  tvaIntracommunautaire: "",
  contactNom: "",
  email: "",
  telephone: "",
  telephoneSecondaire: "",
  adresse: "",
  codePostal: "",
  ville: "",
  notes: "",
};

export default async function PageNouveauClient() {
  // Contrôle au plus près de la donnée : la permission est vérifiée ici, et de
  // nouveau dans la Server Action — masquer le lien ne protégerait rien.
  await exigerPermission("client:modifier");

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Nouveau client</h1>
        <p className="text-attenue mt-1">
          Seul un nom est nécessaire. Vous compléterez le reste plus tard.
        </p>
      </header>

      <FormulaireClient
        action={creerClient}
        valeurs={VIDE}
        libelleBouton="Créer le client"
        annulerVers="/app/clients"
      />
    </div>
  );
}
