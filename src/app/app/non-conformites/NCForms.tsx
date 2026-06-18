"use client";

import { useRef, useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { declarerNC, resoudreNC } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/FormMessage";
import { PhotoInput } from "@/components/PhotoInput";

const TYPES = [
  "Température hors plage",
  "Réception non conforme",
  "Rupture chaîne du froid",
  "Hygiène / propreté",
  "Nuisible",
  "DLC dépassée",
  "Autre",
];

export function DeclarerNCForm() {
  const [state, action] = useFormState(declarerNC, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full btn-lg">
        + Déclarer une non-conformité
      </button>
    );
  }

  return (
    <form ref={formRef} action={action} className="card space-y-4 p-5">
      <FormMessage state={state} />
      <div>
        <label className="label" htmlFor="type">
          Type
        </label>
        <select id="type" name="type" className="field" defaultValue={TYPES[0]}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          className="field"
          placeholder="Décrivez le constat…"
        />
      </div>
      <div>
        <label className="label" htmlFor="responsable">
          Responsable <span className="text-slate-400">(optionnel)</span>
        </label>
        <input id="responsable" name="responsable" className="field" />
      </div>
      <PhotoInput name="photoData" label="Photo (optionnel)" />
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">
          Annuler
        </button>
        <SubmitButton className="flex-1">Déclarer</SubmitButton>
      </div>
    </form>
  );
}

export function ResoudreNCForm({ id }: { id: string }) {
  const [state, action] = useFormState(resoudreNC, null);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full py-2 text-sm">
        Saisir l&apos;action corrective
      </button>
    );
  }

  return (
    <form action={action} className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
      <FormMessage state={state} />
      <input type="hidden" name="id" value={id} />
      <div>
        <label className="label" htmlFor={`ac-${id}`}>
          Action corrective appliquée
        </label>
        <textarea
          id={`ac-${id}`}
          name="actionCorrective"
          required
          rows={2}
          className="field"
          placeholder="ex. Produit retiré, équipement remis en service, fournisseur alerté…"
        />
      </div>
      <div>
        <label className="label" htmlFor={`resp-${id}`}>
          Responsable <span className="text-slate-400">(optionnel)</span>
        </label>
        <input id={`resp-${id}`} name="responsable" className="field" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 py-2 text-sm">
          Annuler
        </button>
        <SubmitButton className="flex-1 py-2 text-sm">Marquer résolu</SubmitButton>
      </div>
    </form>
  );
}
