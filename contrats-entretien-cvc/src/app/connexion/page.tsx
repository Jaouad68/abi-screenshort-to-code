"use client";

import { useActionState } from "react";
import Link from "next/link";
import { connecter, type ConnexionState } from "./actions";
import { champ, label, btnPrimaire } from "@/lib/ui";

const initialState: ConnexionState = {};

export default function ConnexionPage() {
  const [state, formAction, pending] = useActionState(connecter, initialState);

  return (
    <main className="min-h-dvh flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="grid h-10 w-10 place-items-center rounded-control bg-brand text-white text-lg font-bold">
              S
            </span>
            <span className="text-xl font-bold text-ink">
              Suivi<span className="text-brand">CVC</span>
            </span>
          </div>
          <p className="text-muted">Connexion</p>
        </div>

        <div className="rounded-card border border-line bg-card p-6 shadow-sm">
          <form action={formAction} className="flex flex-col gap-4">
            <div>
              <label className={label} htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                name="email"
                required
                autoComplete="email"
                inputMode="email"
                className={champ}
                placeholder="vous@entreprise.fr"
              />
            </div>
            <div>
              <label className={label} htmlFor="password">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className={champ}
              />
            </div>

            {state.error && (
              <p className="text-danger text-sm" role="alert">
                {state.error}
              </p>
            )}

            <button type="submit" disabled={pending} className={btnPrimaire}>
              {pending ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>

        <p className="text-sm text-muted mt-5 text-center">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="text-brand font-semibold">
            Créer le compte de mon entreprise
          </Link>
        </p>

        <div className="mt-6 rounded-card border border-line bg-card/60 p-4 text-xs text-muted">
          <p className="font-semibold text-ink-2 mb-1">Compte de démonstration</p>
          <p>E-mail : demo@suivicvc.fr</p>
          <p>Mot de passe : demo1234</p>
          <p className="mt-1">
            Créé par <code>npm run db:demo</code> — données clairement identifiées
            comme données de démonstration dans l&apos;application.
          </p>
        </div>
      </div>
    </main>
  );
}
