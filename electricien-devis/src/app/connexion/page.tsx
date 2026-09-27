"use client";

import { useActionState } from "react";
import Link from "next/link";
import { connecter, type ConnexionState } from "./actions";
import { champ, label, btnPrimaire } from "@/lib/ui";
import { EnTeteMarque } from "@/components/EnTeteMarque";

const initialState: ConnexionState = {};

export default function ConnexionPage() {
  const [state, formAction, pending] = useActionState(connecter, initialState);

  return (
    <main className="min-h-dvh flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <EnTeteMarque contexte="Gestion des devis" />

        <div className="rounded-card border border-line bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-bold mb-1">Connexion</h1>
          <p className="text-muted mb-6 text-sm">Accédez à vos devis.</p>

          <form action={formAction} className="flex flex-col gap-4">
            <div>
              <label className={label} htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                defaultValue={state.email}
                name="email"
                required
                autoComplete="email"
                inputMode="email"
                className={champ}
                placeholder="contact@mellado-electricite.fr"
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
                placeholder="Votre mot de passe"
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
          Première utilisation ?{" "}
          <Link href="/inscription" className="text-brand font-semibold">
            Créer le compte
          </Link>
        </p>
      </div>
    </main>
  );
}
