"use client";

import { useActionState } from "react";
import { accepterDevisPortail, type EtatPortail } from "../../../actions";

const etatInitial: EtatPortail = {};

export function BoutonAccepter({ jeton, devisId }: { jeton: string; devisId: string }) {
  const [etat, envoyer, enCours] = useActionState(accepterDevisPortail, etatInitial);

  return (
    <div className="flex flex-col gap-3">
      {etat.erreur && (
        <p
          role="alert"
          className="text-sm font-medium text-danger bg-[#fdeceb] border border-[#f2c9c6] rounded-controle px-3 py-2"
        >
          {etat.erreur}
        </p>
      )}
      {etat.succes && (
        <p
          role="status"
          className="text-sm font-medium text-succes bg-[#e8f4ed] border border-[#bcdcc9] rounded-controle px-3 py-2"
        >
          {etat.succes}
        </p>
      )}

      {!etat.succes && (
        <form action={envoyer}>
          <input type="hidden" name="jeton" value={jeton} />
          <input type="hidden" name="devisId" value={devisId} />
          <button
            type="submit"
            disabled={enCours}
            className="inline-flex items-center justify-center min-h-11 px-5 rounded-controle
                       font-semibold bg-action text-white hover:bg-action-fonce
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {enCours ? "Envoi…" : "Accepter ce devis"}
          </button>
        </form>
      )}
    </div>
  );
}
