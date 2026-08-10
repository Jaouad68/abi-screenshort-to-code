import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Bouton, Carte } from "@/components/ui";
import { lireIntervention } from "@/lib/terrain";
import { sessionCourante } from "@/lib/dal";
import { roleAutorise } from "@/lib/permissions";
import { adresseCourte, LIBELLE_CATEGORIE_EQUIPEMENT } from "@/lib/libelles";
import { formaterQuantite, formaterDuree, totalMinutes } from "@/lib/format";
import { transitionInterventionAutorisee } from "@/lib/etats";
import { changerEtatIntervention } from "../../agenda/actions";
import { creerDevisDepuisIntervention } from "../../devis/actions";
import { SaisieTerrain } from "./SaisieTerrain";
import { FormulaireCompteRendu } from "./FormulaireCompteRendu";
import { SignaturePad } from "@/components/SignaturePad";
import { Televersement } from "@/components/Televersement";
import { GalerieDocuments } from "@/components/GalerieDocuments";
import { listerDocuments, listerSignatures, resumerIntervention } from "@/lib/documents";

export const metadata = { title: "Intervention — Plombéo" };

const formatHorodatage = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
});

const LIBELLE_STATUT = {
  PLANIFIEE: "Planifiée",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  CLOTUREE: "Clôturée",
  ANNULEE: "Annulée",
} as const;

