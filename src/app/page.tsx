import Link from "next/link";
import { PLANS } from "@/lib/facturation/plans";
import { formatCents } from "@/lib/money";

const FONCTIONNALITES = [
  {
    titre: "Réservation en ligne 24h/24",
    description:
      "Vos clientes réservent seules, sans compte à créer, en respectant vos horaires réels.",
    icone: IconeCalendrier,
  },
  {
    titre: "Rappels SMS automatiques",
    description:
      "Confirmation à la réservation, rappel 2 jours avant : moins d'oublis, moins de fauteuils vides.",
    icone: IconeCloche,
  },
  {
    titre: "Acompte anti no-show",
    description:
      "Demandez un acompte automatiquement aux clientes qui ont déjà fait faux bond, sans y penser.",
    icone: IconeBouclier,
  },
  {
    titre: "Bilan mensuel honnête",
    description:
      "Chaque euro récupéré est prouvé, pas estimé : vous savez exactement ce que RésaZen vous rapporte.",
    icone: IconeGraphique,
  },
];

const ETAPES = [
  { numero: "1", titre: "Créez votre salon", description: "Inscription en 2 minutes, un mois d'essai gratuit, sans carte bancaire." },
  { numero: "2", titre: "Ajoutez vos prestations", description: "Durées, prix, horaires d'ouverture : configurez tout en quelques clics." },
  { numero: "3", titre: "Partagez votre lien", description: "Vos clientes réservent directement, vous gérez tout depuis votre agenda." },
];

const FEATURES_COMMUNES = [
  "Réservation en ligne illimitée",
  "Rappels SMS automatiques",
  "Acompte anti no-show",
  "Bilan mensuel honnête",
];

