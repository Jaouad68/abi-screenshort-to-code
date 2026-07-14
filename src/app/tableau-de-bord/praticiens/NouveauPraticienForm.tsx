"use client";

import { useActionState, useRef } from "react";
import { creerPraticien, type PraticienFormState } from "./actions";

const initialState: PraticienFormState = {};

export function NouveauPraticienForm() {
  const [state, formAction, pending] = useActionState(creerPraticien, initialState);
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
          placeholder="Christelle"
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
