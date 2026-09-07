"use client";

import { useActionState } from "react";
import { champ, label, btnPrimaire } from "@/lib/ui";
import { changerMotDePasse, type ChangerMotDePasseState } from "./actions";

const initialState: ChangerMotDePasseState = {};

export function MotDePasseForm() {
  const [state, formAction, pending] = useActionState(changerMotDePasse, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className={label} htmlFor="motDePasseActuel">
          Mot de passe actuel
        </label>
        <input
          id="motDePasseActuel"
          name="motDePasseActuel"
          type="password"
          required
          autoComplete="current-password"
          className={champ}
        />
      </div>
      <div>
        <label className={label} htmlFor="nouveauMotDePasse">
          Nouveau mot de passe
        </label>
        <input
          id="nouveauMotDePasse"
          name="nouveauMotDePasse"
          type="password"
          required
          autoComplete="new-password"
          className={champ}
        />
      </div>
      <div>
        <label className={label} htmlFor="confirmation">
          Confirmer le nouveau mot de passe
        </label>
        <input id="confirmation" name="confirmation" type="password" required autoComplete="new-password" className={champ} />
      </div>
      {state.error && <p className="text-danger text-sm">{state.error}</p>}
      {state.ok && <p className="text-ok text-sm">Mot de passe modifié.</p>}
      <button type="submit" disabled={pending} className={btnPrimaire}>
        {pending ? "Enregistrement…" : "Changer le mot de passe"}
      </button>
    </form>
  );
}