function IconeCalendrier({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 9.5H20.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 3V6.5M16 3V6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 13.5H8.01M12 13.5H12.01M16 13.5H16.01M8 17H8.01M12 17H12.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconeCloche({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 19a2.2 2.2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconeBouclier({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3.5 19 6v5.2c0 4.6-3 7.7-7 9.3-4-1.6-7-4.7-7-9.3V6l7-2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconeGraphique({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 20V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 20H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7.5 17V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 17V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16.5 17V10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconeCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 10.2l2.6 2.6L14 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MockupReservation() {
  return (
    <div className="card-hover w-full max-w-md bg-white rounded-card border border-line shadow-hero overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-line bg-paper">
        <span className="w-2.5 h-2.5 rounded-full bg-danger/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-brass/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-sage/70" />
        <span className="ml-3 text-xs text-muted bg-white rounded-pill border border-line px-3 py-1 truncate">
          resazen.app/r/salon-christelle
        </span>
      </div>
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Balayage</span>
          <span className="font-serif text-lg">120,00 €</span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted border-t border-line pt-4">
          <span>Mardi 14 juillet · 10h00</span>
          <span>Avec Christelle</span>
        </div>
        <div className="bg-sage text-white rounded-control px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold">Rendez-vous confirmé</span>
          <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
            ✓
          </span>
        </div>
        <p className="text-xs text-muted">
          SMS de confirmation envoyé · rappel automatique 2 jours avant
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      <header className="glass-nav sticky top-0 z-20 border-b border-line">
        <div className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
          <span className="font-serif text-2xl">RésaZen</span>
          <nav className="flex items-center gap-4 sm:gap-6 text-sm font-semibold">
            <a href="#tarifs" className="hidden sm:inline hover:text-sage-d">
              Tarifs
            </a>
            <Link href="/connexion" className="hover:text-sage-d">
              Se connecter
            </Link>
            <Link
              href="/inscription"
              className="rounded-pill bg-ink text-white px-4 py-2 hover:bg-ink-2 transition-colors"
            >
              Essai gratuit
            </Link>
          </nav>
        </div>
      </header>

      <section className="hero-glow px-6 py-20 md:py-28">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col items-center lg:items-start gap-8 text-center lg:text-left">
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
            <div className="flex flex-wrap justify-center lg:justify-start gap-4">
              <Link
                href="/inscription"
                className="rounded-pill bg-ink text-white px-6 py-3 font-semibold hover:bg-ink-2 transition-colors min-h-[48px] flex items-center shadow-hero"
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
            <ul className="flex flex-wrap justify-center lg:justify-start gap-x-5 gap-y-2 text-sm text-muted">
              {["Sans engagement", "Résiliable à tout moment", "Conforme RGPD"].map((a) => (
                <li key={a} className="flex items-center gap-1.5">
                  <IconeCheck className="w-4 h-4 text-sage-d shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center">
            <MockupReservation />
          </div>
        </div>
      </section>

      <section className="px-6 py-16 bg-paper">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl text-center mb-12">
            Tout ce qu&apos;il faut pour ne plus subir les no-show
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {FONCTIONNALITES.map((f) => (
              <div key={f.titre} className="card-hover bg-white rounded-card border border-line p-6 flex gap-4">
                <span className="shrink-0 w-11 h-11 rounded-control bg-sage-l text-sage-d flex items-center justify-center">
                  <f.icone className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{f.titre}</h3>
                  <p className="text-muted">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl text-center mb-14">Comment ça marche</h2>
          <div className="grid sm:grid-cols-3 gap-8 relative">
            <div
              aria-hidden="true"
              className="hidden sm:block absolute top-6 left-[16.5%] right-[16.5%] h-px bg-line"
            />
            {ETAPES.map((e) => (
              <div key={e.numero} className="text-center relative">
                <span className="relative z-10 inline-flex items-center justify-center w-12 h-12 rounded-full bg-ink text-white font-serif text-xl mb-4">
                  {e.numero}
                </span>
                <h3 className="font-semibold text-lg mb-1">{e.titre}</h3>
                <p className="text-muted">{e.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tarifs" className="px-6 py-16 bg-paper scroll-mt-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl text-center mb-2">Un tarif simple, sans surprise</h2>
          <p className="text-muted text-center mb-12">Un mois d&apos;essai gratuit, sans carte bancaire. Résiliable à tout moment.</p>
          <div className="grid sm:grid-cols-3 gap-6 items-start">
            {PLANS.map((plan) => {
              const populaire = plan.plan === "SERENITE";
              return (
                <div
                  key={plan.plan}
                  className={`relative rounded-card border p-6 flex flex-col gap-3 ${
                    populaire
                      ? "bg-ink text-white border-ink shadow-hero sm:-translate-y-2"
                      : "card-hover bg-white border-line"
                  }`}
                >
                  {populaire && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-pill bg-brass text-white text-xs font-semibold uppercase tracking-wide px-3 py-1">
                      Le plus choisi
                    </span>
                  )}
                  <h3 className="font-serif text-xl">{plan.nom}</h3>
                  <p className="text-3xl font-serif">
                    {formatCents(plan.prixCents)}
                    <span className={`text-base font-sans ${populaire ? "text-white/70" : "text-muted"}`}>
                      /mois
                    </span>
                  </p>
                  <p className={`text-sm ${populaire ? "text-white/80" : "text-muted"}`}>
                    {plan.quotaSms ? `${plan.quotaSms} SMS inclus/mois` : "SMS illimité raisonnable"}
                  </p>
                  <ul className="flex flex-col gap-2 mt-2 text-sm">
                    {FEATURES_COMMUNES.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <IconeCheck className={`w-4 h-4 shrink-0 ${populaire ? "text-brass-l" : "text-sage-d"}`} />
                        <span className={populaire ? "text-white/90" : undefined}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/inscription"
                    className={`mt-2 rounded-pill px-5 py-2.5 font-semibold text-center transition-colors min-h-[44px] flex items-center justify-center ${
                      populaire
                        ? "bg-white text-ink hover:bg-white/90"
                        : "bg-ink text-white hover:bg-ink-2"
                    }`}
                  >
                    Essayer gratuitement
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
