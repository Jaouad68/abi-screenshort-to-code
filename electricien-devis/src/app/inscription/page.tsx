"use client";

import { useActionState } from "react";
import Link from "next/link";
import { inscrire, type InscriptionState } from "./actions";
import { champ, label, btnPrimaire } from "@/lib/ui";

const initialState: InscriptionState = {};

export default function InscriptionPage() {
  const [state, formAction, pending] = useActionState(inscrire, initialState);

  return (
    <main className="min-h-dvh flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="grid h-10 w-10 place-items-center rounded-control bg-brand text-white text-lg font-bold">
              M
            </span>
            <span className="text-xl font-bold text-ink">
              MELLADO <span className="text-brand">Électricité</span>
            </span>
          </div>
          <p className="text-muted">Création du compte</p>
        </div>

        <div className="rounded-card border border-line bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-bold mb-1">Bienvenue</h1>
          <p className="text-muted mb-6 text-sm">
            Choisissez vos identifiants. Vos coordonnées d’entreprise et votre
            bibliothèque de prestations seront déjà pré-remplies.
          </p>

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
                autoComplete="new-password"
                className={champ}
                placeholder="Au moins 8 caractères"
              />
            </div>
            <div>
              <label className={label} htmlFor="confirmation">
                Confirmer le mot de passe
              </label>
              <input
                id="confirmation"
                type="password"
                name="confirmation"
                required
                autoComplete="new-password"
                className={champ}
                placeholder="Répétez le mot de passe"
              />
            </div>

            {state.error && (
              <p className="text-danger text-sm" role="alert">
                {state.error}
              </p>
            )}

            <button type="submit" disabled={pending} className={btnPrimaire}>
              {pending ? "Création…" : "Créer le compte"}
            </button>
          </form>
        </div>

        <p className="text-sm text-muted mt-5 text-center">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="text-brand font-semibold">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
