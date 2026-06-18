"use client";

import { useRef, useEffect } from "react";
import { useFormState } from "react-dom";
import { ouvrirProduit } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/FormMessage";

export function ProduitForm() {
  const [state, action] = useFormState(ouvrirProduit, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="card space-y-4 p-5">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="nom">
            Produit ouvert
          </label>
          <input id="nom" name="nom" required className="field" placeholder="Crème pâtissière" />
        </div>
        <div>
          <label className="label" htmlFor="dureeJours">
            DLC secondaire (J+)
          </label>
          <input
            id="dureeJours"
            name="dureeJours"
            type="number"
            inputMode="numeric"
            min={0}
            max={365}
            defaultValue={3}
            required
            className="field"
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        L&apos;heure d&apos;ouverture est enregistrée automatiquement. La DLC secondaire est calculée
        (date d&apos;ouverture + nombre de jours).
      </p>
      <SubmitButton className="w-full btn-lg">Créer l&apos;étiquette numérique</SubmitButton>
    </form>
  );
}
