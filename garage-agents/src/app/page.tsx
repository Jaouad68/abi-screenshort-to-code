import Link from "next/link";

const AGENTS = [
  {
    n: "1",
    titre: "Rappel du contrôle technique",
    texte:
      "Un SMS et un e-mail partent tout seuls à J-21, J-10 puis J-3 avant l'échéance CT — sans que personne au comptoir n'ait à y penser.",
  },
  {
    n: "2",
    titre: "Réveille les devis",
    texte:
      "Les devis jamais signés sont relancés automatiquement, avec une proposition de paiement en 2 fois passé un certain délai.",
  },
  {
    n: "3",
    titre: "Décroche à sa place",
    texte:
      "Agent vocal en cadrage : répond au téléphone quand le mécanicien est occupé, prend le message et propose un créneau.",
    bientot: true,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-[9px] border border-border-strong bg-lime grid place-items-center text-lime-ink font-extrabold text-xs">
            AR
          </span>
          <span className="font-extrabold">Atelier Radar</span>
        </div>
        <nav className="flex items-center gap-3 text-sm font-bold">
          <Link href="/connexion" className="text-text-dim hover:text-text transition">
            Se connecter
          </Link>
          <Link
            href="/inscription"
            className="rounded-[9px] bg-lime text-lime-ink px-4 py-2 hover:brightness-105 transition"
          >
            Créer mon garage
          </Link>
        </nav>
      </header>

      <section className="max-w-3xl mx-auto text-center px-6 pt-16 pb-14">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-bold text-text-dim mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-lime" />
          3 agents pour un garage indépendant
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-balance">
          Le comptoir ne relance plus.
          <br />
          <span className="text-lime">Les agents s&apos;en chargent.</span>
        </h1>
        <p className="mt-5 text-text-dim max-w-lg mx-auto">
          Rappels de contrôle technique et relances de devis envoyés automatiquement,
          pendant que l&apos;atelier tourne.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/inscription"
            className="rounded-[10px] bg-lime text-lime-ink font-bold px-6 py-3 text-sm hover:brightness-105 transition"
          >
            Essayer gratuitement
          </Link>
        </div>
      </section>

      <section className="max-w-5xl w-full mx-auto px-6 pb-20 grid gap-4 sm:grid-cols-3">
        {AGENTS.map((agent) => (
          <div
            key={agent.n}
            className={`rounded-lg border p-5 flex flex-col gap-3 ${
              agent.bientot ? "border-dashed border-border-strong" : "border-border bg-surface"
            }`}
          >
            <span className="w-8 h-8 rounded-[9px] border border-border-strong bg-surface-2 grid place-items-center font-extrabold text-sm text-text-dim">
              {agent.n}
            </span>
            <h2 className="font-extrabold">{agent.titre}</h2>
            <p className="text-sm text-text-dim leading-relaxed">{agent.texte}</p>
            {agent.bientot && (
              <span className="self-start rounded-full border border-border bg-surface-2 text-text-faint text-xs font-bold px-2.5 py-1">
                Bientôt disponible
              </span>
            )}
          </div>
        ))}
      </section>

      <footer className="mt-auto text-center text-xs text-text-faint py-8">
        Atelier Radar
      </footer>
    </main>
  );
}
