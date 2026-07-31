"use client";

import { useActionState, useRef } from "react";
import { creerPrestation, type ServiceFormState } from "./actions";

const initialState: ServiceFormState = {};

export function NouvellePrestationForm() {
  const [state, formAction, pending] = useActionState(creerPrestation, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="bg-white rounded-card border border-line p-6 flex flex-wrap items-end gap-4"
    >
      <label className="flex flex-col gap-1 flex-1 min-w-[180px]">
        <span className="text-sm font-semibold">Nom</span>
        <input
          name="nom"
          required
          minLength={2}
          placeholder="Coupe femme"
          className="rounded-control border border-line px-3 py-2 min-h-[44px]"
        />
      </label>
      <label className="flex flex-col gap-1 w-28">
        <span className="text-sm font-semibold">Durée (min)</span>
        <input
          type="number"
          name="dureeMin"
          required
          min={5}
          step={5}
          defaultValue={30}
          className="rounded-control border border-line px-3 py-2 min-h-[44px]"
        />
      </label>
      <label className="flex flex-col gap-1 w-32">
        <span className="text-sm font-semibold">Battement (min)</span>
        <input
          type="number"
          name="bufferMin"
          min={0}
          step={5}
          defaultValue={0}
          className="rounded-control border border-line px-3 py-2 min-h-[44px]"
        />
      </label>
      <label className="flex flex-col gap-1 w-28">
        <span className="text-sm font-semibold">Prix (€)</span>
        <input
          type="number"
          name="prix"
          required
          min={0}
          step={0.5}
          placeholder="35"
          className="rounded-control border border-line px-3 py-2 min-h-[44px]"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-pill bg-ink text-white px-5 py-2.5 font-semibold hover:bg-ink-2 transition-colors min-h-[44px] disabled:opacity-60"
      >
        {pending ? "Ajout..." : "Ajouter"}
      </button>

      {state.error && <p className="text-danger text-sm w-full">{state.error}</p>}
    </form>
  );
}
