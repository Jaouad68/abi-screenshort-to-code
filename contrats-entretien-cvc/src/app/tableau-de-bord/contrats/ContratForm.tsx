"use client";

import { useActionState, useMemo, useState } from "react";
import { champ, label, btnPrimaire } from "@/lib/ui";
import { PERIODICITE_LABEL, prochaineEcheance } from "@/lib/echeance";
import { TYPES_CONTRAT_SUGGERES } from "@/lib/defaults";
import { toInputDate } from "@/lib/date";
import type { Periodicite } from "@/generated/prisma/client";
import type { ContratFormState } from "./actions";

const initialState: ContratFormState = {};

export type ClientOption = { id: string; nom: string };
export type EquipementOption = { id: string; clientId: string; label: string };

export function ContratForm({
  action,
  clients,
  equipements,
  valeurs,
}: {
  action: (prev: ContratFormState, formData: FormData) => Promise<ContratFormState>;
  clients: ClientOption[];
  equipements: EquipementOption[];
  valeurs?: {
    clientId: string;
    equipementId: string;
    type: string;
    periodicite: Periodicite;
    montant: string;
    dateDebut: string;
    dateEcheance: string;
    notes: string;
  };
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [clientId, setClientId] = useState(valeurs?.clientId ?? "");
  const [dateDebut, setDateDebut] = useState(valeurs?.dateDebut ?? "");
  const [dateEcheance, setDateEcheance] = useState(valeurs?.dateEcheance ?? "");
  const [echeanceTouchee, setEcheanceTouchee] = useState(!!valeurs?.dateEcheance);

  const equipementsDuClient = useMemo(
    () => equipements.filter((e) => e.clientId === clientId),
    [equipements, clientId],
  );

  function onPeriodiciteChange(p: Periodicite) {
    if (echeanceTouchee || !dateDebut) return;
    const debut = new Date(dateDebut + "T12:00:00");
    const suggestion = prochaineEcheance(debut, p);
    if (suggestion) setDateEcheance(toInputDate(suggestion));
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <datalist id="types-contrat">
        {TYPES_CONTRAT_SUGGERES.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      <div>
        <label className={label} htmlFor="clientId">
          Client *
        </label>
        <select
          id="clientId"
          name="clientId"
          required
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className={champ}
        >
          <option value="">— Choisir un client —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={label} htmlFor="equipementId">
          Équipement concerné
        </label>
        <select id="equipementId" name="equipementId" defaultValue={valeurs?.equipementId ?? ""} className={champ}>
          <option value="">Aucun équipement précis</option>
          {equipementsDuClient.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={label} htmlFor="type">
          Type de contrat *
        </label>
        <input
          id="type"
          name="type"
          list="types-contrat"
          required
          defaultValue={valeurs?.type ?? "Entretien annuel"}
          className={champ}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="periodicite">
            Périodicité
          </label>
          <select
            id="periodicite"
            name="periodicite"
            defaultValue={valeurs?.periodicite ?? "ANNUELLE"}
            onChange={(e) => onPeriodiciteChange(e.target.value as Periodicite)}
            className={champ}
          >
            {Object.entries(PERIODICITE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="montant">
            Montant (€)
          </label>
          <input
            id="montant"
            name="montant"
            type="number"
            step="0.01"
            min="0"
            defaultValue={valeurs?.montant}
            className={champ}
            placeholder="150.00"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="dateDebut">
            Date de début *
          </label>
          <input
            id="dateDebut"
            name="dateDebut"
            type="date"
            required
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            className={champ}
          />
        </div>
        <div>
          <label className={label} htmlFor="dateEcheance">
            Prochaine échéance *
          </label>
          <input
            id="dateEcheance"
            name="dateEcheance"
            type="date"
            required
            value={dateEcheance}
            onChange={(e) => {
              setDateEcheance(e.target.value);
              setEcheanceTouchee(true);
            }}
            className={champ}
          />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="notes">
          Notes
        </label>
        <textarea id="notes" name="notes" rows={3} defaultValue={valeurs?.notes} className={champ} />
      </div>

      {state.error && (
        <p className="text-danger text-sm" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={btnPrimaire}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
