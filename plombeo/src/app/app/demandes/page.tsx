import Link from "next/link";
import { Badge, Bouton, Carte, ListeVide } from "@/components/ui";
import { listerDemandes } from "@/lib/terrain";
import { sessionCourante } from "@/lib/dal";
import { roleAutorise } from "@/lib/permissions";
import { changerEtatDemande } from "../agenda/actions";

export const metadata = { title: "Demandes — Plombéo" };

const LIBELLE_URGENCE = {
  NORMAL: "Normal",
  RAPIDE: "À faire vite",
  URGENT: "Urgent",
  CRITIQUE: "Critique",
} as const;

const TON_URGENCE = {
  NORMAL: "neutre",
  RAPIDE: "alerte",
  URGENT: "danger",
  CRITIQUE: "danger",
} as const;

const LIBELLE_STATUT = {
  NOUVEAU: "Nouvelle",
  QUALIFIE: "Qualifiée",
  CONVERTI: "Convertie",
  ABANDONNE: "Abandonnée",
} as const;

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

export default async function PageDemandes(props: PageProps<"/app/demandes">) {
  const parametres = await props.searchParams;
  const toutes = parametres["toutes"] === "1";

  const demandes = await listerDemandes(toutes);
  const contexte = await sessionCourante();
  const peutModifier = contexte ? roleAutorise(contexte.role, "intervention:modifier") : false;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Demandes</h1>
          <p className="text-attenue mt-1">
            {demandes.length === 0
              ? "Rien en attente."
              : `${demandes.length} demande${demandes.length > 1 ? "s" : ""}`}
          </p>
        </div>
        {peutModifier && (
          <Link
            href="/app/demandes/nouvelle"
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                       font-semibold bg-action text-white hover:bg-action-fonce shrink-0"
          >
            + Demande
          </Link>
        )}
      </header>

      <p className="text-sm">
        <Link
          href={toutes ? "/app/demandes" : "/app/demandes?toutes=1"}
          className="text-encre underline font-semibold"
        >
          {toutes ? "Afficher seulement les demandes en attente" : "Afficher aussi les demandes traitées"}
        </Link>
      </p>

      {demandes.length === 0 ? (
        <ListeVide titre="Aucune demande en attente">
          Notez ici les appels reçus pour ne rien oublier entre deux chantiers.
        </ListeVide>
      ) : (
        <ul className="flex flex-col gap-2">
          {demandes.map((demande) => (
            <li key={demande.id}>
              <Carte>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium whitespace-pre-wrap">{demande.description}</p>
                    <p className="text-sm text-attenue mt-1">
                      {demande.client?.nomAffichage ??
                        [demande.contactNom, demande.contactTelephone]
                          .filter(Boolean)
                          .join(" · ") ??
                        "Contact non renseigné"}
                    </p>
                    <p className="text-sm text-attenue">
                      Reçue le {formatDate.format(demande.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {demande.urgence !== "NORMAL" && (
                      <Badge ton={TON_URGENCE[demande.urgence]}>
                        {LIBELLE_URGENCE[demande.urgence]}
                      </Badge>
                    )}
                    <Badge>{LIBELLE_STATUT[demande.statut]}</Badge>
                  </div>
                </div>

                {peutModifier && (demande.statut === "NOUVEAU" || demande.statut === "QUALIFIE") && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Link
                      href={`/app/agenda/nouveau?demande=${demande.id}`}
                      className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                                 font-semibold bg-encre text-white hover:bg-encre-clair"
                    >
                      Planifier
                    </Link>
                    {demande.statut === "NOUVEAU" && (
                      <form action={changerEtatDemande}>
                        <input type="hidden" name="id" value={demande.id} />
                        <input type="hidden" name="vers" value="QUALIFIE" />
                        <Bouton type="submit" variante="discret">
                          Qualifier
                        </Bouton>
                      </form>
                    )}
                    <form action={changerEtatDemande}>
                      <input type="hidden" name="id" value={demande.id} />
                      <input type="hidden" name="vers" value="ABANDONNE" />
                      <Bouton type="submit" variante="discret">
                        Abandonner
                      </Bouton>
                    </form>
                  </div>
                )}
              </Carte>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
