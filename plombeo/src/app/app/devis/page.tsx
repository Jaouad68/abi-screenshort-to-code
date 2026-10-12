import Link from "next/link";
import { Badge, Carte, ListeVide } from "@/components/ui";
import { estDepasse, listerDevis } from "@/lib/devis";
import { sessionCourante } from "@/lib/dal";
import { roleAutorise } from "@/lib/permissions";
import { formaterEuros } from "@/lib/calcul";
import type { DevisStatut } from "@/generated/prisma/enums";

export const metadata = { title: "Devis — Plombéo" };

export const LIBELLE_STATUT_DEVIS: Record<DevisStatut, string> = {
  BROUILLON: "Brouillon",
  PRET: "Prêt",
  ENVOYE: "Envoyé",
  ACCEPTE: "Accepté",
  REFUSE: "Refusé",
  EXPIRE: "Expiré",
  ANNULE: "Annulé",
};

const TON_STATUT: Record<DevisStatut, "neutre" | "succes" | "alerte" | "danger"> = {
  BROUILLON: "neutre",
  PRET: "alerte",
  ENVOYE: "alerte",
  ACCEPTE: "succes",
  REFUSE: "danger",
  EXPIRE: "danger",
  ANNULE: "neutre",
};

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" });

export default async function PageDevis(props: PageProps<"/app/devis">) {
  const parametres = await props.searchParams;
  const filtre = typeof parametres["statut"] === "string" ? parametres["statut"] : "";
  const statut = filtre in LIBELLE_STATUT_DEVIS ? (filtre as DevisStatut) : undefined;

  const devis = await listerDevis(statut);
  const contexte = await sessionCourante();
  const peutModifier = contexte ? roleAutorise(contexte.role, "devis:modifier") : false;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Devis</h1>
          <p className="text-attenue mt-1">
            {devis.length === 0 ? "Aucun devis." : `${devis.length} devis`}
          </p>
        </div>
        {peutModifier && (
          <Link
            href="/app/devis/nouveau"
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                       font-semibold bg-action text-white hover:bg-action-fonce shrink-0"
          >
            + Devis
          </Link>
        )}
      </header>

      <nav aria-label="Filtrer par statut" className="flex gap-2 overflow-x-auto pb-1">
        <FiltreStatut actuel={filtre} valeur="" libelle="Tous" />
        {(["BROUILLON", "ENVOYE", "ACCEPTE"] as const).map((s) => (
          <FiltreStatut key={s} actuel={filtre} valeur={s} libelle={LIBELLE_STATUT_DEVIS[s]} />
        ))}
      </nav>

      {devis.length === 0 ? (
        <ListeVide titre="Aucun devis">
          Créez un devis, ou générez-en un depuis une intervention terminée.
        </ListeVide>
      ) : (
        <ul className="flex flex-col gap-2">
          {devis.map((d) => {
            const depasse = estDepasse(d);
            return (
              <li key={d.id}>
                <Link href={`/app/devis/${d.id}`} className="block">
                  <Carte className="hover:border-action">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {d.numero ?? "Sans numéro"} — {d.client.nomAffichage}
                        </p>
                        {d.objet && (
                          <p className="text-sm text-attenue truncate">{d.objet}</p>
                        )}
                        <p className="text-sm text-attenue">
                          {formatDate.format(d.dateDevis)} ·{" "}
                          {formaterEuros(d.totaux.totalTtcCents)} TTC
                          {d.options.length > 1 ? ` · ${d.options.length} variantes` : ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge ton={TON_STATUT[d.statut]}>
                          {LIBELLE_STATUT_DEVIS[d.statut]}
                        </Badge>
                        {/* Signalé, mais l'état n'est PAS modifié tout seul :
                            l'expiration automatique relève de la Phase 7. */}
                        {depasse && <Badge ton="danger">Validité dépassée</Badge>}
                      </div>
                    </div>
                  </Carte>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FiltreStatut({
  actuel,
  valeur,
  libelle,
}: {
  actuel: string;
  valeur: string;
  libelle: string;
}) {
  const actif = actuel === valeur;
  return (
    <Link
      href={valeur ? `/app/devis?statut=${valeur}` : "/app/devis"}
      className={`inline-flex items-center min-h-11 px-4 rounded-controle text-sm font-semibold shrink-0 ${
        actif ? "bg-encre text-white" : "bg-white text-encre border border-trait"
      }`}
    >
      {libelle}
    </Link>
  );
}
