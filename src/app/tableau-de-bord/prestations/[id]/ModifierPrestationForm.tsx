"use client";

import { useActionState } from "react";
import Link from "next/link";
import { modifierPrestation, type ServiceFormState } from "../actions";
import type { Service } from "@/generated/prisma/client";

const initialState: ServiceFormState = {};

export function ModifierPrestationForm({ service }: { service: Service }) {
  const action = modifierPrestation.bind(null, service.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="bg-white rounded-card border border-line p-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Nom</span>
        <input
          name="nom"
          required
          minLength={2}
          defaultValue={service.nom}
          className="rounded-control border border-line px-3 py-2 min-h-[44px]"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Durée (min)</span>
        <input
          type="number"
          name="dureeMin"
          required
          min={5}
          step={5}
          defaultValue={service.dureeMin}
          className="rounded-control border border-line px-3 py-2 min-h-[44px]"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Battement (min)</span>
        <input
          type="number"
          name="bufferMin"
          min={0}
          step={5}
          defaultValue={service.bufferMin}
          className="rounded-control border border-line px-3 py-2 min-h-[44px]"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Prix (€)</span>
        <input
          type="number"
          name="prix"
          required
          min={0}
          step={0.5}
          defaultValue={service.prixCents / 100}
          className="rounded-control border border-line px-3 py-2 min-h-[44px]"
        />
      </label>

      {state.error && <p className="text-danger text-sm">{state.error}</p>}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-pill bg-ink text-white px-5 py-2.5 font-semibold hover:bg-ink-2 transition-colors min-h-[44px] disabled:opacity-60"
        >
          {pending ? "Enregistrement..." : "Enregistrer"}
        </button>
        <Link href="/tableau-de-bord/prestations" className="text-sm font-semibold text-muted hover:text-ink">
          Annuler
        </Link>
      </div>
    </form>
  );
}
