"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { corrigerReleve } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/FormMessage";
import { ConformeBadge } from "@/components/ui";
import { TYPE_EQUIPEMENT_LABEL, formatDateTime, formatTemp } from "@/lib/labels";

export type ReleveView = {
  id: string;
  valeur: number;
  conforme: boolean;
  createdAt: string;
  saisiAt: string | null;
  horsLigne: boolean;
  equipementNom: string;
  equipementType: string;
  utilisateurNom: string;
  correction: {
    valeur: number;
    conforme: boolean;
    createdAt: string;
    utilisateurNom: string;
    motif: string | null;
  } | null;
};

export function ReleveItem({ releve }: { releve: ReleveView }) {
  const [state, action] = useFormState(corrigerReleve, null);
  const [open, setOpen] = useState(false);
  const corrige = releve.correction !== null;

  return (
    <li className="card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-800">{releve.equipementNom}</p>
          <p className="text-xs text-slate-500">
            {TYPE_EQUIPEMENT_LABEL[releve.equipementType]} · {formatDateTime(releve.createdAt)} ·{" "}
            {releve.utilisateurNom}
            {releve.horsLigne && <span className="text-amber-600"> · saisie hors-ligne</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={
              corrige
                ? "text-base font-semibold tabular-nums text-slate-400 line-through"
                : releve.conforme
                  ? "text-lg font-bold tabular-nums text-slate-800"
                  : "text-lg font-bold tabular-nums text-red-600"
            }
          >
            {formatTemp(releve.valeur)}
          </span>
          <ConformeBadge conforme={releve.conforme} />
        </div>
      </div>

      {corrige && releve.correction && (
        <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm">
          <p className="font-semibold text-amber-800">
            ↳ Corrigé : {formatTemp(releve.correction.valeur)}{" "}
            <span className="font-normal">
              ({releve.correction.conforme ? "conforme" : "hors plage"})
            </span>
          </p>
          <p className="text-xs text-amber-700">
            {formatDateTime(releve.correction.createdAt)} · {releve.correction.utilisateurNom}
            {releve.correction.motif && <> · motif : {releve.correction.motif}</>}
          </p>
        </div>
      )}

      {!corrige && !open && (
        <button
          onClick={() => setOpen(true)}
          className="mt-2 text-xs font-semibold text-brand-700 hover:underline"
        >
          Corriger (entrée tracée)
        </button>
      )}

      {!corrige && open && (
        <form action={action} className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
          <FormMessage state={state} />
          <input type="hidden" name="originalId" value={releve.id} />
          <p className="text-xs text-slate-500">
            L&apos;entrée d&apos;origine n&apos;est jamais modifiée : la correction crée une
            nouvelle ligne tracée.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor={`v-${releve.id}`}>
                Température corrigée
              </label>
              <input
                id={`v-${releve.id}`}
                name="valeur"
                type="text"
                inputMode="decimal"
                required
                className="field"
                placeholder="ex. 3,5"
              />
            </div>
            <div>
              <label className="label" htmlFor={`m-${releve.id}`}>
                Motif
              </label>
              <input
                id={`m-${releve.id}`}
                name="motif"
                required
                className="field"
                placeholder="ex. erreur de saisie"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-secondary flex-1 py-2 text-sm"
            >
              Annuler
            </button>
            <SubmitButton className="flex-1 py-2 text-sm">Enregistrer la correction</SubmitButton>
          </div>
        </form>
      )}
    </li>
  );
}
