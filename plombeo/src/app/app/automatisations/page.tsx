import { Badge, Bouton, Carte, ListeVide } from "@/components/ui";
import { sessionCourante } from "@/lib/dal";
import { roleAutorise } from "@/lib/permissions";
import { listerEmails, listerExecutions, listerModeles, listerRegles } from "@/lib/notifications";
import { emailDisponible, EMAIL_NON_CONFIGURE } from "@/lib/email";
import {
  DELAI_MIN_ENTRE_RELANCES_JOURS,
  HEURE_MAX,
  HEURE_MIN,
  MAX_RELANCES,
  MODELES_PAR_DEFAUT,
} from "@/lib/automatisation";
import { basculerRegle } from "./actions";
import { FormulaireRegle } from "./FormulaireRegle";
import { FormulaireModele } from "./FormulaireModele";

export const metadata = { title: "Automatisations — Plombéo" };

const LIBELLE_DECLENCHEUR: Record<string, string> = {
  FACTURE_ECHUE: "Facture échue non payée",
  DEVIS_SANS_REPONSE: "Devis sans réponse",
  RENDEZ_VOUS_DEMAIN: "Rendez-vous du lendemain",
  INTERVENTION_A_CLOTURER: "Intervention terminée non clôturée",
};

const LIBELLE_MODELE: Record<string, string> = {
  relance_facture: "Relance d'une facture impayée",
  envoi_devis: "Envoi d'un devis",
  envoi_facture: "Envoi d'une facture",
};

const LIBELLE_ETAT_EMAIL: Record<string, string> = {
  EN_ATTENTE: "En attente",
  ENVOYE: "Envoyé",
  ECHOUE: "Échec",
};

/**
 * Formulation du moment, en français.
 *
 * Le rappel de la veille n'utilise aucun délai : afficher « 0 jour après »
 * serait un réglage sans effet montré comme s'il en avait un.
 */
function quandLire(declencheur: string, delaiJours: number): string {
  if (declencheur === "RENDEZ_VOUS_DEMAIN") return "La veille du rendez-vous";
  if (delaiJours === 0) return "Le jour même";
  return `${delaiJours} jour${delaiJours > 1 ? "s" : ""} après`;
}

const formatHorodatage = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});

