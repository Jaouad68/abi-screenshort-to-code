"use client";

import { useActionState } from "react";
import Link from "next/link";
import { inscrire, type InscriptionState } from "./actions";

const initialState: InscriptionState = {};

const ATOUTS = [
  "Un mois d'essai gratuit, sans carte bancaire",
  "Réservation en ligne prête en 2 minutes",
  "Rappels SMS et acompte anti no-show inclus",
];

export default function InscriptionPage() {
  const [state, formAction, pending] = useActionState(inscrire, initialState);

  return (
    <main className="flex-1 flex">
      <div className="hidden lg:flex flex-col justify-between w-[42%] brand-panel text-white p-12">
        <Link href="/" className="font-serif text-2xl">
          RésaZen
        </Link>
        <div>
          <p className="uppercase text-xs font-semibold tracking-wide text-white/60 mb-3">
            Coiffeurs · Barbiers · Instituts
          </p>
          <h1 className="font-serif text-4xl mb-6 max-w-sm">
            Ouvrez votre agenda en ligne <span className="italic">dès aujourd&apos;hui</span>.
          </h1>
          <ul className="flex flex-col gap-3">
            {ATOUTS.map((atout) => (
              <li key={atout} className="flex items-start gap-3 text-white/85">
                <span className="mt-1 w-5 h-5 rounded-full bg-white/15 flex items-center justify-center shrink-0 text-xs">
                  ✓
                </span>
                {atout}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-white/50 text-sm">© {new Date().getFullYear()} RésaZen</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
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
      </div>
    </main>
  );
}
