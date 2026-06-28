"use client";

import { useState, useRef, useEffect } from "react";
import { useFormState } from "react-dom";
import clsx from "clsx";
import { enregistrerReception } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/FormMessage";
import { PhotoInput } from "@/components/PhotoInput";

export function ReceptionForm() {
  const [state, action] = useFormState(enregistrerReception, null);
  const [conforme, setConforme] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setConforme(true);
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="card space-y-4 p-5">
      <FormMessage state={state} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="fournisseur">
            Fournisseur
          </label>
          <input id="fournisseur" name="fournisseur" required className="field" placeholder="Metro, Pomona…" />
        </div>
        <div>
          <label className="label" htmlFor="produit">
            Produit / famille
          </label>
          <input id="produit" name="produit" required className="field" placeholder="Viande hachée" />
        </div>
        <div>
          <label className="label" htmlFor="temperature">
            Température à réception (°C) <span className="text-slate-400">(optionnel)</span>
          </label>
          <input
            id="temperature"
            name="temperature"
            type="text"
            inputMode="decimal"
            className="field"
            placeholder="ex. 3"
          />
        </div>
        <div>
          <label className="label" htmlFor="numeroLot">
            N° de lot <span className="text-slate-400">(optionnel)</span>
          </label>
          <input id="numeroLot" name="numeroLot" className="field" placeholder="LOT-2026-0042" />
        </div>
      </div>

      <div>
        <span className="label">Conformité de la livraison</span>
        <input type="hidden" name="conforme" value={conforme ? "true" : "false"} />
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setConforme(true)}
            className={clsx(
              "btn",
              conforme ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-300"
            )}
          >
            ✓ Conforme
          </button>
          <button
            type="button"
            onClick={() => setConforme(false)}
            className={clsx(
              "btn",
              !conforme ? "bg-red-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-300"
            )}
          >
            ✕ Non conforme
          </button>
        </div>
      </div>

      <PhotoInput name="photoData" label="Bon de livraison (optionnel)" />

      <SubmitButton className="w-full btn-lg">Enregistrer la réception</SubmitButton>
    </form>
  );
}
