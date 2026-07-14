import Link from "next/link";
import { PLANS } from "@/lib/facturation/plans";
import { formatCents } from "@/lib/money";

const FONCTIONNALITES = [
  {
    titre: "Réservation en ligne 24h/24",
    description:
      "Vos clientes réservent seules, sans compte à créer, en respectant vos horaires réels.",
  },
  {
    titre: "Rappels SMS automatiques",
    description:
      "Confirmation à la réservation, rappel 2 jours avant : moins d'oublis, moins de fauteuils vides.",
  },
  {
    titre: "Acompte anti no-show",
    description:
      "Demandez un acompte automatiquement aux clientes qui ont déjà fait faux bond, sans y penser.",
  },
  {
    titre: "Bilan mensuel honnête",
    description:
      "Chaque euro récupéré est prouvé, pas estimé : vous savez exactement ce que RésaZen vous rapporte.",
  },
];

const ETAPES = [
  { numero: "1", titre: "Créez votre salon", description: "Inscription en 2 minutes, un mois d'essai gratuit, sans carte bancaire." },
  { numero: "2", titre: "Ajoutez vos prestations", description: "Durées, prix, horaires d'ouverture : configurez tout en quelques clics." },
  { numero: "3", titre: "Partagez votre lien", description: "Vos clientes réservent directement, vous gérez tout depuis votre agenda." },
];

export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      <section className="flex flex-col items-center justify-center gap-8 px-6 py-24 text-center">
        <span className="uppercase text-xs font-semibold tracking-wide text-sage-d bg-sage-l rounded-pill px-3 py-1">
          Coiffeurs · Barbiers · Instituts
        </span>
        <h1 className="font-serif text-5xl md:text-6xl max-w-2xl">
          Chaque lapin vous coûte <span className="italic text-sage">un fauteuil vide</span>.
        </h1>
        <p className="max-w-xl text-muted text-lg">
          RésaZen prend vos rendez-vous en ligne, rappelle vos clients par SMS,
          et fait payer un acompte à ceux qui ont déjà fait faux bond.
        </p>
        <div className="flex gap-4">
          <Link
            href="/inscription"
            className="rounded-pill bg-ink text-white px-6 py-3 font-semibold hover:bg-ink-2 transition-colors min-h-[48px] flex items-center"
          >
            Essayer un mois gratuitement
          </Link>
          <Link
            href="/connexion"
            className="rounded-pill bg-white border border-line px-6 py-3 font-semibold hover:border-sage-line transition-colors min-h-[48px] flex items-center"
          >
            Se connecter
          </Link>
        </div>
      </section>

      <section className="px-6 py-16 bg-paper">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl text-center mb-12">
            Tout ce qu&apos;il faut pour ne plus subir les no-show
          </h2>
          <div className="grid sm:grid-cols-2 gap-8">
            {FONCTIONNALITES.map((f) => (
              <div key={f.titre}>
                <h3 className="font-semibold text-lg mb-1">{f.titre}</h3>
                <p className="text-muted">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl text-center mb-12">Comment ça marche</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {ETAPES.map((e) => (
              <div key={e.numero} className="text-center">
                <span className="font-serif text-4xl text-sage inline-block mb-2">{e.numero}</span>
                <h3 className="font-semibold text-lg mb-1">{e.titre}</h3>
                <p className="text-muted">{e.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 bg-paper">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl text-center mb-2">Un tarif simple, sans surprise</h2>
          <p className="text-muted text-center mb-12">Un mois d&apos;essai gratuit, sans carte bancaire. Résiliable à tout moment.</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div key={plan.plan} className="bg-white rounded-card border border-line p-6 flex flex-col gap-3">
                <h3 className="font-serif text-xl">{plan.nom}</h3>
                <p className="text-3xl font-serif">
                  {formatCents(plan.prixCents)}
                  <span className="text-base text-muted font-sans">/mois</span>
                </p>
                <p className="text-muted text-sm">
                  {plan.quotaSms ? `${plan.quotaSms} SMS inclus/mois` : "SMS illimité raisonnable"}
                </p>
                <Link
                  href="/inscription"
                  className="mt-2 rounded-pill bg-ink text-white px-5 py-2.5 font-semibold text-center hover:bg-ink-2 transition-colors min-h-[44px] flex items-center justify-center"
                >
                  Essayer gratuitement
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
