"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { TYPE_EQUIPEMENT_LABEL } from "@/lib/labels";
import {
  enqueueReleve,
  flushQueue,
  queueCount,
  type QueuedReleve,
} from "@/lib/offline-queue";

export type EquipementLite = {
  id: string;
  nom: string;
  type: string;
  tempMin: number;
  tempMax: number;
};

type Msg = { tone: "ok" | "danger" | "info"; text: string } | null;

export function ReleveForm({ equipements }: { equipements: EquipementLite[] }) {
  const router = useRouter();
  const [equipementId, setEquipementId] = useState(equipements[0]?.id ?? "");
  const [valeur, setValeur] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [submitting, setSubmitting] = useState(false);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  const equipement = useMemo(
    () => equipements.find((e) => e.id === equipementId),
    [equipements, equipementId]
  );

  const num = valeur === "" ? null : Number(valeur.replace(",", "."));
  const horsPlage =
    equipement && num !== null && !Number.isNaN(num)
      ? num < equipement.tempMin || num > equipement.tempMax
      : false;
  const conforme = equipement && num !== null && !Number.isNaN(num) && !horsPlage;

  const refreshPending = useCallback(async () => {
    try {
      setPending(await queueCount());
    } catch {
      /* IndexedDB indisponible */
    }
  }, []);

  const sync = useCallback(async () => {
    const n = await flushQueue();
    await refreshPending();
    if (n > 0) router.refresh();
  }, [refreshPending, router]);

  useEffect(() => {
    setOnline(navigator.onLine);
    refreshPending();
    if (navigator.onLine) sync();
    const goOnline = () => {
      setOnline(true);
      sync();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [refreshPending, sync]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!equipement || num === null || Number.isNaN(num)) {
      setMsg({ tone: "danger", text: "Saisissez une température valide." });
      return;
    }
    setSubmitting(true);
    const payload: QueuedReleve = {
      id: crypto.randomUUID(),
      equipementId: equipement.id,
      equipementNom: equipement.nom,
      valeur: num,
      saisiAt: new Date().toISOString(),
    };

    const localConforme = num >= equipement.tempMin && num <= equipement.tempMax;

    try {
      if (!navigator.onLine) throw new Error("offline");
      const res = await fetch("/api/releves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipementId: payload.equipementId,
          valeur: payload.valeur,
          saisiAt: payload.saisiAt,
        }),
      });
      if (!res.ok) throw new Error("server");
      const data = await res.json();
      setMsg(
        data.conforme
          ? { tone: "ok", text: `Relevé enregistré : ${equipement.nom}, ${num} °C — conforme.` }
          : {
              tone: "danger",
              text: `⚠️ ${equipement.nom} : ${num} °C HORS PLAGE. Une anomalie a été ouverte (voir « Anomalies »).`,
            }
      );
      setValeur("");
      router.refresh();
    } catch {
      // Hors-ligne ou échec réseau : on conserve la saisie localement.
      await enqueueReleve(payload);
      await refreshPending();
      setMsg({
        tone: "info",
        text: `📶 Hors-ligne : relevé ${num} °C enregistré localement${
          localConforme ? "" : " (hors plage)"
        }. Synchronisation automatique au retour du réseau.`,
      });
      setValeur("");
    } finally {
      setSubmitting(false);
    }
  }

  if (equipements.length === 0) {
    return (
      <div className="card p-5 text-sm text-slate-500">
        Aucun équipement déclaré. Demandez au gérant d&apos;ajouter vos enceintes dans « Réglages ».
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5">
      {(!online || pending > 0) && (
        <div
          className={clsx(
            "rounded-xl px-4 py-2.5 text-sm font-medium",
            online ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
          )}
        >
          {!online && "📶 Mode hors-ligne — vos saisies sont conservées localement. "}
          {pending > 0 && `${pending} relevé(s) en attente de synchronisation.`}
        </div>
      )}

      {msg && (
        <p
          role={msg.tone === "danger" ? "alert" : "status"}
          className={clsx(
            "rounded-xl px-4 py-3 text-sm font-medium",
            msg.tone === "ok" && "bg-brand-50 text-brand-700",
            msg.tone === "danger" && "bg-red-50 text-red-700",
            msg.tone === "info" && "bg-slate-100 text-slate-700"
          )}
        >
          {msg.text}
        </p>
      )}

      <div>
        <label className="label" htmlFor="equipementId">
          Équipement
        </label>
        <select
          id="equipementId"
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
        {conforme && <p className="mt-2 text-sm font-medium text-brand-700">✓ Dans la plage cible.</p>}
      </div>

      <button type="submit" disabled={submitting} className="btn-primary w-full btn-lg">
        {submitting ? "Enregistrement…" : "Enregistrer le relevé"}
      </button>
    </form>
  );
}
