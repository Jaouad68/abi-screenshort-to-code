"use client";

import { useRef, useEffect, useState } from "react";
import { useFormState } from "react-dom";
import {
  ajouterEquipement,
  ajouterTache,
  ajouterEmploye,
  ajouterRappel,
  supprimerCompte,
} from "./actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/FormMessage";

function useResetOnSuccess(state: { success?: string } | null, ref: React.RefObject<HTMLFormElement>) {
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state, ref]);
}

export function EquipementForm() {
  const [state, action] = useFormState(ajouterEquipement, null);
  const ref = useRef<HTMLFormElement>(null);
  useResetOnSuccess(state, ref);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input name="nom" required className="field" placeholder="Nom (ex. Frigo cuisine 1)" />
        <select name="type" className="field" defaultValue="FRIGO_POSITIF">
          <option value="FRIGO_POSITIF">Frigo positif</option>
          <option value="CONGELATEUR">Congélateur</option>
          <option value="VITRINE">Vitrine réfrigérée</option>
          <option value="MAINTIEN_CHAUD">Maintien au chaud</option>
        </select>
        <input
          name="tempMin"
          type="text"
          inputMode="decimal"
          required
          className="field"
          placeholder="Temp. min (°C)"
        />
        <input
          name="tempMax"
          type="text"
          inputMode="decimal"
          required
          className="field"
          placeholder="Temp. max (°C)"
        />
      </div>
      <SubmitButton variant="secondary" className="w-full">
        + Ajouter l&apos;équipement
      </SubmitButton>
    </form>
  );
}

export function TacheForm() {
  const [state, action] = useFormState(ajouterTache, null);
  const ref = useRef<HTMLFormElement>(null);
  useResetOnSuccess(state, ref);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input name="libelle" required className="field sm:col-span-2" placeholder="Libellé (ex. Nettoyage plan de travail)" />
        <select name="frequence" className="field" defaultValue="QUOTIDIENNE">
          <option value="QUOTIDIENNE">Quotidienne</option>
          <option value="HEBDOMADAIRE">Hebdomadaire</option>
          <option value="MENSUELLE">Mensuelle</option>
        </select>
        <input name="zone" required className="field sm:col-span-3" placeholder="Zone (ex. Cuisine)" />
      </div>
      <SubmitButton variant="secondary" className="w-full">
        + Ajouter la tâche
      </SubmitButton>
    </form>
  );
}

export function EmployeForm() {
  const [state, action] = useFormState(ajouterEmploye, null);
  const ref = useRef<HTMLFormElement>(null);
  useResetOnSuccess(state, ref);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input name="nom" required className="field" placeholder="Nom complet" />
        <input name="email" type="email" required className="field" placeholder="email@exemple.fr" />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="field"
          placeholder="Mot de passe (8+ car.)"
        />
      </div>
      <SubmitButton variant="secondary" className="w-full">
        + Ajouter l&apos;employé
      </SubmitButton>
    </form>
  );
}

export function RappelForm() {
  const [state, action] = useFormState(ajouterRappel, null);
  const ref = useRef<HTMLFormElement>(null);
  useResetOnSuccess(state, ref);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input name="libelle" required className="field" placeholder="Libellé (ex. Relevés du matin)" />
        <input name="heure" type="time" required defaultValue="09:00" className="field" />
      </div>
      <SubmitButton variant="secondary" className="w-full">
        + Ajouter le rappel
      </SubmitButton>
    </form>
  );
}

export function SupprimerCompte() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm font-semibold text-red-600 hover:underline">
        Supprimer définitivement mon compte et toutes les données
      </button>
    );
  }
  return (
    <form action={supprimerCompte} className="space-y-3 rounded-xl bg-red-50 p-4">
      <p className="text-sm text-red-700">
        Cette action est <strong>irréversible</strong>. Toutes les données de l&apos;établissement
        seront supprimées. Tapez <strong>SUPPRIMER</strong> pour confirmer.
      </p>
      <input name="confirm" required className="field" placeholder="SUPPRIMER" autoComplete="off" />
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">
          Annuler
        </button>
        <button type="submit" className="btn-danger flex-1">
          Confirmer la suppression
        </button>
      </div>
    </form>
  );
}
