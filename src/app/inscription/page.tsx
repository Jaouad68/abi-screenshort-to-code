"use client";

import { useActionState } from "react";
import Link from "next/link";
import { inscrire, type InscriptionState } from "./actions";

const initialState: InscriptionState = {};

export default function InscriptionPage() {
  const [state, formAction, pending] = useActionState(inscrire, initialState);

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md bg-paper rounded-card shadow-hero p-8">
        <h1 className="font-serif text-3xl mb-2">Créer votre salon</h1>
        <p className="text-muted mb-6">
          Un mois d&apos;essai gratuit, sans carte bancaire.
        </p>
        <form action={formAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Nom du salon</span>
            <input
              name="nomSalon"
              required
              minLength={2}
              className="rounded-control border border-line px-4 py-3 min-h-[48px] bg-white"
              placeholder="Salon Christelle"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Votre mobile (notifications RDV)</span>
            <input
              name="telephone"
              className="rounded-control border border-line px-4 py-3 min-h-[48px] bg-white"
              placeholder="06 12 34 56 78 (optionnel)"
            />
          </label>
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
              minLength={8}
              className="rounded-control border border-line px-4 py-3 min-h-[48px] bg-white"
              placeholder="8 caractères minimum"
            />
          </label>

          {state.error && (
            <p className="text-danger text-sm">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded-pill bg-ink text-white px-6 py-3 font-semibold hover:bg-ink-2 transition-colors min-h-[48px] disabled:opacity-60"
          >
            {pending ? "Création..." : "Créer mon compte"}
          </button>
        </form>
        <p className="text-sm text-muted mt-6">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="text-sage-d font-semibold">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
