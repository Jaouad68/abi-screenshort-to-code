"use client";

import { useActionState } from "react";
import Link from "next/link";
import { connecter, type ConnexionState } from "./actions";

const initialState: ConnexionState = {};

export default function ConnexionPage() {
  const [state, formAction, pending] = useActionState(connecter, initialState);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2 mb-8 justify-center">
          <span className="w-9 h-9 rounded-[10px] border border-border-strong bg-lime grid place-items-center text-lime-ink font-extrabold text-sm">
            AR
          </span>
          <span className="font-extrabold text-lg">Atelier Radar</span>
        </Link>

        <div className="bg-surface border border-border rounded-lg p-7">
          <h1 className="text-xl font-extrabold mb-1">Se connecter</h1>
          <p className="text-text-faint text-sm mb-6">Accédez au tableau de bord de votre garage.</p>

          <form action={formAction} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-text-dim">E-mail</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="vous@garage.fr"
                className="rounded-[10px] border border-border bg-surface-2 px-3.5 py-3 text-sm outline-none focus:border-lime placeholder:text-text-faint"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-text-dim">Mot de passe</span>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="Votre mot de passe"
                className="rounded-[10px] border border-border bg-surface-2 px-3.5 py-3 text-sm outline-none focus:border-lime placeholder:text-text-faint"
              />
            </label>

            {state.error && <p className="text-coral text-sm font-medium">{state.error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="mt-1 rounded-[10px] bg-lime text-lime-ink font-bold py-3 text-sm hover:brightness-105 transition disabled:opacity-60"
            >
              {pending ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </div>

        <p className="text-sm text-text-faint mt-5 text-center">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="text-lime font-bold">
            Créer mon garage
          </Link>
        </p>
      </div>
    </main>
  );
}
