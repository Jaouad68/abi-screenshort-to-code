"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ajouterSalon, type AjouterSalonState } from "../actions";

const initialState: AjouterSalonState = {};

export default function NouveauSalonPage() {
  const [state, formAction, pending] = useActionState(ajouterSalon, initialState);

  return (
    <div className="max-w-md">
      <h1 className="font-serif text-3xl mb-2">Ajouter un salon</h1>
      <p className="text-muted mb-6">
        Chaque salon a ses propres prestations, horaires et abonnement.
      </p>
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Nom du salon</span>
          <input
            name="nom"
            required
            minLength={2}
            className="rounded-control border border-line px-4 py-3 min-h-[48px] bg-white"
            placeholder="Salon Christelle Nord"
          />
        </label>

        {state.error && <p className="text-danger text-sm">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-pill bg-ink text-white px-6 py-3 font-semibold hover:bg-ink-2 transition-colors min-h-[48px] disabled:opacity-60"
        >
          {pending ? "Création..." : "Créer ce salon"}
        </button>
      </form>
      <p className="text-sm text-muted mt-6">
        <Link href="/tableau-de-bord" className="text-sage-d font-semibold">
          ← Retour au tableau de bord
        </Link>
      </p>
    </div>
  );
}
