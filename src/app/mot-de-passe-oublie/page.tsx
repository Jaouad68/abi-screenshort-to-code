"use client";

import { useActionState } from "react";
import Link from "next/link";
import { demanderReinitialisation, type DemandeReinitialisationState } from "./actions";

const initialState: DemandeReinitialisationState = {};

export default function MotDePasseOubliePage() {
  const [state, formAction, pending] = useActionState(demanderReinitialisation, initialState);

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md bg-paper rounded-card shadow-hero p-8">
        <h1 className="font-serif text-3xl mb-2">Mot de passe oublié</h1>
        <p className="text-muted mb-6">
          Indiquez votre e-mail : si un compte existe, vous recevrez un lien de
          réinitialisation valable 1 heure.
        </p>

        {state.envoye ? (
          <p className="text-sage-d">
            Si un compte existe avec cette adresse, un e-mail vient de lui être envoyé.
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">E-mail</span>
              <input
                type="email"
                name="email"
                required
                className="rounded-control border border-line px-4 py-3 min-h-[48px] bg-white"
                placeholder="vous@exemple.fr"
              />
            </label>

            {state.error && <p className="text-danger text-sm">{state.error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="rounded-pill bg-ink text-white px-6 py-3 font-semibold hover:bg-ink-2 transition-colors min-h-[48px] disabled:opacity-60"
            >
              {pending ? "Envoi..." : "Envoyer le lien"}
            </button>
          </form>
        )}

        <p className="text-sm text-muted mt-6">
          <Link href="/connexion" className="text-sage-d font-semibold">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
