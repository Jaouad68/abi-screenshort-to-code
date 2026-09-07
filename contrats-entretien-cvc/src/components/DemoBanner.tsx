/** Bandeau affiché sur toutes les pages du tableau de bord quand l'entreprise
 * connectée est l'entreprise de démonstration — pour qu'il n'y ait jamais
 * d'ambiguïté entre données réelles et données de démo. */
export function DemoBanner() {
  return (
    <div className="no-print rounded-control bg-accent-l border border-accent/40 px-4 py-2.5 text-sm text-accent-d font-semibold mb-5">
      Données de démonstration — cette entreprise sert uniquement à explorer
      l&apos;application.
    </div>
  );
}
