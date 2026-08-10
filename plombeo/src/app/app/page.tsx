import Link from "next/link";
import { APrevoir, Badge, Bouton, Carte } from "@/components/ui";
import { exigerSession, organisationCourante } from "@/lib/dal";
import { compterClients } from "@/lib/crm";
import {
  compterDemandesOuvertes,
  listerInterventionsEnCours,
  listerRendezVousDuJour,
  prochainRendezVous,
} from "@/lib/terrain";
import { adresseCourte } from "@/lib/libelles";
import { formaterHeure } from "@/lib/format";
import { demarrerIntervention } from "./agenda/actions";

/**
 * Écran d'accueil (§74).
 *
 * Il doit répondre à une seule question : QUE DOIS-JE FAIRE MAINTENANT ?
 * D'où l'ordre retenu — prochain rendez-vous d'abord, puis ce qui attend une
 * décision, puis les raccourcis. Les chiffres décoratifs viendront avec le
 * tableau de bord de pilotage (Phase 9), et pas avant d'avoir des données
 * réelles à y mettre.
 */
export default async function TableauDeBord() {
  const contexte = await exigerSession();
  const organisation = await organisationCourante();

  const [suivant, duJour, enCours, demandesOuvertes, nombreClients] = await Promise.all([
    prochainRendezVous(),
    listerRendezVousDuJour(new Date()),
    listerInterventionsEnCours(),
    compterDemandesOuvertes(),
    compterClients(),
  ]);

  const adresseSuivant = suivant?.property ? adresseCourte(suivant.property) : "";

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">{organisation.nom}</h1>
        <p className="text-attenue mt-1 text-sm">{contexte.email}</p>
      </header>

      {enCours.length > 0 && (
        <Carte className="border-[#eed9ae]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">
                Intervention en cours <Badge ton="alerte">{enCours.length}</Badge>
              </h2>
              <p className="text-sm text-attenue mt-1">
                {enCours.map((i) => i.client.nomAffichage).join(", ")}
              </p>
            </div>
            <Link
              href={`/app/interventions/${enCours[0]!.id}`}
              className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                         font-semibold bg-action text-white hover:bg-action-fonce shrink-0"
            >
              Reprendre
            </Link>
          </div>
        </Carte>
      )}

      <Carte>
        <h2 className="font-semibold mb-2">Prochain rendez-vous</h2>
        {suivant ? (
          <>
            <p className="font-medium">
              {formaterHeure(suivant.debut)} — {suivant.client.nomAffichage}
            </p>
            {suivant.titre && <p className="text-sm text-attenue">{suivant.titre}</p>}
            {adresseSuivant && (
              <p className="text-sm text-attenue">{adresseSuivant}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {suivant.intervention ? (
                <Link
                  href={`/app/interventions/${suivant.intervention.id}`}
                  className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                             font-semibold bg-encre text-white hover:bg-encre-clair"
                >
                  Ouvrir l&apos;intervention
                </Link>
              ) : (
                <form action={demarrerIntervention}>
                  <input type="hidden" name="appointmentId" value={suivant.id} />
                  <Bouton type="submit">Démarrer</Bouton>
                </form>
              )}
              {adresseSuivant && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(adresseSuivant)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                             font-semibold bg-white text-encre border border-trait hover:bg-fond"
                >
                  GPS
                </a>
              )}
              {suivant.client.telephone && (
                <a
                  href={`tel:${suivant.client.telephone}`}
                  className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                             font-semibold bg-white text-encre border border-trait hover:bg-fond"
                >
                  Appeler
                </a>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-attenue">
            Aucun rendez-vous à venir.{" "}
            <Link href="/app/agenda/nouveau" className="text-encre underline font-semibold">
              En planifier un
            </Link>
          </p>
        )}
      </Carte>

      <div className="grid grid-cols-2 gap-3">
        <Raccourci
          href="/app/agenda"
          titre="Aujourd'hui"
          valeur={`${duJour.length} RDV`}
        />
        <Raccourci
          href="/app/demandes"
          titre="Demandes"
          valeur={`${demandesOuvertes} en attente`}
          alerte={demandesOuvertes > 0}
        />
        <Raccourci href="/app/clients" titre="Clients" valeur={`${nombreClients} fiches`} />
        <Raccourci href="/app/demandes/nouvelle" titre="Noter un appel" valeur="+ Demande" />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-attenue">
          Prochainement
        </h2>
        <APrevoir titre="Devis" phase="Phase 4" />
        <APrevoir titre="Factures et paiements" phase="Phase 5" />
        <APrevoir titre="Photos et documents" phase="Phase 6" />
      </section>
    </div>
  );
}

function Raccourci({
  href,
  titre,
  valeur,
  alerte,
}: {
  href: string;
  titre: string;
  valeur: string;
  alerte?: boolean;
}) {
  return (
    <Link href={href} className="block">
      <Carte className={`h-full hover:border-action ${alerte ? "border-[#eed9ae]" : ""}`}>
        <p className="text-sm text-attenue">{titre}</p>
        <p className="font-semibold mt-1">{valeur}</p>
      </Carte>
    </Link>
  );
}
