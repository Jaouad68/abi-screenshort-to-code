"use client";

import { useActionState } from "react";
import { reinitialiserMotDePasse, type ReinitialisationState } from "./actions";

const initialState: ReinitialisationState = {};

export function ReinitialisationForm({ token }: { token: string }) {
  const action = reinitialiserMotDePasse.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Nouveau mot de passe</span>
        <input
          type="password"
          name="motDePasse"
          required
          minLength={8}
          className="rounded-control border border-line px-4 py-3 min-h-[48px] bg-white"
          placeholder="8 caractères minimum"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Confirmer le mot de passe</span>
        <input
          type="password"
          name="confirmation"
          required
          minLength={8}
          className="rounded-control border border-line px-4 py-3 min-h-[48px] bg-white"
        />
      </label>

      {state.error && <p className="text-danger text-sm">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-pill bg-ink text-white px-6 py-3 font-semibold hover:bg-ink-2 transition-colors min-h-[48px] disabled:opacity-60"
      >
        {pending ? "Enregistrement..." : "Réinitialiser le mot de passe"}
      </button>
    </form>
  );
}
