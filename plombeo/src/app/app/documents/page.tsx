import { Bouton, Carte, ListeVide } from "@/components/ui";
import { sessionCourante } from "@/lib/dal";
import { roleAutorise } from "@/lib/permissions";
import { listerDocuments } from "@/lib/documents";
import { stockageDisponible, STOCKAGE_NON_CONFIGURE } from "@/lib/stockage";
import { GalerieDocuments } from "@/components/GalerieDocuments";
import { Televersement } from "@/components/Televersement";

export const metadata = { title: "Documents — Plombéo" };

export default async function PageDocuments(props: PageProps<"/app/documents">) {
  const { q } = await props.searchParams;
  const recherche = typeof q === "string" ? q : "";

  const contexte = await sessionCourante();
  const peutVerser = contexte ? roleAutorise(contexte.role, "document:modifier") : false;
  const peutSupprimer = contexte ? roleAutorise(contexte.role, "document:supprimer") : false;

  const documents = await listerDocuments({}, recherche);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-sm text-attenue mt-1">
          Toutes les pièces versées : photos de chantier, attestations, notices.
        </p>
      </header>

      {/* Une fonctionnalité indisponible se dit ; elle ne se découvre pas au
          moment où l'envoi échoue (§76). */}
      {!stockageDisponible() && (
        <Carte className="border-dashed">
          <h2 className="font-semibold mb-1">Envoi de fichiers indisponible</h2>
          <p className="text-sm text-attenue">{STOCKAGE_NON_CONFIGURE}</p>
        </Carte>
      )}

      <Carte>
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5 flex-1">
            <label htmlFor="q" className="font-semibold text-sm">
              Rechercher
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={recherche}
              placeholder="Nom, légende ou étiquette"
              className="min-h-11 px-3 rounded-controle border border-trait bg-white focus:border-action"
            />
          </div>
          <Bouton type="submit" variante="discret">
            Chercher
          </Bouton>
        </form>
      </Carte>

      {peutVerser && stockageDisponible() && <Televersement rattachement={{}} />}

      {documents.length === 0 ? (
        <ListeVide titre={recherche ? "Aucune pièce ne correspond" : "Aucune pièce versée"}>
          {recherche
            ? "Essayez un autre mot, ou retirez la recherche."
            : "Les photos prises pendant une intervention arrivent ici automatiquement."}
        </ListeVide>
      ) : (
        <GalerieDocuments documents={documents} peutSupprimer={peutSupprimer} />
      )}
    </div>
  );
}
