import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-24 text-center">
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
    </main>
  );
}
