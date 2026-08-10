import Link from "next/link";
import { Badge, Carte, ListeVide } from "@/components/ui";
import { listerClients } from "@/lib/crm";
import { sessionCourante } from "@/lib/dal";
import { roleAutorise } from "@/lib/permissions";
import { adresseCourte, LIBELLE_TYPE_CLIENT } from "@/lib/libelles";

export const metadata = { title: "Clients — Plombéo" };

export default async function PageClients(props: PageProps<"/app/clients">) {
  // Next.js 16 : searchParams est asynchrone.
  const parametres = await props.searchParams;
  const recherche = typeof parametres["q"] === "string" ? parametres["q"] : "";
  const inclureArchives = parametres["archives"] === "1";

  const clients = await listerClients({ recherche, inclureArchives });
  const contexte = await sessionCourante();
  const peutModifier = contexte ? roleAutorise(contexte.role, "client:modifier") : false;
  const peutExporter = contexte ? roleAutorise(contexte.role, "client:exporter") : false;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-attenue mt-1">
            {clients.length === 0
              ? "Aucun client pour le moment."
              : `${clients.length} fiche${clients.length > 1 ? "s" : ""}`}
          </p>
        </div>
        {peutModifier && (
          <Link
            href="/app/clients/nouveau"
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                       font-semibold bg-action text-white hover:bg-action-fonce shrink-0"
          >
            + Client
          </Link>
        )}
      </header>

      {/* Formulaire GET : la recherche reste dans l'URL, donc partageable et
          conservée par le bouton retour du navigateur. */}
      <form method="get" className="flex flex-col gap-2">
        <label htmlFor="q" className="sr-only">
          Rechercher un client
        </label>
        <div className="flex gap-2">
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={recherche}
            placeholder="Nom, téléphone, ville, adresse…"
            className="flex-1 min-h-11 px-3 rounded-controle border border-trait bg-white focus:border-action"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                       font-semibold bg-encre text-white hover:bg-encre-clair"
          >
            Chercher
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm min-h-11">
          <input
            type="checkbox"
            name="archives"
            value="1"
            defaultChecked={inclureArchives}
            className="size-5"
          />
          Afficher aussi les clients archivés
        </label>
      </form>

      {clients.length === 0 ? (
        <ListeVide titre={recherche ? "Aucun résultat" : "Votre fichier client est vide"}>
          {recherche
            ? "Essayez un autre mot-clé, ou vérifiez les clients archivés."
            : "Créez votre première fiche client pour commencer."}
        </ListeVide>
      ) : (
        <ul className="flex flex-col gap-2">
          {clients.map((client) => (
            <li key={client.id}>
              <Link href={`/app/clients/${client.id}`} className="block">
                <Carte className="hover:border-action">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{client.nomAffichage}</p>
                      <p className="text-sm text-attenue truncate">
                        {[client.telephone, adresseCourte({ ville: client.ville })]
                          .filter(Boolean)
                          .join(" · ") || LIBELLE_TYPE_CLIENT[client.type]}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {client.archivedAt && <Badge ton="alerte">Archivé</Badge>}
                      {client._count.properties > 0 && (
                        <Badge>
                          {client._count.properties} logement
                          {client._count.properties > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Carte>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {peutExporter && clients.length > 0 && (
        <p className="text-sm text-attenue">
          <a href="/api/export/clients" className="font-semibold text-encre underline">
            Exporter mon fichier client (CSV)
          </a>
        </p>
      )}
    </div>
  );
}
