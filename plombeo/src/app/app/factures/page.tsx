import Link from "next/link";
import { Badge, Carte, ListeVide } from "@/components/ui";
import { compterImpayees, listerFactures } from "@/lib/facturation";
import { formaterEuros } from "@/lib/calcul";
import type { FactureStatut } from "@/generated/prisma/enums";

export const metadata = { title: "Factures — Plombéo" };

export const LIBELLE_STATUT_FACTURE: Record<FactureStatut, string> = {
  BROUILLON: "Brouillon",
  EMISE: "Émise",
  ENVOYEE: "Envoyée",
  PARTIELLEMENT_PAYEE: "Partiellement payée",
  PAYEE: "Payée",
};

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" });

export default async function PageFactures(props: PageProps<"/app/factures">) {
  const parametres = await props.searchParams;
  const filtre = typeof parametres["statut"] === "string" ? parametres["statut"] : "";
  const statut = filtre in LIBELLE_STATUT_FACTURE ? (filtre as FactureStatut) : undefined;

  const [factures, impayees] = await Promise.all([listerFactures(statut), compterImpayees()]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Factures</h1>
          <p className="text-attenue mt-1">
            {factures.length === 0 ? "Aucune facture." : `${factures.length} facture(s)`}
          </p>
        </div>
      </header>

      {impayees.nombre > 0 && (
        <Carte className="border-[#eed9ae]">
          <h2 className="font-semibold">
            À encaisser <Badge ton="alerte">{impayees.nombre}</Badge>
          </h2>
          <p className="text-sm text-attenue mt-1">
            {formaterEuros(impayees.montantCents)} restent dus.
          </p>
        </Carte>
      )}

      <nav aria-label="Filtrer par statut" className="flex gap-2 overflow-x-auto pb-1">
        <Filtre actuel={filtre} valeur="" libelle="Toutes" />
        {(["BROUILLON", "ENVOYEE", "PAYEE"] as const).map((s) => (
          <Filtre key={s} actuel={filtre} valeur={s} libelle={LIBELLE_STATUT_FACTURE[s]} />
        ))}
      </nav>

      {factures.length === 0 ? (
        <ListeVide titre="Aucune facture">
          Créez une facture depuis un devis accepté, ou directement.
        </ListeVide>
      ) : (
        <ul className="flex flex-col gap-2">
          {factures.map((f) => (
            <li key={f.id}>
              <Link href={`/app/factures/${f.id}`} className="block">
                <Carte className="hover:border-action">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {f.numero ?? "Brouillon"} — {f.client.nomAffichage}
                      </p>
                      {f.objet && <p className="text-sm text-attenue truncate">{f.objet}</p>}
                      <p className="text-sm text-attenue">
                        {formatDate.format(f.dateFacture)} ·{" "}
                        {formaterEuros(f.solde.totalTtcCents)} TTC
                        {f.solde.resteCents > 0 && f.statut !== "BROUILLON"
                          ? ` · reste ${formaterEuros(f.solde.resteCents)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge ton={f.statut === "PAYEE" ? "succes" : "neutre"}>
                        {LIBELLE_STATUT_FACTURE[f.statut]}
                      </Badge>
                      {f.enRetard && <Badge ton="danger">En retard</Badge>}
                      {f.solde.avoirsCents > 0 && <Badge ton="alerte">Avoir</Badge>}
                    </div>
                  </div>
                </Carte>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Filtre({ actuel, valeur, libelle }: { actuel: string; valeur: string; libelle: string }) {
  const actif = actuel === valeur;
  return (
    <Link
      href={valeur ? `/app/factures?statut=${valeur}` : "/app/factures"}
      className={`inline-flex items-center min-h-11 px-4 rounded-controle text-sm font-semibold shrink-0 ${
        actif ? "bg-encre text-white" : "bg-white text-encre border border-trait"
      }`}
    >
      {libelle}
    </Link>
  );
}
