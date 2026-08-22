import { Badge, Carte } from "@/components/ui";
import { supprimerDocument } from "@/app/app/documents/actions";
import { Bouton } from "@/components/ui";

type Doc = {
  id: string;
  categorie: string;
  moment: string | null;
  nomFichier: string;
  mimeType: string;
  legende: string;
  tags: string[];
  createdAt: Date;
};

const LIBELLE_MOMENT: Record<string, string> = {
  AVANT: "Avant",
  APRES: "Après",
  AUTRE: "Autre",
};

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" });

/**
 * Liste des pièces versées.
 *
 * Les images sont prévisualisées via la route contrôlée `/api/documents/[id]` :
 * jamais d'URL publique, jamais de chemin de stockage exposé.
 */
export function GalerieDocuments({
  documents,
  peutSupprimer,
}: {
  documents: Doc[];
  peutSupprimer: boolean;
}) {
  if (documents.length === 0) {
    return <p className="text-sm text-attenue">Aucune pièce pour l&apos;instant.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {documents.map((d) => (
        <li key={d.id}>
          <Carte>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{d.legende || d.nomFichier}</p>
                <p className="text-sm text-attenue">
                  {d.moment ? `${LIBELLE_MOMENT[d.moment]} · ` : ""}
                  {formatDate.format(d.createdAt)}
                </p>
                {d.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {d.tags.map((t) => (
                      <Badge key={t}>{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
              {d.moment && <Badge ton={d.moment === "AVANT" ? "alerte" : "succes"}>{LIBELLE_MOMENT[d.moment]}</Badge>}
            </div>

            {d.mimeType.startsWith("image/") && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/documents/${d.id}`}
                alt={d.legende || d.nomFichier}
                className="mt-3 rounded-controle border border-trait max-h-64 w-auto"
              />
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              <a
                href={`/api/documents/${d.id}`}
                className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                           font-semibold bg-white text-encre border border-trait hover:bg-fond"
              >
                Télécharger
              </a>
              {peutSupprimer && (
                <form action={supprimerDocument}>
                  <input type="hidden" name="id" value={d.id} />
                  <Bouton type="submit" variante="discret">
                    Supprimer
                  </Bouton>
                </form>
              )}
            </div>
          </Carte>
        </li>
      ))}
    </ul>
  );
}
