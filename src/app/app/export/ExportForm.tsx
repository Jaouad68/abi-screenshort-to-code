"use client";

import { useState } from "react";

function toInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function ExportForm() {
  const today = new Date();
  const minus = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
  };

  const [from, setFrom] = useState(toInput(minus(30)));
  const [to, setTo] = useState(toInput(today));
  const [loading, setLoading] = useState(false);

  function preset(days: number) {
    setFrom(toInput(minus(days)));
    setTo(toInput(today));
  }

  async function download() {
    setLoading(true);
    try {
      const res = await fetch(`/api/export/pdf?from=${from}&to=${to}`);
      if (!res.ok) {
        alert("Erreur lors de la génération du PDF.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dossier-conformite-${from}_${to}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card space-y-5 p-5">
      <div>
        <span className="label">Périodes rapides</span>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => preset(7)} className="btn-secondary py-2 text-sm">
            7 jours
          </button>
          <button onClick={() => preset(30)} className="btn-secondary py-2 text-sm">
            30 jours
          </button>
          <button onClick={() => preset(90)} className="btn-secondary py-2 text-sm">
            90 jours
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="from">
            Du
          </label>
          <input
            id="from"
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="to">
            Au
          </label>
          <input
            id="to"
            type="date"
            value={to}
            min={from}
            max={toInput(today)}
            onChange={(e) => setTo(e.target.value)}
            className="field"
          />
        </div>
      </div>

      <button onClick={download} disabled={loading} className="btn-primary w-full btn-lg">
        {loading ? "Génération du PDF…" : "📄 Générer le dossier PDF"}
      </button>
      <p className="text-center text-xs text-slate-400">
        Le PDF regroupe relevés, nettoyage, réceptions, traçabilité et non-conformités sur la
        période — directement présentable à un inspecteur.
      </p>
    </div>
  );
}
