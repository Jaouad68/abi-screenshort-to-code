"use client";

import { useActionState } from "react";
import Link from "next/link";
import { connecter, type ConnexionState } from "./actions";

const initialState: ConnexionState = {};

export default function ConnexionPage() {
  const [state, formAction, pending] = useActionState(connecter, initialState);

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md bg-paper rounded-card shadow-hero p-8">
        <h1 className="font-serif text-3xl mb-2">Se connecter</h1>
        <p className="text-muted mb-6">Accédez à votre agenda RésaZen.</p>
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
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Mot de passe</span>
            <input
              type="password"
              name="password"
              required
              className="rounded-control border border-line px-4 py-3 min-h-[48px] bg-white"
              placeholder="Votre mot de passe"
            />
          </label>

          {state.error && <p className="text-danger text-sm">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="rounded-pill bg-ink text-white px-6 py-3 font-semibold hover:bg-ink-2 transition-colors min-h-[48px] disabled:opacity-60"
          >
            {pending ? "Connexion..." : "Se connecter"}
          </button>
        </form>
        <p className="text-sm text-muted mt-6">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="text-sage-d font-semibold">
            Créer un salon
          </Link>
        </p>
      </div>
    </main>
  );
}