export default async function PageIntervention(props: PageProps<"/app/interventions/[id]">) {
  const { id } = await props.params;
  const intervention = await lireIntervention(id);
  if (!intervention) notFound();

  const contexte = await sessionCourante();
  const peutModifier = contexte ? roleAutorise(contexte.role, "intervention:modifier") : false;
  // Une intervention clôturée n'accepte plus d'écriture : son compte rendu
  // servira de base à la facturation (Phase 5).
  const modifiable = peutModifier && intervention.statut !== "CLOTUREE" && intervention.statut !== "ANNULEE";

  const adresse = intervention.property ? adresseCourte(intervention.property) : "";

  const peutVerser = contexte ? roleAutorise(contexte.role, "document:modifier") : false;
  const peutSupprimerDoc = contexte ? roleAutorise(contexte.role, "document:supprimer") : false;
  const peutSigner = contexte ? roleAutorise(contexte.role, "document:signer") : false;

  // Le logement et le client sont repris pour que la photo remonte aussi dans le
  // carnet du logement : c'est là qu'on la cherchera dans deux ans.
  const rattachementIntervention: Record<string, string> = {
    interventionId: intervention.id,
    clientId: intervention.client.id,
    ...(intervention.property ? { propertyId: intervention.property.id } : {}),
  };

  const [documents, signatures] = await Promise.all([
    listerDocuments({ interventionId: intervention.id }),
    listerSignatures(intervention.id),
  ]);

  // Le même résumé que celui dont le serveur calculera l'empreinte : le client
  // doit lire exactement ce qui sera figé.
  const resume = resumerIntervention({
    clientNom: intervention.client.nomAffichage,
    adresse,
    probleme: intervention.probleme,
    diagnostic: intervention.diagnostic,
    compteRendu: intervention.compteRendu,
    minutes: totalMinutes(intervention.temps),
    fournitures: intervention.fournitures,
  });

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-sm text-attenue">
          <Link href={`/app/clients/${intervention.client.id}`} className="underline">
            {intervention.client.nomAffichage}
          </Link>
        </p>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <h1 className="text-2xl font-bold">Intervention</h1>
          <Badge
            ton={
              intervention.statut === "CLOTUREE"
                ? "succes"
                : intervention.statut === "EN_COURS"
                  ? "alerte"
                  : "neutre"
            }
          >
            {LIBELLE_STATUT[intervention.statut]}
          </Badge>
        </div>
      </header>

      {intervention.property && (
        <Carte>
          <h2 className="font-semibold mb-2">Sur place</h2>
          <p className="text-sm">{adresse}</p>
          {intervention.property.digicode && (
            <p className="text-sm text-attenue mt-1">
              Digicode {intervention.property.digicode}
              {intervention.property.etage ? ` · Étage ${intervention.property.etage}` : ""}
            </p>
          )}
          {intervention.property.instructionsAcces && (
            <p className="text-sm mt-2 whitespace-pre-wrap">
              {intervention.property.instructionsAcces}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {adresse && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(adresse)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                           font-semibold bg-white text-encre border border-trait hover:bg-fond"
              >
                Ouvrir dans le GPS
              </a>
            )}
            {intervention.client.telephone && (
              <a
                href={`tel:${intervention.client.telephone}`}
                className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                           font-semibold bg-white text-encre border border-trait hover:bg-fond"
              >
                Appeler le client
              </a>
            )}
          </div>
        </Carte>
      )}

      {intervention.equipment && (
        <Carte>
          <h2 className="font-semibold mb-1">Équipement concerné</h2>
          <p className="text-sm">
            {LIBELLE_CATEGORIE_EQUIPEMENT[intervention.equipment.categorie]}
            {[intervention.equipment.marque, intervention.equipment.modele]
              .filter(Boolean)
              .join(" ")
              ? ` — ${[intervention.equipment.marque, intervention.equipment.modele].filter(Boolean).join(" ")}`
              : ""}
          </p>
        </Carte>
      )}

      <SaisieTerrain
        interventionId={intervention.id}
        modifiable={modifiable}
        minutesServeur={totalMinutes(intervention.temps)}
        tachesServeur={intervention.taches.map((t) => ({
          id: t.id,
          libelle: t.libelle,
          detail: t.faite ? "Faite" : undefined,
        }))}
        tempsServeur={intervention.temps.map((t) => ({
          id: t.id,
          libelle: formaterDuree(t.minutes),
          detail: t.libelle || undefined,
        }))}
        fournituresServeur={intervention.fournitures.map((f) => ({
          id: f.id,
          libelle: f.libelle,
          detail: `${formaterQuantite(f.quantiteMilli)} ${f.unite}`,
        }))}
      />

      <FormulaireCompteRendu
        interventionId={intervention.id}
        modifiable={modifiable}
        valeurs={{
          probleme: intervention.probleme,
          diagnostic: intervention.diagnostic,
          compteRendu: intervention.compteRendu,
        }}
      />

      <Carte>
        <h2 className="font-semibold mb-1">Photos et pièces</h2>
        <p className="text-sm text-attenue mb-3">
          Photographiez avant de commencer, puis après travaux : c&apos;est votre preuve de
          l&apos;état initial comme du résultat.
        </p>
        <GalerieDocuments documents={documents} peutSupprimer={peutSupprimerDoc} />
        {peutVerser && (
          <div className="mt-3 flex flex-col gap-3">
            <Televersement
              rattachement={rattachementIntervention}
              categorieParDefaut="PHOTO"
              photo
              titre="Ajouter une photo"
            />
            <Televersement rattachement={rattachementIntervention} titre="Ajouter un document" />
          </div>
        )}
      </Carte>

      {signatures.length > 0 && (
        <Carte>
          <h2 className="font-semibold mb-3">Signatures apposées</h2>
          <ul className="flex flex-col gap-3">
            {signatures.map((s) => (
              <li key={s.id} className="border border-trait rounded-controle p-3">
                <p className="font-medium">{s.signataireNom}</p>
                <p className="text-sm text-attenue">
                  Signé le {formatHorodatage.format(s.signeLe)}
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.trace}
                  alt={`Signature de ${s.signataireNom}`}
                  className="mt-2 bg-white border border-trait rounded-controle max-h-32 w-auto"
                />
                <p className="text-xs text-attenue mt-2 break-all">
                  Empreinte du texte signé : {s.empreinteContenu}
                </p>
                <p className="text-xs text-attenue mt-1">
                  Signature simple. Plombéo ne qualifie pas sa valeur juridique.
                </p>
              </li>
            ))}
          </ul>
        </Carte>
      )}

      {peutSigner && intervention.statut !== "ANNULEE" && (
        <SignaturePad interventionId={intervention.id} resume={resume} />
      )}

      {peutModifier && intervention.statut !== "PLANIFIEE" && (
        <Carte>
          <h2 className="font-semibold mb-1">Chiffrer ces travaux</h2>
          <p className="text-sm text-attenue mb-3">
            Crée un devis reprenant votre temps et vos fournitures. Les prix restent à
            renseigner : Plombéo propose un point de départ, pas vos tarifs.
          </p>
          <form action={creerDevisDepuisIntervention}>
            <input type="hidden" name="interventionId" value={intervention.id} />
            <Bouton type="submit" variante="discret">
              Créer un devis depuis cette intervention
            </Bouton>
          </form>
        </Carte>
      )}

      {peutModifier && (
        <Carte>
          <h2 className="font-semibold mb-3">Suite</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            {transitionInterventionAutorisee(intervention.statut, "EN_COURS") && (
              <FormulaireEtat id={intervention.id} vers="EN_COURS" libelle="Reprendre" />
            )}
            {transitionInterventionAutorisee(intervention.statut, "TERMINEE") && (
              <FormulaireEtat id={intervention.id} vers="TERMINEE" libelle="Terminer" />
            )}
            {transitionInterventionAutorisee(intervention.statut, "CLOTUREE") && (
              <FormulaireEtat
                id={intervention.id}
                vers="CLOTUREE"
                libelle="Valider le compte rendu"
              />
            )}
          </div>
          {intervention.statut === "TERMINEE" && (
            <p className="text-sm text-attenue mt-3">
              Valider le compte rendu fige l&apos;intervention. Elle ne pourra plus être
              modifiée — c&apos;est elle qui servira de base à la facturation.
            </p>
          )}
        </Carte>
      )}
    </div>
  );
}

function FormulaireEtat({
  id,
  vers,
  libelle,
}: {
  id: string;
  vers: string;
  libelle: string;
}) {
  return (
    <form action={changerEtatIntervention}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="vers" value={vers} />
      <Bouton type="submit" variante={vers === "CLOTUREE" ? "principal" : "discret"}>
        {libelle}
      </Bouton>
    </form>
  );
}
