"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useFormState } from "react-dom";
import clsx from "clsx";
import { enregistrerReleve } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/FormMessage";
import { TYPE_EQUIPEMENT_LABEL } from "@/lib/labels";

export type EquipementLite = {
  id: string;
  nom: string;
  type: string;
  tempMin: number;
  tempMax: number;
};

export function ReleveForm({
  equipements,
  defaultEquipementId,
}: {
  equipements: EquipementLite[];
  defaultEquipementId?: string;
}) {
  const [state, action] = useFormState(enregistrerReleve, null);
  const [equipementId, setEquipementId] = useState(defaultEquipementId ?? equipements[0]?.id ?? "");
  const [valeur, setValeur] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const equipement = useMemo(
    () => equipements.find((e) => e.id === equipementId),
    [equipements, equipementId]
  );

  // Alerte visuelle immédiate (client) avant même l'enregistrement.
  const num = valeur === "" ? null : Number(valeur.replace(",", "."));
  const horsPlage =
    equipement && num !== null && !Number.isNaN(num)
      ? num < equipement.tempMin || num > equipement.tempMax
      : false;
  const conforme =
    equipement && num !== null && !Number.isNaN(num) && !horsPlage;

  // Réinitialise le champ après un enregistrement réussi.
  useEffect(() => {
    if (state?.success) {
      setValeur("");
      formRef.current?.querySelector<HTMLInputElement>("#valeur")?.focus();
    }
  }, [state]);

  if (equipements.length === 0) {
    return (
      <div className="card p-5 text-sm text-slate-500">
        Aucun équipement déclaré. Demandez au gérant d&apos;ajouter vos enceintes dans « Réglages ».
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="card space-y-4 p-5">
      <FormMessage state={state} />

      <div>
        <label className="label" htmlFor="equipementId">
          Équipement
        </label>
        <select
          id="equipementId"
          name="equipementId"
          value={equipementId}
          onChange={(e) => setEquipementId(e.target.value)}
          className="field"
        >
          {equipements.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nom} — {TYPE_EQUIPEMENT_LABEL[e.type]} ({e.tempMin}/{e.tempMax} °C)
            </option>
          ))}
        </select>
        {equipement && (
          <p className="mt-1 text-xs text-slate-500">
            Plage cible : {equipement.tempMin} °C à {equipement.tempMax} °C
          </p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="valeur">
          Température relevée (°C)
        </label>
        <input
          id="valeur"
          name="valeur"
          type="text"
          inputMode="decimal"
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          required
          placeholder="ex. 3,5"
          className={clsx(
            "field text-2xl font-bold tabular-nums",
            horsPlage && "border-red-400 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-200",
            conforme && "border-brand-400 bg-brand-50 text-brand-700"
          )}
        />
        {horsPlage && (
          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700">
            ⚠️ Température hors plage cible — une action corrective sera requise.
          </p>
        )}
        {conforme && (
          <p className="mt-2 text-sm font-medium text-brand-700">✓ Dans la plage cible.</p>
        )}
      </div>

      <input type="hidden" name="commentaire" value="" />

      <SubmitButton className="w-full btn-lg" pendingLabel="Enregistrement…">
        Enregistrer le relevé
      </SubmitButton>
    </form>
  );
}
