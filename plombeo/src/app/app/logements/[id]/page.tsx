import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Bouton, Carte, ListeVide } from "@/components/ui";
import { lireLogement } from "@/lib/crm";
import { sessionCourante } from "@/lib/dal";
import { roleAutorise } from "@/lib/permissions";
import {
  adresseCourte,
  formaterDate,
  LIBELLE_CATEGORIE_EQUIPEMENT,
  LIBELLE_TYPE_LOGEMENT,
} from "@/lib/libelles";
import { archiverLogement, supprimerEquipement } from "../../clients/actions";
import { FormulaireEquipement } from "./FormulaireEquipement";

export const metadata = { title: "Carnet technique — Plombéo" };

export default async function PageLogement(props: PageProps<"/app/logements/[id]">) {
  const { id } = await props.params;
  const logement = await lireLogement(id);
  if (!logement) notFound();

  const contexte = await sessionCourante();
  const peutModifier = contexte ? roleAutorise(contexte.role, "client:modifier") : false;
  const peutArchiver = contexte ? roleAutorise(contexte.role, "client:archiver") : false;

  const adresse = adresseCourte(logement);
  const aDesInfosAcces =
    logement.etage || logement.digicode || logement.interphone || logement.instructionsAcces;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-attenue">
            <Link href={`/app/clients/${logement.client.id}`} className="underline">
              {logement.client.nomAffichage}
            </Link>
          </p>
          <h1 className="text-2xl font-bold mt-1">
            {logement.libelle || adresse || "Logement"}
          </h1>
          <p className="text-attenue mt-1">{LIBELLE_TYPE_LOGEMENT[logement.type]}</p>
        </div>
        {peutModifier && (
          <Link
            href={`/app/logements/${logement.id}/modifier`}
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                       font-semibold bg-white text-encre border border-trait hover:bg-fond shrink-0"
          >
            Modifier
          </Link>
        )}
      </header>

      {adresse && (
        <Carte>
          <h2 className="font-semibold mb-2">Adresse</h2>
          <p className="text-sm">{adresse}</p>
          {logement.complement && (
            <p className="text-sm text-attenue">{logement.complement}</p>
          )}
          {/* Ouvre l'application de navigation du téléphone : sur le terrain,
              c'est l'action la plus fréquente depuis cet écran. */}
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(adresse)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center min-h-11 px-4 mt-3 rounded-controle
                       font-semibold bg-white text-encre border border-trait hover:bg-fond"
          >
            Ouvrir dans le GPS
          </a>
        </Carte>
      )}

      {aDesInfosAcces && (
        <Carte>
          <h2 className="font-semibold mb-2">Accès</h2>
          <dl className="flex flex-col gap-2 text-sm">
            {logement.etage && (
              <div className="flex gap-2">
                <dt className="text-attenue w-40 shrink-0">Étage</dt>
                <dd className="font-medium">{logement.etage}</dd>
              </div>
            )}
            {logement.digicode && (
              <div className="flex gap-2">
                <dt className="text-attenue w-40 shrink-0">Digicode</dt>
                <dd className="font-medium">{logement.digicode}</dd>
              </div>
            )}
            {logement.interphone && (
              <div className="flex gap-2">
                <dt className="text-attenue w-40 shrink-0">Interphone</dt>
                <dd className="font-medium">{logement.interphone}</dd>
              </div>
            )}
            {logement.instructionsAcces && (
              <div className="flex flex-col gap-1">
                <dt className="text-attenue">Instructions</dt>
                <dd className="font-medium whitespace-pre-wrap">{logement.instructionsAcces}</dd>
              </div>
            )}
          </dl>
        </Carte>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Carnet technique</h2>

        {logement.equipments.length === 0 ? (
          <ListeVide titre="Aucun équipement enregistré">
            Notez la chaudière, le chauffe-eau ou tout matériel installé pour le retrouver
            avant votre prochaine intervention.
          </ListeVide>
        ) : (
          <ul className="flex flex-col gap-2">
            {logement.equipments.map((equipement) => (
              <li key={equipement.id}>
                <Carte>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {LIBELLE_CATEGORIE_EQUIPEMENT[equipement.categorie]}
                      </p>
                      <p className="text-sm text-attenue">
                        {[equipement.marque, equipement.modele].filter(Boolean).join(" ") ||
                          "Marque et modèle non renseignés"}
                      </p>
                    </div>
                    {equipement.localisation && <Badge>{equipement.localisation}</Badge>}
                  </div>

                  <dl className="flex flex-col gap-1 text-sm mt-3">
                    {equipement.numeroSerie && (
                      <div className="flex gap-2">
                        <dt className="text-attenue w-40 shrink-0">N° de série</dt>
                        <dd className="font-medium break-all">{equipement.numeroSerie}</dd>
                      </div>
                    )}
                    {equipement.datePose && (
                      <div className="flex gap-2">
                        <dt className="text-attenue w-40 shrink-0">Posé le</dt>
                        <dd className="font-medium">{formaterDate(equipement.datePose)}</dd>
                      </div>
                    )}
                    {equipement.finGarantie && (
                      <div className="flex gap-2">
                        <dt className="text-attenue w-40 shrink-0">Garantie jusqu&apos;au</dt>
                        <dd className="font-medium">{formaterDate(equipement.finGarantie)}</dd>
                      </div>
                    )}
                    {equipement.prochainEntretien && (
                      <div className="flex gap-2">
                        <dt className="text-attenue w-40 shrink-0">Prochain entretien</dt>
                        <dd className="font-medium">
                          {formaterDate(equipement.prochainEntretien)}
                          <span className="text-attenue font-normal"> (aucun rappel automatique)</span>
                        </dd>
                      </div>
                    )}
                  </dl>

                  {equipement.notes && (
                    <p className="text-sm whitespace-pre-wrap mt-2">{equipement.notes}</p>
                  )}

                  {peutModifier && (
                    <form action={supprimerEquipement} className="mt-3">
                      <input type="hidden" name="id" value={equipement.id} />
                      <input type="hidden" name="propertyId" value={logement.id} />
                      <Bouton type="submit" variante="discret">
                        Retirer
                      </Bouton>
                    </form>
                  )}
                </Carte>
              </li>
            ))}
          </ul>
        )}

        {peutModifier && <FormulaireEquipement propertyId={logement.id} />}
      </section>

      {logement.notes && (
        <Carte>
          <h2 className="font-semibold mb-2">Notes sur le logement</h2>
          <p className="text-sm whitespace-pre-wrap">{logement.notes}</p>
        </Carte>
      )}

      {peutArchiver && (
        <Carte>
          <h2 className="font-semibold mb-1">Archiver ce logement</h2>
          <p className="text-sm text-attenue mb-3">
            Le logement sera masqué de la fiche client, sans perdre son carnet technique.
          </p>
          <form action={archiverLogement}>
            <input type="hidden" name="id" value={logement.id} />
            <input type="hidden" name="clientId" value={logement.client.id} />
            <Bouton type="submit" variante="discret">
              Archiver
            </Bouton>
          </form>
        </Carte>
      )}
    </div>
  );
}