export default async function PageAutomatisations() {
  const contexte = await sessionCourante();
  const peutConfigurer = contexte
    ? roleAutorise(contexte.role, "automatisation:configurer")
    : false;

  const [regles, executions, emails, modeles] = await Promise.all([
    listerRegles(),
    listerExecutions(),
    listerEmails(),
    listerModeles(),
  ]);

  const personnalises = new Map(modeles.map((m) => [m.cle, m]));
  const actives = regles.filter((r) => r.active).length;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Automatisations</h1>
        <p className="text-sm text-attenue mt-1">
          Ce que Plombéo fait pendant que vous travaillez. Rien ne part sans que vous
          l&apos;ayez décidé.
        </p>
      </header>

      {actives === 0 && (
        <Carte className="border-dashed">
          <h2 className="font-semibold mb-1">Aucune automatisation active</h2>
          <p className="text-sm text-attenue">
            À l&apos;installation, Plombéo n&apos;envoie rien. Activez ci-dessous ce que vous
            souhaitez lui confier.
          </p>
        </Carte>
      )}

      {!emailDisponible() && (
        <Carte className="border-dashed">
          <h2 className="font-semibold mb-1">Envoi d&apos;e-mails indisponible</h2>
          <p className="text-sm text-attenue">{EMAIL_NON_CONFIGURE}</p>
          <p className="text-sm text-attenue mt-2">
            Les règles qui se contentent de vous <strong>notifier</strong> fonctionnent
            malgré tout.
          </p>
        </Carte>
      )}

      {/* Les garde-fous sont annoncés à l'artisan : c'est ce qui lui permet de
          faire confiance à l'automatisation (§84). */}
      <Carte>
        <h2 className="font-semibold mb-2">Ce que Plombéo ne fera jamais</h2>
        <ul className="text-sm flex flex-col gap-1 list-disc pl-5">
          <li>Plus de {MAX_RELANCES} relances pour une même facture.</li>
          <li>Deux relances à moins de {DELAI_MIN_ENTRE_RELANCES_JOURS} jours d&apos;écart.</li>
          <li>
            Un envoi en dehors de {HEURE_MIN} h – {HEURE_MAX} h, ni le week-end.
          </li>
          <li>Une relance sur une facture réglée : le paiement arrête tout.</li>
          <li>Une relance à un client que vous avez exclu depuis sa fiche.</li>
        </ul>
        <p className="text-sm text-attenue mt-3">
          Les relances constatent un retard. Elles ne mettent pas en demeure et
          n&apos;évoquent ni pénalités ni intérêts : ces notions ont un régime précis, à
          valider avec votre conseil.
        </p>
      </Carte>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Règles</h2>
        {regles.length === 0 ? (
          <ListeVide titre="Aucune règle configurée">
            Ajoutez une règle ci-dessous pour commencer.
          </ListeVide>
        ) : (
          <ul className="flex flex-col gap-2">
            {regles.map((r) => (
              <li key={r.id}>
                <Carte>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{LIBELLE_DECLENCHEUR[r.declencheur]}</p>
                      <p className="text-sm text-attenue mt-1">
                        {quandLire(r.declencheur, r.delaiJours)} ·{" "}
                        {r.action === "ENVOYER_EMAIL" ? "E-mail au client" : "Me notifier"}
                      </p>
                      {r.libelle && <p className="text-sm mt-1">{r.libelle}</p>}
                    </div>
                    <Badge ton={r.active ? "succes" : "neutre"}>
                      {r.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {peutConfigurer && (
                    <form action={basculerRegle} className="mt-3">
                      <input type="hidden" name="id" value={r.id} />
                      <Bouton type="submit" variante="discret">
                        {r.active ? "Désactiver" : "Activer"}
                      </Bouton>
                    </form>
                  )}
                </Carte>
              </li>
            ))}
          </ul>
        )}
        {peutConfigurer && <FormulaireRegle emailDisponible={emailDisponible()} />}
      </section>

      {peutConfigurer && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Textes des messages</h2>
          {Object.keys(MODELES_PAR_DEFAUT).map((cle) => {
            const perso = personnalises.get(cle);
            const defaut = MODELES_PAR_DEFAUT[cle]!;
            return (
              <FormulaireModele
                key={cle}
                cleModele={cle}
                titre={LIBELLE_MODELE[cle] ?? cle}
                sujet={perso?.sujet ?? defaut.sujet}
                corps={perso?.corps ?? defaut.corps}
                personnalise={Boolean(perso)}
              />
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Envois</h2>
        {emails.length === 0 ? (
          <p className="text-sm text-attenue">Aucun message pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {emails.map((e) => (
              <li key={e.id}>
                <Carte>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{e.sujet}</p>
                      <p className="text-sm text-attenue">
                        {e.destinataire} · {formatHorodatage.format(e.createdAt)}
                      </p>
                      {/* L'erreur est MONTRÉE : un envoi qu'on croit parti alors
                          qu'il a échoué est pire qu'un envoi manquant (§76). */}
                      {e.erreur && <p className="text-sm text-danger mt-1">{e.erreur}</p>}
                    </div>
                    <Badge
                      ton={
                        e.etat === "ENVOYE" ? "succes" : e.etat === "ECHOUE" ? "danger" : "neutre"
                      }
                    >
                      {LIBELLE_ETAT_EMAIL[e.etat]}
                    </Badge>
                  </div>
                </Carte>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Journal des exécutions</h2>
        {executions.length === 0 ? (
          <p className="text-sm text-attenue">Aucune exécution pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {executions.map((x) => (
              <li key={x.id}>
                <Carte>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm">
                        {formatHorodatage.format(x.executeeLe)} · {x.entiteType}
                      </p>
                      {/* Une automatisation qui ne fait rien sans dire pourquoi
                          est indiscernable d'une automatisation en panne. */}
                      {x.motif && <p className="text-sm text-attenue mt-1">{x.motif}</p>}
                    </div>
                    <Badge ton={x.etat === "REUSSIE" ? "succes" : "neutre"}>
                      {x.etat === "REUSSIE" ? "Exécutée" : "Écartée"}
                    </Badge>
                  </div>
                </Carte>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
