"use client";

import { useActionState } from "react";
import { enregistrerParametres, type ParametresState } from "./actions";
import type { Garage } from "@/generated/prisma/client";

const initialState: ParametresState = {};
const inputCls =
  "rounded-[10px] border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-lime placeholder:text-text-faint";

export function ParametresForm({ garage }: { garage: Garage }) {
  const [state, formAction, pending] = useActionState(enregistrerParametres, initialState);

  return (
    <form action={formAction} className="bg-surface border border-border rounded-lg p-5 flex flex-col gap-5 max-w-xl">
      <div>
        <h2 className="font-extrabold text-sm mb-3">Garage</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-text-dim">Nom</span>
            <input name="nom" required defaultValue={garage.nom} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-text-dim">Téléphone</span>
            <input name="telephone" defaultValue={garage.telephone} className={inputCls} />
          </label>
        </div>
      </div>

      <div>
        <h2 className="font-extrabold text-sm mb-1">Agent 1 · Rappel du contrôle technique</h2>
        <p className="text-xs text-text-faint mb-3">
          Jours avant l&apos;échéance CT auxquels un rappel est envoyé, séparés par des virgules.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-text-dim">Paliers (jours)</span>
          <input
            name="paliers"
            required
            defaultValue={garage.rappelCtPaliers.join(", ")}
            placeholder="21, 10, 3"
            className={inputCls}
          />
        </label>
      </div>

      <div>
        <h2 className="font-extrabold text-sm mb-1">Agent 2 · Réveille les devis</h2>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-text-dim">Relance après (jours)</span>
            <input
              name="devisRelanceApresJours"
              type="number"
              min={1}
              required
              defaultValue={garage.devisRelanceApresJours}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-text-dim">Paiement en 2 fois après (jours)</span>
            <input
              name="devisPaiementFractionneApresJours"
              type="number"
              min={1}
              required
              defaultValue={garage.devisPaiementFractionneApresJours}
              className={inputCls}
            />
          </label>
        </div>
      </div>

      {state.error && <p className="text-coral text-sm font-medium">{state.error}</p>}
      {state.success && <p className="text-mint text-sm font-medium">Réglages enregistrés.</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-[10px] bg-lime text-lime-ink font-bold text-sm px-4 py-2.5 hover:brightness-105 transition disabled:opacity-60"
      >
        {pending ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
