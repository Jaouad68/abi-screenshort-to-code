"use client";

import { useActionState, useRef, useEffect } from "react";
import { ajouterVehicule, type AjoutVehiculeState } from "./actions";

const initialState: AjoutVehiculeState = {};
const inputCls =
  "rounded-[10px] border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-lime placeholder:text-text-faint";

export function AjoutVehiculeForm() {
  const [state, formAction, pending] = useActionState(ajouterVehicule, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  return (
    <form ref={formRef} action={formAction} className="bg-surface border border-border rounded-lg p-5 flex flex-col gap-3.5">
      <h2 className="font-extrabold text-sm">Ajouter un véhicule à suivre</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-text-dim">Plaque</span>
          <input name="plaque" required placeholder="AB-123-CD" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-text-dim">Échéance du CT</span>
          <input name="ctEcheance" type="date" required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-text-dim">Client</span>
          <input name="clientNom" required placeholder="Nom du client" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-text-dim">Téléphone</span>
          <input name="clientTelephone" placeholder="06 12 34 56 78" className={inputCls} />
        </label>
      </div>

      {state.error && <p className="text-coral text-sm font-medium">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-[10px] bg-lime text-lime-ink font-bold text-sm px-4 py-2.5 hover:brightness-105 transition disabled:opacity-60"
      >
        {pending ? "Ajout..." : "Ajouter"}
      </button>
    </form>
  );
}
