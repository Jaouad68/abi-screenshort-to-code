import { COMPANY_DEFAULT } from "@/lib/defaults";
import { Logo } from "@/components/Logo";

/**
 * En-tête des écrans publics (connexion, création du compte) : le logo de
 * l'artisan, pour qu'il reconnaisse immédiatement son application.
 */
export function EnTeteMarque({ contexte }: { contexte: string }) {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <Logo
        logoDataUrl=""
        nom={`${COMPANY_DEFAULT.dirigeant}, électricité générale à Châteaudun`}
        variante="complet"
        size={72}
      />
      <p className="mt-5 inline-block rounded-full bg-brand-l px-3 py-1 text-sm font-semibold text-brand">
        {contexte}
      </p>
    </div>
  );
}
