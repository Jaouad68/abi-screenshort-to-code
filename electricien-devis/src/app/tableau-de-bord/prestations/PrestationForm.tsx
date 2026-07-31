"use client";

import { useActionState } from "react";
import type { Prestation } from "@/generated/prisma/client";
import type { PrestationFormState } from "./actions";
import { TAUX_TVA, UNITES } from "@/lib/calcul";
import { champ, label, btnPrimaire } from "@/lib/ui";

type Action = (
  prev: PrestationFormState,
  formData: FormData,
) => Promise<PrestationFormState>;

const initialState: PrestationFormState = {};

export function PrestationForm({
  action,
  prestation,
  submitLabel,
}: {
  action: Action;
  prestation?: Prestation;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const prixDefaut = prestation
    ? (prestation.prixUnitaireCents / 100).toString().replace(".", ",")
    : "";

  return (
    <form action={formAction} className="grid gap-4">
      <div>
        <label className={label} htmlFor="libelle">
          Libellé *
        </label>
        <input
          id="libelle"
          name="libelle"
          required
          defaultValue={prestation?.libelle ?? ""}
          className={champ}
          placeholder="Pose de prise de courant"
        />
      </div>

      <div>
        <label className={label} htmlFor="description">
          Description (optionnelle)
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={prestation?.description ?? ""}
          className={champ}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className={label} htmlFor="prix">
            Prix HT (€) *
          </label>
          <input
            id="prix"
            name="prix"
            required
            defaultValue={prixDefaut}
            className={champ}
            inputMode="decimal"
            placeholder="35"
          />
        </div>
        <div>
          <label className={label} htmlFor="unite">
            Unité
          </label>
          <select id="unite" name="unite" defaultValue={prestation?.unite ?? "u"} className={champ}>
            {UNITES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={label} htmlFor="tauxTva">
            TVA (%)
          </label>
          <select
            id="tauxTva"
            name="tauxTva"
            defaultValue={String(prestation?.tauxTva ?? 20)}
            className={champ}
          >
            {TAUX_TVA.map((t) => (
              <option key={t} value={t}>
                {t} %
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="actif"
          defaultChecked={prestation ? prestation.actif : true}
          className="h-5 w-5 rounded border-line accent-brand"
        />
        Proposer cette prestation dans les devis
      </label>

      {state.error && <p className="text-danger text-sm" role="alert">{state.error}</p>}
      {state.ok && <p className="text-ok text-sm font-semibold">✓ Enregistré</p>}

      <div>
        <button type="submit" disabled={pending} className={btnPrimaire}>
          {pending ? "Enregistrement…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
