"use client";

import { useActionState, useMemo, useState } from "react";
import { champ, label, btnPrimaire } from "@/lib/ui";
import { toInputDateTime } from "@/lib/date";
import type { InterventionFormState } from "./actions";

const initialState: InterventionFormState = {};

export type ClientOption = { id: string; nom: string };
export type EquipementOption = { id: string; clientId: string; label: string };
export type ContratOption = { id: string; clientId: string; equipementId: string | null; label: string };
export type TechnicienOption = { id: string; nom: string };

export function InterventionForm({
  action,
  clients,
  equipements,
  contrats,
  techniciens,
  valeurs,
}: {
  action: (prev: InterventionFormState, formData: FormData) => Promise<InterventionFormState>;
  clients: ClientOption[];
  equipements: EquipementOption[];
  contrats: ContratOption[];
  techniciens: TechnicienOption[];
  valeurs?: { clientId: string; equipementId: string; contratId: string; titre: string; technicienId: string };
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [clientId, setClientId] = useState(valeurs?.clientId ?? "");
  const [equipementId, setEquipementId] = useState(valeurs?.equipementId ?? "");

  const equipementsDuClient = useMemo(() => equipements.filter((e) => e.clientId === clientId), [equipements, clientId]);
  const contratsDuClient = useMemo(() => contrats.filter((c) => c.clientId === clientId), [contrats, clientId]);

  function onContratChange(contratId: string) {
    const contrat = contrats.find((c) => c.id === contratId);
    if (contrat?.equipementId) setEquipementId(contrat.equipementId);
  }

  const maintenant = toInputDateTime(new Date());

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className={label} htmlFor="clientId">
          Client *
        </label>
        <select
          id="clientId"
          name="clientId"
          required
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            setEquipementId("");
          }}
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
        <label className={label} htmlFor="contratId">
          Contrat lié
        </label>
        <select
          id="contratId"
          name="contratId"
          defaultValue={valeurs?.contratId ?? ""}
          onChange={(e) => onContratChange(e.target.value)}
          className={champ}
        >
          <option value="">Aucun contrat précis</option>
          {contratsDuClient.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={label} htmlFor="equipementId">
          Équipement concerné
        </label>
        <select
          id="equipementId"
          name="equipementId"
          value={equipementId}
          onChange={(e) => setEquipementId(e.target.value)}
          className={champ}
        >
          <option value="">Aucun équipement précis</option>
          {equipementsDuClient.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={label} htmlFor="titre">
          Titre de l&apos;intervention *
        </label>
        <input id="titre" name="titre" required defaultValue={valeurs?.titre ?? "Entretien annuel"} className={champ} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="datePrevue">
            Date et heure *
          </label>
          <input
            id="datePrevue"
            name="datePrevue"
            type="datetime-local"
            required
            defaultValue={maintenant}
            className={champ}
          />
        </div>
        <div>
          <label className={label} htmlFor="technicienId">
            Technicien affecté
          </label>
          <select id="technicienId" name="technicienId" defaultValue={valeurs?.technicienId ?? ""} className={champ}>
            <option value="">Non affecté</option>
            {techniciens.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error && (
        <p className="text-danger text-sm" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={btnPrimaire}>
        {pending ? "Enregistrement…" : "Planifier l'intervention"}
      </button>
    </form>
  );
}
