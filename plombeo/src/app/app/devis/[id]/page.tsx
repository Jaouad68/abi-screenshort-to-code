import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Bouton, Carte } from "@/components/ui";
import { estDepasse, lireDevis, listerFournitures, listerPrestations, totauxOption } from "@/lib/devis";
import { sessionCourante } from "@/lib/dal";
import { roleAutorise } from "@/lib/permissions";

import { transitionDevisAutorisee } from "@/lib/etats";
import { adresseCourte } from "@/lib/libelles";
import { changerEtatDevis, ajouterVariante } from "../actions";
import { LIBELLE_STATUT_DEVIS } from "../page";
import { EditeurOption } from "./EditeurOption";
import { EnteteDevis } from "./EnteteDevis";

export const metadata = { title: "Devis — Plombéo" };

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export default async function PageDevis(props: PageProps<"/app/devis/[id]">) {
  const { id } = await props.params;
  const devis = await lireDevis(id);
  if (!devis) notFound();

  const contexte = await sessionCourante();
  const peutModifier = contexte ? roleAutorise(contexte.role, "devis:modifier") : false;
  const modifiable = peutModifier && devis.statut === "BROUILLON";

  // Le catalogue n'est chargé que si l'on peut réellement s'en servir.
  const [prestations, fournitures] = modifiable
    ? await Promise.all([listerPrestations(), listerFournitures()])
    : [[], []];

  const suites = (["PRET", "ENVOYE", "ACCEPTE", "REFUSE", "ANNULE", "BROUILLON"] as const).filter(
    (vers) => transitionDevisAutorisee(devis.statut, vers),
  );

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-sm text-attenue">
          <Link href={`/app/clients/${devis.client.id}`} className="underline">
            {devis.client.nomAffichage}
          </Link>
        </p>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <h1 className="text-2xl font-bold">{devis.numero ?? "Devis en brouillon"}</h1>
          <Badge ton={devis.statut === "ACCEPTE" ? "succes" : "neutre"}>
            {LIBELLE_STATUT_DEVIS[devis.statut]}
          </Badge>
          {estDepasse(devis) && <Badge ton="danger">Validité dépassée</Badge>}
        </div>
        <p className="text-attenue text-sm mt-1">
          {formatDate.format(devis.dateDevis)} · valable {devis.validiteJours} jours
        </p>
        {devis.property && (
          <p className="text-attenue text-sm">{adresseCourte(devis.property)}</p>
        )}
      </header>

      {devis.numero && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/app/devis/${devis.id}/imprimer`}
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                       font-semibold bg-encre text-white hover:bg-encre-clair"
          >
            Voir / imprimer le devis
          </Link>
        </div>
      )}

      <EnteteDevis
        devisId={devis.id}
        modifiable={modifiable}
        valeurs={{
          objet: devis.objet,
          conditions: devis.conditions,
          notes: devis.notes,
          validiteJours: String(devis.validiteJours),
        }}
      />

      {devis.options.map((option, index) => (
        <EditeurOption
          key={option.id}
          quoteId={devis.id}
          option={{
            id: option.id,
            libelle: option.libelle,
            remisePourMille: option.remisePourMille,
            acomptePourMille: option.acomptePourMille,
            lignes: option.lignes.map((l) => ({
              id: l.id,
              libelle: l.libelle,
              description: l.description,
              quantiteMilli: l.quantiteMilli,
              unite: l.unite,
              prixUnitaireCents: l.prixUnitaireCents,
              tauxTvaCentiemes: l.tauxTvaCentiemes,
            })),
          }}
          totaux={totauxOption(option)}
          modifiable={modifiable}
          supprimable={modifiable && devis.options.length > 1}
          principale={index === 0}
          catalogue={{
            prestations: prestations.map((p) => ({
              id: p.id,
              libelle: p.libelle,
              unite: p.unite,
              prixUnitaireCents: p.prixUnitaireCents,
              tauxTvaCentiemes: p.tauxTvaCentiemes,
            })),
            fournitures: fournitures.map((f) => ({
              id: f.id,
              libelle: f.libelle,
              unite: f.unite,
              prixUnitaireCents: f.prixUnitaireCents,
              tauxTvaCentiemes: f.tauxTvaCentiemes,
            })),
          }}
        />
      ))}

      {modifiable && devis.options.length < 3 && (
        <Carte className="border-dashed">
          <h2 className="font-semibold mb-1">Proposer plusieurs formules</h2>
          <p className="text-sm text-attenue mb-3">
            Ajoutez une variante (Essentiel, Confort, Premium) pour laisser le client
            choisir son niveau. Un devis à une seule proposition reste parfaitement normal.
          </p>
          <form action={ajouterVariante}>
            <input type="hidden" name="quoteId" value={devis.id} />
            <Bouton type="submit" variante="discret">
              + Ajouter une variante
            </Bouton>
          </form>
        </Carte>
      )}

      {peutModifier && suites.length > 0 && (
        <Carte>
          <h2 className="font-semibold mb-3">Suite</h2>
          <div className="flex flex-wrap gap-2">
            {suites.map((vers) => (
              <form key={vers} action={changerEtatDevis}>
                <input type="hidden" name="id" value={devis.id} />
                <input type="hidden" name="vers" value={vers} />
                <Bouton type="submit" variante={vers === "PRET" ? "principal" : "discret"}>
                  {LIBELLE_ACTION[vers]}
                </Bouton>
              </form>
            ))}
          </div>
          {devis.statut === "BROUILLON" && (
            <p className="text-sm text-attenue mt-3">
              Passer le devis en « prêt » lui attribue son numéro et fige son contenu.
            </p>
          )}
          {devis.statut === "PRET" && (
            <p className="text-sm text-attenue mt-3">
              Marquez le devis comme envoyé une fois que vous l&apos;avez réellement remis
              au client. Plombéo n&apos;envoie encore aucun document lui-même.
            </p>
          )}
        </Carte>
      )}
    </div>
  );
}

const LIBELLE_ACTION: Record<string, string> = {
  PRET: "Marquer comme prêt",
  BROUILLON: "Repasser en brouillon",
  ENVOYE: "Marquer comme envoyé",
  ACCEPTE: "Accepté par le client",
  REFUSE: "Refusé",
  ANNULE: "Annuler",
};
