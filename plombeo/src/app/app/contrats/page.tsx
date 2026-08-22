import Link from "next/link";
import { Badge, Bouton, Carte, ListeVide } from "@/components/ui";
import { listerContrats } from "@/lib/contrats-db";
import { listerClients } from "@/lib/crm";
import { sessionCourante } from "@/lib/dal";
import { roleAutorise } from "@/lib/permissions";
import { formaterEuros } from "@/lib/calcul";
import { changerStatutContrat, enregistrerVisite } from "./actions";
import { FormulaireContrat } from "./FormulaireContrat";

export const metadata = { title: "Contrats — Plombéo" };

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

const LIBELLE_PERIODICITE: Record<string, string> = {
  MENSUELLE: "Tous les mois",
  TRIMESTRIELLE: "Tous les trimestres",
  SEMESTRIELLE: "Tous les six mois",
  ANNUELLE: "Tous les ans",
  BIENNALE: "Tous les deux ans",
};

const TON_ETAT = { EN_RETARD: "danger", DUE: "alerte", A_VENIR: "succes", AUCUNE: "neutre" } as const;
const LIBELLE_ETAT = {
  EN_RETARD: "En retard",
  DUE: "À planifier",
  A_VENIR: "À jour",
  AUCUNE: "—",
} as const;

export default async function PageContrats() {
  const [contrats, clients, contexte] = await Promise.all([
    listerContrats(),
    listerClients(),
    sessionCourante(),
  ]);
  const peutModifier = contexte ? roleAutorise(contexte.role, "contrat:modifier") : false;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Contrats d&apos;entretien</h1>
        <p className="text-sm text-attenue mt-1">
          Votre revenu récurrent, et les visites à ne pas oublier.
        </p>
      </header>

      {/* La frontière est annoncée : c'est la visite réelle qui fait foi. */}
      <Carte>
        <h2 className="font-semibold mb-2">Comment l&apos;échéance avance</h2>
        <p className="text-sm">
          La prochaine visite se calcule à partir de la <strong>dernière visite
          réellement effectuée</strong>, jamais de la date théorique. Plombéo ne coche
          aucune visite tout seul : un contrat « à jour » sans qu&apos;aucun technicien
          ne soit passé serait pire qu&apos;un contrat en retard.
        </p>
        <p className="text-sm text-attenue mt-2">
          Une échéance atteinte vous <strong>notifie</strong> ; elle ne crée jamais de
          facture. Émettre une facture engage votre entreprise, c&apos;est votre geste.
        </p>
      </Carte>

      {contrats.length === 0 ? (
        <ListeVide titre="Aucun contrat">
          Un contrat d&apos;entretien vous assure un revenu régulier et un rappel
          automatique avant chaque visite.
        </ListeVide>
      ) : (
        <ul className="flex flex-col gap-2">
          {contrats.map((c) => (
            <li key={c.id}>
              <Carte className={c.statut === "ACTIF" ? "" : "opacity-70"}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{c.libelle}</p>
                    <p className="text-sm text-attenue">
                      <Link href={`/app/clients/${c.client.id}`} className="underline">
                        {c.client.nomAffichage}
                      </Link>
                      {" · "}
                      {LIBELLE_PERIODICITE[c.periodicite]}
                      {c.montantTtcCents > 0 ? ` · ${formaterEuros(c.montantTtcCents)}` : ""}
                    </p>
                    <p className="text-sm mt-1">
                      {c.derniereVisiteLe
                        ? `Dernière visite le ${formatDate.format(c.derniereVisiteLe)}`
                        : "Aucune visite enregistrée"}
                    </p>
                    {c.echeance && (
                      <p className="text-sm text-attenue">
                        Prochaine : {formatDate.format(c.echeance)}
                      </p>
                    )}
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <Badge ton={TON_ETAT[c.etat]}>{LIBELLE_ETAT[c.etat]}</Badge>
                    {c.statut !== "ACTIF" && (
                      <p className="text-sm text-attenue mt-1">
                        {c.statut === "SUSPENDU" ? "Suspendu" : "Résilié"}
                      </p>
                    )}
                  </div>
                </div>

                {peutModifier && c.statut === "ACTIF" && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <form action={enregistrerVisite}>
                      <input type="hidden" name="id" value={c.id} />
                      <Bouton type="submit" variante="discret">
                        J&apos;ai fait la visite
                      </Bouton>
                    </form>
                    <form action={changerStatutContrat}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="vers" value="SUSPENDU" />
                      <Bouton type="submit" variante="discret">
                        Suspendre
                      </Bouton>
                    </form>
                    <form action={changerStatutContrat}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="vers" value="RESILIE" />
                      <Bouton type="submit" variante="discret">
                        Résilier
                      </Bouton>
                    </form>
                  </div>
                )}
                {peutModifier && c.statut === "SUSPENDU" && (
                  <form action={changerStatutContrat} className="mt-3">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="vers" value="ACTIF" />
                    <Bouton type="submit" variante="discret">
                      Réactiver
                    </Bouton>
                  </form>
                )}
              </Carte>
            </li>
          ))}
        </ul>
      )}

      {peutModifier && (
        <FormulaireContrat
          clients={clients.map((c) => ({ id: c.id, nom: c.nomAffichage }))}
        />
      )}
    </div>
  );
}
