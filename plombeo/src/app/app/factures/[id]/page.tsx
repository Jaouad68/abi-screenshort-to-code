import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Bouton, Carte, Message } from "@/components/ui";
import { EnvoiEmail } from "@/components/EnvoiEmail";
import {
  calculerSolde,
  estEnRetard,
  lireFacture,
  totalTtc,
  totauxFacture,
  verifierIntegrite,
} from "@/lib/facturation";
import { sessionCourante } from "@/lib/dal";
import { roleAutorise } from "@/lib/permissions";
import { formaterEuros, formaterTaux } from "@/lib/calcul";
import { journaliser } from "@/lib/audit";
import {
  emettreFacture,
  marquerFactureEnvoyee,
  supprimerLigneFacture,
  supprimerPaiement,
} from "../actions";
import { LIBELLE_STATUT_FACTURE } from "../page";
import { BlocLignes } from "./BlocLignes";
import { BlocPaiement } from "./BlocPaiement";
import { BlocAvoir } from "./BlocAvoir";

export const metadata = { title: "Facture — Plombéo" };

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

const LIBELLE_MOYEN = {
  VIREMENT: "Virement",
  CHEQUE: "Chèque",
  ESPECES: "Espèces",
  CARTE: "Carte",
  AUTRE: "Autre",
} as const;

