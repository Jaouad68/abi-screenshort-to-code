import { COMPANY_DEFAULT } from "@/lib/defaults";

/**
 * En-tête des écrans publics (connexion, création du compte) : l'artisan
 * reconnaît immédiatement son application, avant même de se connecter.
 */
export function EnTeteMarque({ contexte }: { contexte: string }) {
  return (
    <div className="text-center mb-8">
      <span
        className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-control bg-brand text-white text-xl font-bold"
        aria-hidden="true"
      >
        M
      </span>
      <p className="text-xl font-bold text-ink">{COMPANY_DEFAULT.dirigeant}</p>
      <p className="text-ink-2">{COMPANY_DEFAULT.activite}</p>
      <p className="mt-3 inline-block rounded-full bg-brand-l px-3 py-1 text-sm font-semibold text-brand-d">
        {contexte}
      </p>
    </div>
  );
}
