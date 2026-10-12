import Link from "next/link";
import { Badge, Carte, ListeVide } from "@/components/ui";
import { chiffresPeriode, encours, rentabiliteChantiers } from "@/lib/indicateurs";
import { organisationCourante } from "@/lib/dal";
import { EXPLICATION_OBSTACLE, anneeDe, evolution, moisDe, moisPrecedent } from "@/lib/pilotage";
import { formaterEuros, formaterTaux } from "@/lib/calcul";
import { FormulaireCoutHoraire } from "./FormulaireCoutHoraire";

export const metadata = { title: "Pilotage — Plombéo" };

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" });

export default async function PagePilotage() {
  const maintenant = new Date();
  const mois = moisDe(maintenant);
  const precedent = moisPrecedent(mois);
  const annee = anneeDe(maintenant);

  const [organisation, ceMois, moisDavant, cetteAnnee, enCours, chantiers] = await Promise.all([
    organisationCourante(),
    chiffresPeriode(mois),
    chiffresPeriode(precedent),
    chiffresPeriode(annee),
    encours(),
    rentabiliteChantiers(),
  ]);

  const evolFacture = evolution(ceMois.factureCents, moisDavant.factureCents);
  const calculables = chantiers.filter((c) => c.resultat.calculable);
  const nonCalculables = chantiers.length - calculables.length;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Pilotage</h1>
        <p className="text-sm text-attenue mt-1">
          Des totaux de gestion, constatés à partir de vos pièces.
        </p>
      </header>

      {/* Constaté vs estimé : la distinction est annoncée, pas supposée
          comprise. C'est le risque n°1 de cette phase. */}
      <Carte>
        <h2 className="font-semibold mb-2">Ce que vous lisez ici</h2>
        <p className="text-sm">
          Les montants ci-dessous sont <strong>constatés</strong> : ils viennent de vos
          factures, de vos encaissements et de vos achats enregistrés.
        </p>
        <p className="text-sm text-attenue mt-2">
          Plombéo n&apos;affiche pas de « chiffre d&apos;affaires » : sa détermination
          dépend de votre régime et revient à votre expert-comptable. Aucune prévision
          n&apos;est faite non plus — seulement des périodes passées.
        </p>
      </Carte>

      <section className="grid gap-3 sm:grid-cols-2">
        <Carte>
          <p className="text-sm text-attenue">Facturé — {mois.libelle}</p>
          <p className="text-2xl font-bold mt-1">{formaterEuros(ceMois.factureCents)}</p>
          <p className="text-sm text-attenue mt-1">
            {ceMois.nombreFactures} facture{ceMois.nombreFactures > 1 ? "s" : ""}
          </p>
          {/* Aucun taux depuis une base nulle : « +100 % » depuis rien ne veut
              rien dire. */}
          <p className="text-sm mt-2">
            {evolFacture.tauxCentiemes === null
              ? `${formaterEuros(precedent.debut ? moisDavant.factureCents : 0)} le mois précédent`
              : `${evolFacture.ecartCents >= 0 ? "+" : ""}${formaterTaux(evolFacture.tauxCentiemes)} vs ${precedent.libelle}`}
          </p>
        </Carte>

        <Carte>
          <p className="text-sm text-attenue">Encaissé — {mois.libelle}</p>
          <p className="text-2xl font-bold mt-1">{formaterEuros(ceMois.encaisseCents)}</p>
          <p className="text-sm text-attenue mt-1">Paiements reçus sur le mois</p>
        </Carte>

        <Carte>
          <p className="text-sm text-attenue">Achats — {mois.libelle}</p>
          <p className="text-2xl font-bold mt-1">{formaterEuros(ceMois.achatsCents)}</p>
          <p className="text-sm text-attenue mt-1">
            {ceMois.nombreAchats} achat{ceMois.nombreAchats > 1 ? "s" : ""} validé
            {ceMois.nombreAchats > 1 ? "s" : ""}, HT
          </p>
        </Carte>

        <Carte>
          <p className="text-sm text-attenue">Reste à encaisser</p>
          <p className="text-2xl font-bold mt-1">{formaterEuros(enCours.resteCents)}</p>
          <p className="text-sm text-attenue mt-1">
            {enCours.nombre} facture{enCours.nombre > 1 ? "s" : ""} en attente
          </p>
        </Carte>
      </section>

      <Carte>
        <h2 className="font-semibold mb-2">Année {annee.libelle}</h2>
        <dl className="text-sm flex flex-col gap-1">
          <div className="flex justify-between">
            <dt>Facturé</dt>
            <dd className="font-medium">{formaterEuros(cetteAnnee.factureCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Encaissé</dt>
            <dd className="font-medium">{formaterEuros(cetteAnnee.encaisseCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Achats (HT)</dt>
            <dd className="font-medium">{formaterEuros(cetteAnnee.achatsCents)}</dd>
          </div>
        </dl>
      </Carte>

      <FormulaireCoutHoraire coutHoraireCents={organisation.coutHoraireCents} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Rentabilité par chantier</h2>
        {chantiers.length === 0 ? (
          <ListeVide titre="Aucun chantier clôturé">
            La rentabilité se calcule sur les interventions clôturées et facturées.
          </ListeVide>
        ) : (
          <>
            {nonCalculables > 0 && (
              <p className="text-sm text-attenue">
                {nonCalculables} chantier{nonCalculables > 1 ? "s" : ""} ne peu
                {nonCalculables > 1 ? "vent" : "t"} pas être évalué
                {nonCalculables > 1 ? "s" : ""} : il manque une donnée. Ils restent
                affichés — les écarter donnerait une moyenne flatteuse.
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {chantiers.map((c) => (
                <li key={c.interventionId}>
                  <Link href={`/app/interventions/${c.interventionId}`} className="block">
                    <Carte>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{c.clientNom}</p>
                          <p className="text-sm text-attenue">{formatDate.format(c.date)}</p>
                          {!c.resultat.calculable && (
                            <p className="text-sm text-attenue mt-1">
                              {EXPLICATION_OBSTACLE[c.resultat.obstacle]}
                            </p>
                          )}
                          {c.resultat.calculable && (
                            <p className="text-sm text-attenue mt-1">
                              Produit {formaterEuros(c.resultat.rentabilite.produitCents)} ·
                              fournitures{" "}
                              {formaterEuros(c.resultat.rentabilite.coutFournituresCents)} ·
                              main-d&apos;œuvre{" "}
                              {formaterEuros(c.resultat.rentabilite.coutMainOeuvreCents)}
                            </p>
                          )}
                        </div>
                        {c.resultat.calculable ? (
                          <div className="text-right whitespace-nowrap">
                            <p className="font-bold">
                              {formaterEuros(c.resultat.rentabilite.resultatCents)}
                            </p>
                            <Badge
                              ton={
                                c.resultat.rentabilite.resultatCents >= 0 ? "succes" : "danger"
                              }
                            >
                              {formaterTaux(c.resultat.rentabilite.tauxCentiemes)}
                            </Badge>
                          </div>
                        ) : (
                          <Badge>Non calculable</Badge>
                        )}
                      </div>
                    </Carte>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <Carte>
        <h2 className="font-semibold mb-1">Export pour le comptable</h2>
        <p className="text-sm text-attenue mb-3">
          Deux relevés de gestion au format tableur, sur l&apos;année en cours. Ce
          n&apos;est pas un fichier des écritures comptables : Plombéo ne tient pas de
          plan comptable.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/export/ventes"
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                       font-semibold bg-white text-encre border border-trait hover:bg-fond"
          >
            Journal des ventes
          </a>
          <a
            href="/api/export/achats"
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                       font-semibold bg-white text-encre border border-trait hover:bg-fond"
          >
            Journal des achats
          </a>
        </div>
      </Carte>
    </div>
  );
}
