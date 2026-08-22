import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Bouton, Carte, ListeVide } from "@/components/ui";
import { lireClient } from "@/lib/crm";
import { sessionCourante } from "@/lib/dal";
import { roleAutorise } from "@/lib/permissions";
import {
  adresseCourte,
  LIBELLE_CONSENTEMENT,
  LIBELLE_TYPE_CLIENT,
  LIBELLE_TYPE_LOGEMENT,
} from "@/lib/libelles";
import { archiverClient, definirConsentement, restaurerClient } from "../actions";
import { BlocSuppression } from "./BlocSuppression";
import { Televersement } from "@/components/Televersement";
import { GalerieDocuments } from "@/components/GalerieDocuments";
import { listerDocuments } from "@/lib/documents";
import { basculerRelancesClient } from "../../automatisations/actions";
import { BlocPortail } from "./BlocPortail";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Fiche client — Plombéo" };

const TYPES_CONSENTEMENT = ["EMAIL_COMMERCIAL", "SMS_COMMERCIAL"] as const;

export default async function PageClient(props: PageProps<"/app/clients/[id]">) {
  const { id } = await props.params;
  const client = await lireClient(id);
  // `lireClient` filtre déjà sur l'organisation : une fiche d'un autre artisan
  // arrive ici comme `null`, donc en 404 — indiscernable d'un identifiant
  // inexistant, ce qui est voulu.
  if (!client) notFound();

  const contexte = await sessionCourante();
  const peutModifier = contexte ? roleAutorise(contexte.role, "client:modifier") : false;
  const peutArchiver = contexte ? roleAutorise(contexte.role, "client:archiver") : false;
  const peutSupprimer = contexte ? roleAutorise(contexte.role, "client:supprimer") : false;

  const peutVerser = contexte ? roleAutorise(contexte.role, "document:modifier") : false;
  const peutSupprimerDoc = contexte ? roleAutorise(contexte.role, "document:supprimer") : false;
  const documents = await listerDocuments({ clientId: client.id });
  const peutPortail = contexte ? roleAutorise(contexte.role, "portail:gerer") : false;
  const accesPortail = contexte
    ? await prisma.clientAccess.findFirst({
        where: { clientId: client.id, organizationId: contexte.organizationId, revokedAt: null },
        orderBy: { createdAt: "desc" },
        select: { vuLe: true, expiresAt: true },
      })
    : null;
  const portailActif = Boolean(accesPortail && accesPortail.expiresAt > new Date());

  const consentements = new Map(client.consents.map((c) => [c.type, c]));

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{client.nomAffichage}</h1>
            {client.archivedAt && <Badge ton="alerte">Archivé</Badge>}
          </div>
          <p className="text-attenue mt-1">{LIBELLE_TYPE_CLIENT[client.type]}</p>
        </div>
        {peutModifier && !client.archivedAt && (
          <Link
            href={`/app/clients/${client.id}/modifier`}
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                       font-semibold bg-white text-encre border border-trait hover:bg-fond shrink-0"
          >
            Modifier
          </Link>
        )}
      </header>

      <Carte>
        <h2 className="font-semibold mb-3">Coordonnées</h2>
        <dl className="flex flex-col gap-2 text-sm">
          <Ligne libelle="Téléphone">
            {client.telephone ? (
              <a href={`tel:${client.telephone}`} className="text-encre underline font-medium">
                {client.telephone}
              </a>
            ) : null}
          </Ligne>
          <Ligne libelle="Téléphone secondaire">{client.telephoneSecondaire}</Ligne>
          <Ligne libelle="E-mail">
            {client.email ? (
              <a href={`mailto:${client.email}`} className="text-encre underline font-medium">
                {client.email}
              </a>
            ) : null}
          </Ligne>
          <Ligne libelle="Adresse de facturation">{adresseCourte(client)}</Ligne>
          {client.type === "PROFESSIONNEL" && (
            <>
              <Ligne libelle="Contact">{client.contactNom}</Ligne>
              <Ligne libelle="SIRET">{client.siret}</Ligne>
              <Ligne libelle="TVA intracommunautaire">{client.tvaIntracommunautaire}</Ligne>
            </>
          )}
        </dl>
      </Carte>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Logements et sites</h2>
          {peutModifier && !client.archivedAt && (
            <Link
              href={`/app/clients/${client.id}/logements/nouveau`}
              className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                         font-semibold bg-action text-white hover:bg-action-fonce shrink-0"
            >
              + Logement
            </Link>
          )}
        </div>

        {client.properties.length === 0 ? (
          <ListeVide titre="Aucun logement enregistré">
            Ajoutez le lieu où vous intervenez pour y tenir le carnet technique.
          </ListeVide>
        ) : (
          <ul className="flex flex-col gap-2">
            {client.properties.map((logement) => (
              <li key={logement.id}>
                <Link href={`/app/logements/${logement.id}`} className="block">
                  <Carte className="hover:border-action">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {logement.libelle || adresseCourte(logement) || "Logement"}
                        </p>
                        <p className="text-sm text-attenue truncate">
                          {LIBELLE_TYPE_LOGEMENT[logement.type]}
                          {logement.libelle && adresseCourte(logement)
                            ? ` · ${adresseCourte(logement)}`
                            : ""}
                        </p>
                      </div>
                      {logement._count.equipments > 0 && (
                        <Badge>
                          {logement._count.equipments} équipement
                          {logement._count.equipments > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </Carte>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Carte>
        <h2 className="font-semibold mb-1">Communications commerciales</h2>
        <p className="text-sm text-attenue mb-3">
          Ne concerne que la prospection et les offres. Les messages liés à une
          intervention en cours (rendez-vous, devis) n&apos;en dépendent pas.
        </p>
        <ul className="flex flex-col gap-3">
          {TYPES_CONSENTEMENT.map((type) => {
            const consentement = consentements.get(type);
            const accorde = consentement?.accorde ?? false;
            return (
              <li key={type} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{LIBELLE_CONSENTEMENT[type]}</p>
                  <p className="text-sm text-attenue">
                    {accorde ? "Consentement recueilli" : "Pas de consentement"}
                  </p>
                </div>
                {peutModifier && (
                  <form action={definirConsentement}>
                    <input type="hidden" name="clientId" value={client.id} />
                    <input type="hidden" name="type" value={type} />
                    <input type="hidden" name="accorde" value={accorde ? "false" : "true"} />
                    <Bouton type="submit" variante="discret">
                      {accorde ? "Retirer" : "Enregistrer"}
                    </Bouton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </Carte>

      {client.notes && (
        <Carte>
          <h2 className="font-semibold mb-2">Note interne</h2>
          <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
        </Carte>
      )}

      <Carte className="border-dashed">
        <h2 className="font-semibold mb-2">Historique</h2>
        <p className="text-sm text-attenue">
          Les rendez-vous, devis, factures et interventions de ce client apparaîtront ici
          au fur et à mesure de leur mise en service.
        </p>
      </Carte>

      {peutPortail && (
        <BlocPortail
          clientId={client.id}
          actif={portailActif}
          vuLe={accesPortail?.vuLe ?? null}
        />
      )}

      {peutModifier && (
        <Carte>
          <h2 className="font-semibold mb-1">Relances automatiques</h2>
          <p className="text-sm text-attenue mb-3">
            {client.relancesDesactivees
              ? "Ce client est exclu des relances automatiques. Vous le gérez vous-même."
              : "Ce client peut recevoir des relances automatiques pour ses factures échues."}
          </p>
          <form action={basculerRelancesClient}>
            <input type="hidden" name="id" value={client.id} />
            <Bouton type="submit" variante="discret">
              {client.relancesDesactivees ? "Réactiver les relances" : "Exclure des relances"}
            </Bouton>
          </form>
        </Carte>
      )}

      <Carte>
        <h2 className="font-semibold mb-1">Pièces du dossier</h2>
        <p className="text-sm text-attenue mb-3">
          Devis signés, attestations, notices : tout ce qui concerne ce client.
        </p>
        <GalerieDocuments documents={documents} peutSupprimer={peutSupprimerDoc} />
        {peutVerser && (
          <div className="mt-3">
            <Televersement rattachement={{ clientId: client.id }} titre="Ajouter un document" />
          </div>
        )}
      </Carte>

      {peutArchiver && (
        <Carte>
          <h2 className="font-semibold mb-1">
            {client.archivedAt ? "Client archivé" : "Archiver ce client"}
          </h2>
          <p className="text-sm text-attenue mb-3">
            {client.archivedAt
              ? "Ce client est masqué des listes. Vous pouvez le remettre en service."
              : "Le client sera masqué des listes, sans perdre aucune donnée."}
          </p>
          <form action={client.archivedAt ? restaurerClient : archiverClient}>
            <input type="hidden" name="id" value={client.id} />
            <Bouton type="submit" variante="discret">
              {client.archivedAt ? "Remettre en service" : "Archiver"}
            </Bouton>
          </form>
        </Carte>
      )}

      {peutSupprimer && (
        <BlocSuppression clientId={client.id} nomAffichage={client.nomAffichage} />
      )}
    </div>
  );
}

/** Ligne de définition, masquée si la valeur est vide (pas de « — » partout). */
function Ligne({ libelle, children }: { libelle: string; children: React.ReactNode }) {
  const vide =
    children === null || children === undefined || children === "" || children === false;
  if (vide) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:gap-2">
      <dt className="text-attenue sm:w-56 shrink-0">{libelle}</dt>
      <dd className="font-medium break-words">{children}</dd>
    </div>
  );
}