export default async function PageFacture(props: PageProps<"/app/factures/[id]">) {
  const { id } = await props.params;
  const facture = await lireFacture(id);
  if (!facture) notFound();

  const contexte = await sessionCourante();
  const peutModifier = contexte ? roleAutorise(contexte.role, "facture:modifier") : false;
  const peutEmettre = contexte ? roleAutorise(contexte.role, "facture:emettre") : false;
  const peutEncaisser = contexte ? roleAutorise(contexte.role, "facture:encaisser") : false;
  const modifiable = peutModifier && facture.statut === "BROUILLON";

  const totaux = totauxFacture(facture);
  const solde = calculerSolde(totalTtc(facture), facture.paiements, facture.avoirs);
  const retard = estEnRetard(facture, solde.resteCents);

  // Vérification d'intégrité à chaque affichage : une divergence signale une
  // altération faite hors application, et constitue un incident.
  const integre = verifierIntegrite(facture);
  if (integre === false) {
    await journaliser({
      action: "invoice.integrity_failed",
      organizationId: facture.organizationId,
      actorUserId: contexte?.userId ?? null,
      entityType: "Invoice",
      entityId: facture.id,
      metadata: { numero: facture.numero ?? "" },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-sm text-attenue">
          <Link href={`/app/clients/${facture.client.id}`} className="underline">
            {facture.client.nomAffichage}
          </Link>
          {facture.quote?.numero && ` · devis ${facture.quote.numero}`}
        </p>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <h1 className="text-2xl font-bold">{facture.numero ?? "Facture en brouillon"}</h1>
          <Badge ton={facture.statut === "PAYEE" ? "succes" : "neutre"}>
            {LIBELLE_STATUT_FACTURE[facture.statut]}
          </Badge>
          {facture.type === "ACOMPTE" && <Badge>Acompte</Badge>}
          {retard && <Badge ton="danger">En retard</Badge>}
        </div>
        <p className="text-attenue text-sm mt-1">
          {formatDate.format(facture.dateFacture)}
          {facture.dateEcheance && ` · échéance ${formatDate.format(facture.dateEcheance)}`}
        </p>
      </header>

      {integre === false && (
        <Message ton="erreur">
          L&apos;empreinte d&apos;intégrité de cette facture ne correspond plus à son contenu.
          Elle a été modifiée en dehors de l&apos;application. L&apos;incident est journalisé :
          faites vérifier votre base de données.
        </Message>
      )}

      {facture.numero && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/app/factures/${facture.id}/imprimer`}
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                       font-semibold bg-encre text-white hover:bg-encre-clair"
          >
            Voir / imprimer la facture
          </Link>
          <a
            href={`/api/pdf/facture/${facture.id}`}
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                       font-semibold bg-white text-encre border border-trait hover:bg-fond"
          >
            Télécharger le PDF
          </a>
        </div>
      )}

      {facture.numero && (
        <Carte>
          <h2 className="font-semibold mb-2">Envoyer au client</h2>
          <EnvoiEmail type="facture" id={facture.id} emailClient={facture.client.email} />
        </Carte>
      )}

      <BlocLignes
        invoiceId={facture.id}
        modifiable={modifiable}
        lignes={facture.lignes.map((l) => ({
          id: l.id,
          libelle: l.libelle,
          quantiteMilli: l.quantiteMilli,
          unite: l.unite,
          prixUnitaireCents: l.prixUnitaireCents,
          tauxTvaCentiemes: l.tauxTvaCentiemes,
        }))}
        supprimerLigne={supprimerLigneFacture}
      />

      <Carte>
        <h2 className="font-semibold mb-3">Totaux</h2>
        <dl className="flex flex-col gap-1 text-sm">
          <LigneTotal libelle="Total HT" valeur={formaterEuros(totaux.totalHtCents)} />
          {totaux.tvaParTaux.map((t) => (
            <LigneTotal
              key={t.tauxTvaCentiemes}
              libelle={`TVA ${formaterTaux(t.tauxTvaCentiemes)}`}
              valeur={formaterEuros(t.montantCents)}
            />
          ))}
          <LigneTotal libelle="Total TTC" valeur={formaterEuros(totaux.totalTtcCents)} fort />
          {solde.avoirsCents > 0 && (
            <>
              <LigneTotal libelle="Avoirs" valeur={`− ${formaterEuros(solde.avoirsCents)}`} />
              <LigneTotal libelle="Montant dû" valeur={formaterEuros(solde.duCents)} />
            </>
          )}
          {facture.statut !== "BROUILLON" && (
            <>
              <LigneTotal libelle="Encaissé" valeur={formaterEuros(solde.paiementsCents)} />
              <LigneTotal
                libelle="Reste à payer"
                valeur={formaterEuros(Math.max(0, solde.resteCents))}
                fort
              />
            </>
          )}
        </dl>
        {solde.surPaye && (
          <p className="text-sm text-danger font-medium mt-2">
            Les paiements enregistrés dépassent le montant dû de{" "}
            {formaterEuros(solde.paiementsCents - solde.duCents)}. Vérifiez vos saisies.
          </p>
        )}
        {facture.statut !== "BROUILLON" && (
          <p className="text-xs text-attenue mt-3">
            Les totaux de cette facture sont figés depuis son émission : ils
            n&apos;évolueront plus, quoi qu&apos;il advienne du catalogue ou du devis
            d&apos;origine.
          </p>
        )}
      </Carte>

      {facture.statut !== "BROUILLON" && peutEncaisser && (
        <BlocPaiement
          invoiceId={facture.id}
          resteCents={Math.max(0, solde.resteCents)}
          paiements={facture.paiements.map((p) => ({
            id: p.id,
            montantCents: p.montantCents,
            moyen: LIBELLE_MOYEN[p.moyen],
            date: formatDate.format(p.datePaiement),
            reference: p.reference,
          }))}
          supprimerPaiement={supprimerPaiement}
        />
      )}

      {facture.avoirs.length > 0 && (
        <Carte>
          <h2 className="font-semibold mb-3">Avoirs</h2>
          <ul className="flex flex-col divide-y divide-trait">
            {facture.avoirs.map((a) => (
              <li key={a.id} className="py-2 flex justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{a.numero}</p>
                  {a.motif && <p className="text-sm text-attenue">{a.motif}</p>}
                  <p className="text-sm text-attenue">{formatDate.format(a.dateAvoir)}</p>
                </div>
                <p className="text-sm font-semibold">− {formaterEuros(a.montantTtcCents)}</p>
              </li>
            ))}
          </ul>
        </Carte>
      )}

      {facture.statut !== "BROUILLON" && peutEmettre && solde.duCents > 0 && (
        <BlocAvoir invoiceId={facture.id} duCents={solde.duCents} />
      )}

      {(peutEmettre || peutModifier) && (
        <Carte>
          <h2 className="font-semibold mb-3">Suite</h2>
          <div className="flex flex-wrap gap-2">
            {facture.statut === "BROUILLON" && peutEmettre && facture.lignes.length > 0 && (
              <form action={emettreFacture}>
                <input type="hidden" name="id" value={facture.id} />
                <Bouton type="submit">Émettre la facture</Bouton>
              </form>
            )}
            {facture.statut === "EMISE" && peutModifier && (
              <form action={marquerFactureEnvoyee}>
                <input type="hidden" name="id" value={facture.id} />
                <Bouton type="submit" variante="discret">
                  Marquer comme envoyée
                </Bouton>
              </form>
            )}
          </div>

          {facture.statut === "BROUILLON" && (
            <p className="text-sm text-attenue mt-3">
              Émettre la facture lui attribue son numéro et <strong>fige définitivement</strong>{" "}
              son contenu. Une erreur constatée après coup se corrigera par un avoir, jamais
              par modification.
            </p>
          )}
          {facture.statut === "EMISE" && (
            <p className="text-sm text-attenue mt-3">
              Marquez la facture comme envoyée une fois qu&apos;elle est réellement partie.
              Plombéo n&apos;envoie encore aucun document lui-même.
            </p>
          )}
        </Carte>
      )}
    </div>
  );
}

function LigneTotal({
  libelle,
  valeur,
  fort,
}: {
  libelle: string;
  valeur: string;
  fort?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-3 ${fort ? "font-bold text-base" : ""}`}>
      <dt className={fort ? "" : "text-attenue"}>{libelle}</dt>
      <dd>{valeur}</dd>
    </div>
  );
}
